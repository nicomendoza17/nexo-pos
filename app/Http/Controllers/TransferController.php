<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\Warehouse;
use App\Services\AuditService;
use App\Services\StockService;
use App\Services\WarehouseContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransferController extends Controller
{
    public function index(Request $request)
    {
        $currentWarehouse = WarehouseContext::currentId();
        $filter = $request->get('filter', 'todas');

        $transfers = Transfer::with(['fromWarehouse:id,name,code', 'toWarehouse:id,name,code', 'creator:id,name'])
            ->withCount('items')
            ->when($filter === 'salientes', fn ($q) => $q->where('from_warehouse_id', $currentWarehouse))
            ->when($filter === 'entrantes', fn ($q) => $q->where('to_warehouse_id', $currentWarehouse))
            ->when($filter === 'por_recibir', fn ($q) => $q->where('to_warehouse_id', $currentWarehouse)->where('status', 'en_transito'))
            ->when($filter === 'por_despachar', fn ($q) => $q->where('from_warehouse_id', $currentWarehouse)->where('status', 'pendiente'))
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($t) => [
                'id' => $t->id,
                'code' => $t->code,
                'from' => $t->fromWarehouse->name,
                'from_code' => $t->fromWarehouse->code,
                'to' => $t->toWarehouse->name,
                'to_code' => $t->toWarehouse->code,
                'creator' => $t->creator->name,
                'status' => $t->status,
                'items_count' => $t->items_count,
                'created_at' => $t->created_at,
                'dispatched_at' => $t->dispatched_at,
                'received_at' => $t->received_at,
                'is_outgoing' => $t->from_warehouse_id === $currentWarehouse,
            ]);

        return Inertia::render('Transfers/Index', [
            'transfers' => $transfers,
            'filter' => $filter,
            'currentWarehouse' => Warehouse::find($currentWarehouse)?->only(['id', 'name', 'code']),
            'counters' => [
                'por_despachar' => Transfer::where('from_warehouse_id', $currentWarehouse)->where('status', 'pendiente')->count(),
                'por_recibir' => Transfer::where('to_warehouse_id', $currentWarehouse)->where('status', 'en_transito')->count(),
            ],
        ]);
    }

    public function create()
    {
        $currentWarehouse = WarehouseContext::currentId();

        // Solo productos que tienen stock en el almacén de origen
        $products = ProductStock::where('product_stocks.warehouse_id', $currentWarehouse)
            ->where('product_stocks.stock', '>', 0)
            ->join('products', 'products.id', '=', 'product_stocks.product_id')
            ->where('products.is_active', true)
            ->orderBy('products.name')
            ->select(
                'products.id', 'products.name', 'products.unit_type',
                'products.barcode', 'products.cost_price',
                'product_stocks.stock as available'
            )
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'unit_type' => $p->unit_type,
                'barcode' => $p->barcode,
                'cost_price' => (float) ($p->cost_price ?? 0),
                'available' => (float) $p->available,
            ]);

        return Inertia::render('Transfers/Create', [
            'products' => $products,
            'fromWarehouse' => Warehouse::find($currentWarehouse)?->only(['id', 'name', 'code']),
            'destinations' => Warehouse::where('is_active', true)
                ->where('id', '!=', $currentWarehouse)
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'type']),
            'nextCode' => Transfer::nextCode(),
        ]);
    }

    public function store(Request $request)
    {
        $fromWarehouse = WarehouseContext::currentId();

        $validated = $request->validate([
            'to_warehouse_id' => 'required|exists:warehouses,id|different:from',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
        ]);

        if ((int) $validated['to_warehouse_id'] === $fromWarehouse) {
            return back()->with('error', 'El destino no puede ser la misma sucursal de origen.');
        }

        $transfer = DB::transaction(function () use ($validated, $fromWarehouse, $request) {
            $transfer = Transfer::create([
                'code' => Transfer::nextCode(),
                'from_warehouse_id' => $fromWarehouse,
                'to_warehouse_id' => $validated['to_warehouse_id'],
                'created_by' => $request->user()->id,
                'status' => 'pendiente',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                $available = $product->stockIn($fromWarehouse);

                if ($item['quantity'] > $available + 0.0001) {
                    throw new \Exception("Stock insuficiente de \"{$product->name}\": disponible {$available}");
                }

                TransferItem::create([
                    'transfer_id' => $transfer->id,
                    'product_id' => $product->id,
                    'quantity_sent' => $item['quantity'],
                    'unit_cost' => $product->cost_price,
                ]);
            }

            return $transfer;
        });

        AuditService::log(
            'transferencia.crear',
            "Creó la transferencia {$transfer->code} de {$transfer->fromWarehouse->name} a {$transfer->toWarehouse->name}",
            $transfer,
            ['items' => count($validated['items']), 'destino' => $transfer->toWarehouse->name]
        );

        return redirect()->route('transfers.show', $transfer->id)->with('success', 'Transferencia creada');
    }

    public function show(Transfer $transfer)
    {
        $transfer->load(['fromWarehouse', 'toWarehouse', 'creator', 'dispatcher', 'receiver', 'items.product']);
        $currentWarehouse = WarehouseContext::currentId();

        return Inertia::render('Transfers/Show', [
            'transfer' => [
                'id' => $transfer->id,
                'code' => $transfer->code,
                'from' => $transfer->fromWarehouse->only(['id', 'name', 'code']),
                'to' => $transfer->toWarehouse->only(['id', 'name', 'code']),
                'creator' => $transfer->creator->name,
                'dispatcher' => $transfer->dispatcher?->name,
                'receiver' => $transfer->receiver?->name,
                'status' => $transfer->status,
                'notes' => $transfer->notes,
                'reception_notes' => $transfer->reception_notes,
                'created_at' => $transfer->created_at,
                'dispatched_at' => $transfer->dispatched_at,
                'received_at' => $transfer->received_at,
                'total_value' => $transfer->totalValue(),
                'has_discrepancies' => $transfer->hasDiscrepancies(),
                'items' => $transfer->items->map(fn ($i) => [
                    'id' => $i->id,
                    'product' => $i->product->name,
                    'unit_type' => $i->product->unit_type,
                    'barcode' => $i->product->barcode,
                    'quantity_sent' => (float) $i->quantity_sent,
                    'quantity_received' => $i->quantity_received !== null ? (float) $i->quantity_received : null,
                    'difference' => $i->difference(),
                    'unit_cost' => (float) ($i->unit_cost ?? 0),
                    'discrepancy_reason' => $i->discrepancy_reason,
                    'available_at_origin' => $i->product->stockIn($transfer->from_warehouse_id),
                ]),
            ],
            'canDispatch' => $transfer->status === 'pendiente'
                && $transfer->from_warehouse_id === $currentWarehouse
                && auth()->user()->can('transferencias.despachar'),
            'canReceive' => $transfer->status === 'en_transito'
                && $transfer->to_warehouse_id === $currentWarehouse
                && auth()->user()->can('transferencias.recibir'),
            'canCancel' => $transfer->status === 'pendiente'
                && auth()->user()->can('transferencias.crear'),
        ]);
    }

    /**
     * Despacha la transferencia: el stock SALE del origen y queda en tránsito.
     */
    public function dispatch(Request $request, Transfer $transfer)
    {
        if ($transfer->status !== 'pendiente') {
            return back()->with('error', 'Esta transferencia ya fue despachada o anulada.');
        }

        if ($transfer->from_warehouse_id !== WarehouseContext::currentId()) {
            return back()->with('error', 'Solo puedes despachar desde la sucursal de origen.');
        }

        DB::transaction(function () use ($transfer, $request) {
            foreach ($transfer->items as $item) {
                StockService::move(
                    product: $item->product,
                    type: 'transferencia_salida',
                    quantity: (float) $item->quantity_sent,
                    referenceType: Transfer::class,
                    referenceId: $transfer->id,
                    notes: "Transferencia {$transfer->code} → {$transfer->toWarehouse->name}",
                    warehouseId: $transfer->from_warehouse_id,
                    destinationWarehouseId: $transfer->to_warehouse_id,
                );
            }

            $transfer->update([
                'status' => 'en_transito',
                'dispatched_by' => $request->user()->id,
                'dispatched_at' => now(),
            ]);
        });

        AuditService::log(
            'transferencia.despachar',
            "Despachó la transferencia {$transfer->code} hacia {$transfer->toWarehouse->name}",
            $transfer,
            ['valor' => $transfer->totalValue()]
        );

        return back()->with('success', 'Mercadería despachada. El stock salió del origen.');
    }

    /**
     * Confirma la recepción: el stock ENTRA al destino.
     * Permite registrar cantidades distintas a las enviadas (faltantes en tránsito).
     */
    public function receive(Request $request, Transfer $transfer)
    {
        if ($transfer->status !== 'en_transito') {
            return back()->with('error', 'Esta transferencia no está en tránsito.');
        }

        if ($transfer->to_warehouse_id !== WarehouseContext::currentId()) {
            return back()->with('error', 'Solo puedes recibir en la sucursal de destino.');
        }

        $validated = $request->validate([
            'reception_notes' => 'nullable|string|max:500',
            'items' => 'required|array',
            'items.*.id' => 'required|exists:transfer_items,id',
            'items.*.quantity_received' => 'required|numeric|min:0',
            'items.*.discrepancy_reason' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($validated, $transfer, $request) {
            foreach ($validated['items'] as $data) {
                $item = TransferItem::where('transfer_id', $transfer->id)->findOrFail($data['id']);
                $received = (float) $data['quantity_received'];

                if ($received > (float) $item->quantity_sent + 0.0001) {
                    throw new \Exception("No puedes recibir más de lo enviado para \"{$item->product->name}\".");
                }

                $item->update([
                    'quantity_received' => $received,
                    'discrepancy_reason' => $data['discrepancy_reason'] ?? null,
                ]);

                if ($received > 0) {
                    StockService::move(
                        product: $item->product,
                        type: 'transferencia_entrada',
                        quantity: $received,
                        referenceType: Transfer::class,
                        referenceId: $transfer->id,
                        notes: "Transferencia {$transfer->code} ← {$transfer->fromWarehouse->name}",
                        warehouseId: $transfer->to_warehouse_id,
                        destinationWarehouseId: $transfer->from_warehouse_id,
                    );
                }

                // Lo que salió del origen pero no llegó se registra como merma en tránsito
                $missing = (float) $item->quantity_sent - $received;
                if ($missing > 0.0001) {
                    StockService::move(
                        product: $item->product,
                        type: 'merma',
                        quantity: $missing,
                        referenceType: Transfer::class,
                        referenceId: $transfer->id,
                        notes: "Faltante en tránsito — {$transfer->code}" . ($data['discrepancy_reason'] ? ": {$data['discrepancy_reason']}" : ''),
                        warehouseId: $transfer->to_warehouse_id,
                    );
                }
            }

            $transfer->update([
                'status' => 'recibida',
                'received_by' => $request->user()->id,
                'received_at' => now(),
                'reception_notes' => $validated['reception_notes'] ?? null,
            ]);
        });

        $transfer->refresh()->load('items');
        $action = $transfer->hasDiscrepancies() ? 'transferencia.discrepancia' : 'transferencia.recibir';

        AuditService::log(
            $action,
            "Recibió la transferencia {$transfer->code}" . ($transfer->hasDiscrepancies() ? ' con diferencias respecto a lo enviado' : ''),
            $transfer,
            ['con_diferencias' => $transfer->hasDiscrepancies()]
        );

        return redirect()->route('transfers.show', $transfer->id)->with('success', 'Recepción confirmada');
    }

    public function cancel(Transfer $transfer)
    {
        if ($transfer->status !== 'pendiente') {
            return back()->with('error', 'Solo puedes anular transferencias pendientes de despacho.');
        }

        $transfer->update(['status' => 'anulada']);

        AuditService::log('transferencia.anular', "Anuló la transferencia {$transfer->code}", $transfer);

        return redirect()->route('transfers.index')->with('success', 'Transferencia anulada');
    }
}