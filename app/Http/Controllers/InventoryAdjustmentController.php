<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Services\AuditService;
use App\Services\StockService;
use App\Services\WarehouseContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InventoryAdjustmentController extends Controller
{
    public function index()
    {
        $warehouseId = WarehouseContext::currentId();

        $adjustments = StockMovement::with(['product', 'user'])
            ->whereIn('type', ['ajuste_entrada', 'ajuste_salida'])
            ->where('warehouse_id', $warehouseId)
            ->orderByDesc('created_at')
            ->paginate(20)
            ->through(fn ($m) => [
                'id' => $m->id,
                'product' => $m->product->name,
                'type' => $m->type,
                'quantity' => (float) $m->quantity,
                'stock_before' => (float) $m->stock_before,
                'stock_after' => (float) $m->stock_after,
                'user' => $m->user->name,
                'notes' => $m->notes,
                'created_at' => $m->created_at,
            ]);

        // El selector debe mostrar el stock de ESTA sucursal, no el consolidado
        $products = Product::where('products.is_active', true)
            ->leftJoin('product_stocks', function ($join) use ($warehouseId) {
                $join->on('product_stocks.product_id', '=', 'products.id')
                     ->where('product_stocks.warehouse_id', '=', $warehouseId);
            })
            ->orderBy('products.name')
            ->select(
                'products.id',
                'products.name',
                'products.unit_type',
                DB::raw('COALESCE(product_stocks.stock, 0) as stock')
            )
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'unit_type' => $p->unit_type,
                'stock' => (float) $p->stock,
            ]);

        return Inertia::render('InventoryAdjustments/Index', [
            'adjustments' => $adjustments,
            'products' => $products,
            'currentWarehouse' => Warehouse::find($warehouseId)?->only(['id', 'name', 'code']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'type' => 'required|in:ajuste_entrada,ajuste_salida',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'required|string|max:255',
        ]);

        $warehouseId = WarehouseContext::currentId();
        $product = Product::findOrFail($validated['product_id']);

        try {
            StockService::move(
                product: $product,
                type: $validated['type'],
                quantity: (float) $validated['quantity'],
                notes: $validated['reason'],
                warehouseId: $warehouseId,
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $signo = $validated['type'] === 'ajuste_entrada' ? '+' : '−';

        AuditService::log(
            'inventario.ajuste',
            "Ajuste {$signo}{$validated['quantity']} en \"{$product->name}\". Motivo: {$validated['reason']}",
            $product,
            [
                'tipo' => $validated['type'],
                'cantidad' => (float) $validated['quantity'],
                'motivo' => $validated['reason'],
                'sucursal' => Warehouse::find($warehouseId)?->name,
            ]
        );

        return redirect()->route('inventory-adjustments.index')->with('success', 'Ajuste registrado correctamente');
    }
}