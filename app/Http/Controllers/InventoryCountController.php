<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\InventoryCount;
use App\Models\InventoryCountItem;
use App\Models\Product;
use App\Models\Warehouse;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Services\AuditService;

class InventoryCountController extends Controller
{
    public function index()
    {
        $counts = InventoryCount::with(['user', 'category'])
            ->orderByDesc('created_at')
            ->paginate(15)
            ->through(fn($c) => [
                'id' => $c->id,
                'user' => $c->user->name,
                'category' => $c->category?->name ?? 'Todas',
                'status' => $c->status,
                'items_count' => $c->items()->count(),
                'counted_count' => $c->items()->whereNotNull('counted_stock')->count(),
                'created_at' => $c->created_at,
                'closed_at' => $c->closed_at,
            ]);

        $categories = Category::orderBy('name')->get(['id', 'name']);

        return Inertia::render('InventoryCounts/Index', [
            'counts' => $counts,
            'categories' => $categories,
        ]);
    }

    public function create(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $count = DB::transaction(function () use ($validated, $request) {
            $count = InventoryCount::create([
                // Nota: Asegúrate de tener importado el modelo Warehouse o usa la ruta completa
                'warehouse_id' => \App\Models\Warehouse::where('is_default', true)->value('id'),
                'user_id' => $request->user()->id,
                'category_id' => $validated['category_id'] ?? null,
                'status' => 'abierto',
            ]);

            $products = Product::where('is_active', true)
                ->when($validated['category_id'] ?? null, fn($q, $catId) => $q->where('category_id', $catId))
                ->get();

            foreach ($products as $product) {
                InventoryCountItem::create([
                    'inventory_count_id' => $count->id,
                    'product_id' => $product->id,
                    'system_stock' => $product->stockIn($count->warehouse_id),
                ]);
            }

            return $count;
        });

        return redirect()->route('inventory-counts.show', $count->id);
    }

    public function show(InventoryCount $inventoryCount)
    {
        $items = $inventoryCount->items()
            ->with('product:id,name,unit_type,barcode')
            ->get()
            ->map(fn($i) => [
                'id' => $i->id,
                'product' => $i->product->name,
                'unit_type' => $i->product->unit_type,
                'barcode' => $i->product->barcode,
                'system_stock' => (float) $i->system_stock,
                'counted_stock' => $i->counted_stock !== null ? (float) $i->counted_stock : null,
            ]);

        return Inertia::render('InventoryCounts/Show', [
            'count' => [
                'id' => $inventoryCount->id,
                'status' => $inventoryCount->status,
                'category' => $inventoryCount->category?->name ?? 'Todas',
                'created_at' => $inventoryCount->created_at,
            ],
            'items' => $items,
        ]);
    }

    public function updateItem(Request $request, InventoryCountItem $item)
    {
        $validated = $request->validate([
            'counted_stock' => 'required|numeric|min:0',
        ]);

        $item->update(['counted_stock' => $validated['counted_stock']]);

        return back();
    }

    /**
     * Cierra el conteo: genera un ajuste de Kardex por cada producto
     * cuya cantidad contada difiera del stock del sistema.
     */
    public function close(InventoryCount $inventoryCount)
    {
        if ($inventoryCount->status !== 'abierto') {
            return back()->with('error', 'Este conteo ya está cerrado');
        }

        DB::transaction(function () use ($inventoryCount) {
            $items = $inventoryCount->items()->whereNotNull('counted_stock')->get();

            foreach ($items as $item) {
                $diff = (float) $item->counted_stock - (float) $item->system_stock;

                if (abs($diff) < 0.001) {
                    continue; // sin diferencia, no genera movimiento
                }

                $product = Product::findOrFail($item->product_id);

                StockService::move(
                    product: $product,
                    type: $diff > 0 ? 'ajuste_entrada' : 'ajuste_salida',
                    quantity: abs($diff),
                    referenceType: \App\Models\InventoryCount::class,
                    referenceId: $inventoryCount->id,
                    notes: "Toma de inventario #{$inventoryCount->id} — diferencia de conteo",
                    warehouseId: $inventoryCount->warehouse_id,
                );
            }

            $inventoryCount->update(['status' => 'cerrado', 'closed_at' => now()]);

            // Se coloca aquí adentro para tener acceso a la variable $items
            AuditService::log('inventario.conteo-cerrar', "Cerró la toma de inventario #{$inventoryCount->id} con {$items->count()} producto(s) contado(s)", $inventoryCount);
        });

        return redirect()->route('inventory-counts.index')->with('success', 'Conteo cerrado, ajustes de stock aplicados');
    }

    /**
     * Genera un PDF/vista imprimible con la lista de productos
     * (opcionalmente filtrados por categoría) para contar en físico.
     */
    public function printSheet(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $products = Product::with(['category', 'brand'])
            ->where('is_active', true)
            ->when($validated['category_id'] ?? null, fn($q, $catId) => $q->where('category_id', $catId))
            ->orderBy('name')
            ->get(['id', 'name', 'category_id', 'brand_id', 'unit_type', 'barcode']);

        return Inertia::render('InventoryCounts/PrintSheet', [
            'products' => $products,
            'category' => $validated['category_id'] ?? null,
        ]);
    }
}
