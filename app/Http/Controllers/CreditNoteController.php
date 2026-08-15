<?php

namespace App\Http\Controllers;

use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\CreditNote;
use App\Models\CreditNoteItem;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Services\AuditService;
use App\Services\SettingsService;

class CreditNoteController extends Controller
{
    public function index()
    {
        $creditNotes = CreditNote::with(['sale.client', 'user'])
            ->orderByDesc('created_at')
            ->paginate(15)
            ->through(fn($n) => [
                'id' => $n->id,
                'code' => $n->code,
                'sale_id' => $n->sale_id,
                'client' => $n->sale->client?->name ?? 'Cliente general',
                'user' => $n->user->name,
                'type' => $n->type,
                'reason' => $n->reason,
                'total' => (float) $n->total,
                'refund_method' => $n->refund_method,
                'created_at' => $n->created_at,
            ]);

        return Inertia::render('CreditNotes/Index', ['creditNotes' => $creditNotes]);
    }

    /**
     * Detalle de una venta, con lo ya devuelto por notas previas,
     * para poder emitir una nota de crédito sobre ella.
     */
    public function createFromSale(Sale $sale)
    {
        $sale->load(['items.product', 'client', 'user', 'creditNotes']);

        $items = $sale->items->map(function ($item) use ($sale) {
            $returned = $sale->returnedQuantityFor($item->id);
            return [
                'sale_item_id' => $item->id,
                'product_id' => $item->product_id,
                'product' => $item->product->name,
                'unit_type' => $item->product->unit_type,
                'quantity' => (float) $item->quantity,
                'returned' => $returned,
                'available' => (float) $item->quantity - $returned,
                'unit_price' => (float) $item->price,
                'total' => (float) $item->total,
            ];
        });

        return Inertia::render('CreditNotes/Create', [
            'sale' => [
                'id' => $sale->id,
                'client' => $sale->client?->name ?? 'Cliente general',
                'user' => $sale->user->name,
                'payment_method' => $sale->payment_method,
                'subtotal' => (float) $sale->subtotal,
                'tax' => (float) $sale->tax,
                'total' => (float) $sale->total,
                'total_credited' => $sale->totalCredited(),
                'created_at' => $sale->created_at,
            ],
            'items' => $items,
            'nextCode' => CreditNote::nextCode(),
        ]);
    }

    public function store(Request $request, Sale $sale)
    {
        // Solo admin puede autorizar notas de crédito
        if (!$request->user()->can('notas-credito.emitir')) {
            return back()->with('error', 'Solo un administrador puede emitir notas de crédito');
        }

        $validated = $request->validate([
            'type' => 'required|in:devolucion_total,devolucion_parcial,correccion_monto,anulacion',
            'reason' => 'required|string|max:255',
            'refund_method' => 'required|string|max:50',
            'items' => 'nullable|array',
            'items.*.sale_item_id' => 'required|exists:sale_items,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.restock' => 'boolean',
            'correction_amount' => 'nullable|numeric|min:0.01', // solo para correccion_monto
        ]);

        // Corrección de monto no lleva productos
        if ($validated['type'] === 'correccion_monto') {
            if (empty($validated['correction_amount'])) {
                return back()->with('error', 'Debes indicar el monto a corregir');
            }
        } elseif (empty($validated['items'])) {
            return back()->with('error', 'Debes seleccionar al menos un producto a devolver');
        }

        $creditNote = DB::transaction(function () use ($validated, $sale, $request) {
            $openSession = CashSession::where('user_id', $request->user()->id)
                ->where('status', 'abierta')
                ->first();

            // Identificamos a qué sucursal debe regresar el stock basándonos en la venta original
            // Nota: Asegúrate de tener importado el modelo Warehouse en este controlador
            $warehouseId = $sale->cashSession?->warehouse_id ?? \App\Models\Warehouse::defaultId();

            $subtotal = 0;
            $lines = [];

            if ($validated['type'] === 'correccion_monto') {
                // El monto corregido se trata como base imponible
                $rate = SettingsService::taxRate();
                $subtotal = $validated['correction_amount'] / (1 + $rate);
            } else {
                foreach ($validated['items'] as $item) {
                    $saleItem = SaleItem::where('sale_id', $sale->id)->findOrFail($item['sale_item_id']);

                    $alreadyReturned = $sale->returnedQuantityFor($saleItem->id);
                    $available = (float) $saleItem->quantity - $alreadyReturned;

                    if ($item['quantity'] > $available + 0.0001) {
                        throw new \Exception("No puedes devolver más de lo vendido para {$saleItem->product->name}. Disponible: {$available}");
                    }

                    $lineTotal = $saleItem->price * $item['quantity'];
                    $subtotal += $lineTotal;

                    $lines[] = [
                        'sale_item' => $saleItem,
                        'quantity' => $item['quantity'],
                        'unit_price' => $saleItem->price,
                        'total' => $lineTotal,
                        'restock' => $item['restock'] ?? true,
                    ];
                }
            }

            if ($validated['type'] === 'correccion_monto') {
                // El monto ingresado es siempre el total a acreditar (lo que se devuelve al cliente)
                $rate = SettingsService::taxRate();
                $total = (float) $validated['correction_amount'];
                $subtotal = round($total / (1 + $rate), 2);
                $tax = round($total - $subtotal, 2);
            } else {
                // Los precios de las líneas vienen de la venta original, así que
                // se aplica la misma regla de configuración que se usó al venderlas
                $amounts = SettingsService::breakdown($subtotal);
                $subtotal = $amounts['subtotal'];
                $tax = $amounts['tax'];
                $total = $amounts['total'];
            }

            $creditNote = CreditNote::create([
                'code' => CreditNote::nextCode(),
                'sale_id' => $sale->id,
                'user_id' => $request->user()->id,
                'cash_session_id' => $openSession?->id,
                'type' => $validated['type'],
                'reason' => $validated['reason'],
                'subtotal' => $subtotal,
                'tax' => $tax,
                'total' => $total,
                'refund_method' => $validated['refund_method'],
                'ip_address' => $request->ip(),
            ]);

            foreach ($lines as $line) {
                CreditNoteItem::create([
                    'credit_note_id' => $creditNote->id,
                    'sale_item_id' => $line['sale_item']->id,
                    'product_id' => $line['sale_item']->product_id,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'total' => $line['total'],
                    'restock' => $line['restock'],
                ]);

                // Solo devuelve al stock si el producto vuelve en buen estado
                if ($line['restock']) {
                    $product = Product::findOrFail($line['sale_item']->product_id);

                    StockService::move(
                        product: $product,
                        type: 'devolucion_venta',
                        quantity: (float) $line['quantity'],
                        referenceType: CreditNote::class,
                        referenceId: $creditNote->id,
                        notes: "Devolución {$creditNote->code} — {$validated['reason']}",
                        warehouseId: $warehouseId, // Regresa el stock a la sucursal de origen
                    );
                }
            }

            // Si se devolvió efectivo y hay caja abierta, se registra la salida
            if ($openSession && $validated['refund_method'] === 'Efectivo') {
                CashMovement::create([
                    'cash_session_id' => $openSession->id,
                    'user_id' => $request->user()->id,
                    'type' => 'retiro',
                    'payment_method' => 'Efectivo',
                    'amount' => $total,
                    'concept' => "Devolución {$creditNote->code} (Venta #{$sale->id})",
                    'reference_type' => CreditNote::class,
                    'reference_id' => $creditNote->id,
                    'ip_address' => $request->ip(),
                ]);
            }

            AuditService::log('nota-credito.emitir', "Emitió {$creditNote->code} sobre la venta #{$sale->id} por S/ " . number_format($total, 2) . ". Motivo: {$validated['reason']}", $creditNote, [
                'tipo' => $validated['type'],
                'venta_origen' => $sale->id,
                'total' => $total,
                'motivo' => $validated['reason'],
                'warehouse_id' => $warehouseId, // Añadido al registro de auditoría como buena práctica
            ]);

            return $creditNote;
        });

        return redirect()->route('credit-notes.index')->with('success', "Nota de crédito {$creditNote->code} emitida");
    }

    public function show(CreditNote $creditNote)
    {
        $creditNote->load(['sale.client', 'user', 'items.product']);

        return Inertia::render('CreditNotes/Show', [
            'creditNote' => [
                'id' => $creditNote->id,
                'code' => $creditNote->code,
                'sale_id' => $creditNote->sale_id,
                'client' => $creditNote->sale->client?->name ?? 'Cliente general',
                'user' => $creditNote->user->name,
                'type' => $creditNote->type,
                'reason' => $creditNote->reason,
                'subtotal' => (float) $creditNote->subtotal,
                'tax' => (float) $creditNote->tax,
                'total' => (float) $creditNote->total,
                'refund_method' => $creditNote->refund_method,
                'created_at' => $creditNote->created_at,
                'items' => $creditNote->items->map(fn($i) => [
                    'id' => $i->id,
                    'product' => $i->product->name,
                    'quantity' => (float) $i->quantity,
                    'unit_price' => (float) $i->unit_price,
                    'total' => (float) $i->total,
                    'restock' => $i->restock,
                ]),
            ],
        ]);
    }
}
