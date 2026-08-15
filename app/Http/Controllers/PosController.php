<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Services\AuditService;
use App\Services\SettingsService;
use App\Services\StockService; // Importado para un uso más limpio
use App\Services\WarehouseContext;
use App\Models\SalePayment;
use App\Models\User;
use App\Models\CashSession;

class PosController extends Controller
{
    public function index()
    {
        $warehouseId = \App\Services\WarehouseContext::currentId();

        $products = Product::with(['category', 'brand'])
            ->where('is_active', true)
            ->get()
            ->map(function ($p) use ($warehouseId) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'category' => $p->category->name,
                    'brand' => $p->brand?->name,
                    'barcode' => $p->barcode,
                    'image_url' => $p->image_path ? Storage::url($p->image_path) : null,
                    'unit_type' => $p->unit_type,
                    'price' => (float) $p->price,
                    'stock' => $p->stockIn($warehouseId),
                ];
            });

        return Inertia::render('Pos/Index', [
            'initialProducts' => $products,
        ]);
    }
    public function checkout(Request $request)
{
    if (SettingsService::get('require_cash_session', true)) {
        $openSession = CashSession::where('user_id', $request->user()->id)
            ->where('status', 'abierta')
            ->first();

        if (!$openSession) {
            return back()->withErrors(['message' => 'Debes abrir tu caja antes de registrar ventas.']);
        }
    } else {
        $openSession = CashSession::where('user_id', $request->user()->id)
            ->where('status', 'abierta')
            ->first();
    }

    $validated = $request->validate([
        'items' => 'required|array|min:1',
        'items.*.id' => 'required|exists:products,id',
        'items.*.qty' => 'required|numeric|min:0.001',
        'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
        'items.*.discount_amount' => 'nullable|numeric|min:0',
        'client_id' => 'nullable|exists:clients,id',

        // Descuento global
        'discount_percent' => 'nullable|numeric|min:0|max:100',
        'discount_amount' => 'nullable|numeric|min:0',
        'discount_reason' => 'nullable|string|max:255',
        'discount_authorized_by' => 'nullable|exists:users,id',

        // Pagos: al menos uno
        'payments' => 'required|array|min:1',
        'payments.*.method' => 'required|string|max:30',
        'payments.*.amount' => 'required|numeric|min:0.01',
        'payments.*.received' => 'nullable|numeric|min:0',
        'payments.*.reference' => 'nullable|string|max:100',
    ]);

    $warehouseId = $openSession?->warehouse_id ?? WarehouseContext::currentId();

    $sale = DB::transaction(function () use ($validated, $request, $openSession, $warehouseId) {
        $grossTotal = 0;
        $lines = [];

        foreach ($validated['items'] as $item) {
            $product = Product::findOrFail($item['id']);

            if ($product->stockIn($warehouseId) < $item['qty']) {
                throw new \Exception("Stock insuficiente para {$product->name} en esta sucursal");
            }

            $lineGross = $product->price * $item['qty'];
            $lineDiscount = ($lineGross * (($item['discount_percent'] ?? 0) / 100))
                + ($item['discount_amount'] ?? 0);
            $lineTotal = max(0, $lineGross - $lineDiscount);

            $grossTotal += $lineTotal;

            $lines[] = [
                'product' => $product,
                'qty' => $item['qty'],
                'price' => $product->price,
                'discount_percent' => $item['discount_percent'] ?? 0,
                'discount_amount' => $item['discount_amount'] ?? 0,
                'total' => $lineTotal,
            ];
        }

        // Descuento global sobre el subtotal ya descontado por línea
        $globalDiscount = ($grossTotal * (($validated['discount_percent'] ?? 0) / 100))
            + ($validated['discount_amount'] ?? 0);
        $afterDiscount = max(0, $grossTotal - $globalDiscount);

        $amounts = SettingsService::breakdown($afterDiscount);

        // El total pagado debe cuadrar con el total de la venta
        $totalPaid = collect($validated['payments'])->sum('amount');
        if (abs($totalPaid - $amounts['total']) > 0.01) {
            throw new \Exception('El monto pagado no coincide con el total de la venta.');
        }

        $sale = Sale::create([
            'user_id' => $request->user()->id,
            'cash_session_id' => $openSession?->id,
            'client_id' => $validated['client_id'] ?? null,
            'subtotal' => $amounts['subtotal'],
            'tax' => $amounts['tax'],
            'discount' => $globalDiscount,
            'discount_percent' => $validated['discount_percent'] ?? 0,
            'discount_authorized_by' => $validated['discount_authorized_by'] ?? null,
            'total' => $amounts['total'],
            'payment_method' => count($validated['payments']) > 1
                ? 'Mixto'
                : $validated['payments'][0]['method'],
            'status' => 'completed',
        ]);

        foreach ($lines as $line) {
            SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $line['product']->id,
                'quantity' => $line['qty'],
                'price' => $line['price'],
                'discount_percent' => $line['discount_percent'],
                'discount_amount' => $line['discount_amount'],
                'total' => $line['total'],
            ]);

            StockService::move(
                product: $line['product'],
                type: 'venta',
                quantity: (float) $line['qty'],
                referenceType: Sale::class,
                referenceId: $sale->id,
                warehouseId: $warehouseId,
            );
        }

        // Registro de cada forma de pago
        foreach ($validated['payments'] as $payment) {
            $received = $payment['received'] ?? null;
            $change = ($payment['method'] === 'Efectivo' && $received)
                ? max(0, $received - $payment['amount'])
                : 0;

            SalePayment::create([
                'sale_id' => $sale->id,
                'method' => $payment['method'],
                'amount' => $payment['amount'],
                'received' => $received,
                'change' => $change,
                'reference' => $payment['reference'] ?? null,
            ]);
        }

        return $sale;
    });

    AuditService::log('venta.registrar',
        "Registró la venta #{$sale->id} por {$sale->total}",
        $sale,
        ['total' => (float) $sale->total, 'metodo_pago' => $sale->payment_method]
    );

    // Un descuento se audita aparte por su sensibilidad
    if ($sale->discount > 0) {
        $authorizer = $sale->discount_authorized_by
            ? User::find($sale->discount_authorized_by)?->name
            : null;

        AuditService::log('venta.descuento',
            "Aplicó un descuento de {$sale->discount} en la venta #{$sale->id}"
                . ($validated['discount_reason'] ?? false ? ". Motivo: {$validated['discount_reason']}" : '')
                . ($authorizer ? " (autorizado por {$authorizer})" : ''),
            $sale,
            [
                'descuento' => (float) $sale->discount,
                'porcentaje' => (float) $sale->discount_percent,
                'motivo' => $validated['discount_reason'] ?? null,
            ],
            $validated['discount_authorized_by'] ?? null
        );
    }

    return redirect()->route('pos')->with([
        'success' => "Venta #{$sale->id} registrada",
        'last_sale_id' => $sale->id,
    ]);
}
}
