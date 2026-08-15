<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Services\AuditService;
use App\Services\SettingsService;

class PurchaseController extends Controller
{
    public function index()
    {
        $purchases = Purchase::with(['supplier', 'user'])
            ->orderByDesc('created_at')
            ->paginate(15)
            ->through(function ($p) {
                return [
                    'id' => $p->id,
                    'supplier' => $p->supplier->name,
                    'user' => $p->user->name,
                    'total' => (float) $p->total,
                    'paid_amount' => (float) $p->paid_amount,
                    'balance' => $p->balance(),
                    'status' => $p->status,
                    'payment_status' => $p->payment_status,
                    'purchase_date' => $p->purchase_date->format('Y-m-d'),
                    'due_date' => $p->due_date?->format('Y-m-d'),
                    'invoice_number' => $p->invoice_number,
                ];
            });

        $suppliers = Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $products = Product::where('is_active', true)->orderBy('name')->get(['id', 'name', 'cost_price', 'unit_type']);

        return Inertia::render('Purchases/Index', [
            'purchases' => $purchases,
            'suppliers' => $suppliers,
            'products' => $products,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'purchase_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:purchase_date',
            'invoice_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        $purchase = DB::transaction(function () use ($validated, $request) {
            $gross = collect($validated['items'])->sum(fn($i) => $i['quantity'] * $i['unit_cost']);
            $amounts = SettingsService::breakdown($gross);

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'user_id' => $request->user()->id,
                'warehouse_id' => \App\Models\Warehouse::where('is_default', true)->value('id'),
                'subtotal' => $amounts['subtotal'],
                'tax' => $amounts['tax'],
                'total' => $amounts['total'],
                'status' => 'pendiente',
                'payment_status' => 'pendiente',
                'purchase_date' => $validated['purchase_date'],
                'due_date' => $validated['due_date'] ?? null,
                'invoice_number' => $validated['invoice_number'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'total' => $item['quantity'] * $item['unit_cost'],
                ]);
            }

            return $purchase;
        });

        $purchase->load('supplier'); // Aseguramos tener la relación cargada para el log

        AuditService::log('compra.crear', "Creó la orden de compra #{$purchase->id} a {$purchase->supplier->name} por S/ " . number_format($purchase->total, 2), $purchase);

        return redirect()->route('purchases.index')->with('success', 'Orden de compra creada');
    }

    /**
     * Marca la compra como recibida: aquí (y solo aquí) se actualiza
     * el stock y se genera el movimiento de Kardex tipo 'compra'.
     */
    public function receive(Purchase $purchase)
    {
        if ($purchase->status !== 'pendiente') {
            return back()->with('error', 'Esta compra ya fue procesada');
        }

        DB::transaction(function () use ($purchase) {
            foreach ($purchase->items as $item) {
                $product = Product::findOrFail($item->product_id);

                // Actualiza el costo del producto con el último precio de compra
                $product->update(['cost_price' => $item->unit_cost]);

                // Movimiento usando argumentos con nombre (PHP 8+)
                StockService::move(
                    product: $product,
                    type: 'compra',
                    quantity: (float) $item->quantity,
                    referenceType: \App\Models\Purchase::class,
                    referenceId: $purchase->id,
                    notes: "Compra #{$purchase->id} — {$purchase->supplier->name}",
                    warehouseId: $purchase->warehouse_id,
                );
            }

            $purchase->update(['status' => 'recibida']);
        });

        AuditService::log('compra.recibir', "Recibió la compra #{$purchase->id} de {$purchase->supplier->name}", $purchase);

        return redirect()->route('purchases.index')->with('success', "Compra #{$purchase->id} recibida, stock actualizado");
    }

    public function registerPayment(Request $request, Purchase $purchase)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:' . $purchase->balance(),
        ]);

        $newPaid = $purchase->paid_amount + $validated['amount'];
        $newStatus = $newPaid >= $purchase->total ? 'pagada' : 'parcial';

        $purchase->update([
            'paid_amount' => $newPaid,
            'payment_status' => $newStatus,
        ]);

        AuditService::log('compra.pagar', "Pagó S/ " . number_format($validated['amount'], 2) . " de la compra #{$purchase->id}", $purchase, ['monto' => (float) $validated['amount']]);

        return redirect()->route('purchases.index')->with('success', 'Pago registrado');
    }

    public function cancel(Purchase $purchase)
    {
        if ($purchase->status === 'recibida') {
            return back()->with('error', 'No puedes anular una compra ya recibida (el stock ya fue actualizado)');
        }

        $purchase->update(['status' => 'anulada']);

        AuditService::log('compra.anular', "Anuló la orden de compra #{$purchase->id}", $purchase);

        return redirect()->route('purchases.index')->with('success', 'Compra anulada');
    }
}
