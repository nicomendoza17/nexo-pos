<?php

namespace App\Http\Controllers;

use App\Models\ProductStock;
use App\Models\Warehouse;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\CashSession;

class WarehouseController extends Controller
{
    public function index()
    {
        $warehouses = Warehouse::withCount(['users', 'cashSessions'])
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(function ($w) {
                $stats = ProductStock::where('product_stocks.warehouse_id', $w->id)
                    ->join('products', 'products.id', '=', 'product_stocks.product_id')
                    ->where('products.is_active', true)
                    ->selectRaw('
        COUNT(*) as productos,
        SUM(CASE WHEN product_stocks.stock > 0 THEN 1 ELSE 0 END) as con_stock,
        SUM(CASE WHEN product_stocks.stock <= product_stocks.min_stock THEN 1 ELSE 0 END) as stock_bajo,
        SUM(product_stocks.stock * COALESCE(products.cost_price, 0)) as valor
    ')
                    ->first();

                return [
                    'id' => $w->id,
                    'name' => $w->name,
                    'code' => $w->code,
                    'type' => $w->type,
                    'address' => $w->address,
                    'phone' => $w->phone,
                    'manager_name' => $w->manager_name,
                    'is_active' => $w->is_active,
                    'is_default' => $w->is_default,
                    'allows_sales' => $w->allows_sales,
                    'users_count' => $w->users_count,
                    'sessions_count' => $w->cash_sessions_count,
                    'products' => (int) ($stats->productos ?? 0),
                    'with_stock' => (int) ($stats->con_stock ?? 0),
                    'low_stock' => (int) ($stats->stock_bajo ?? 0),
                    'inventory_value' => (float) ($stats->valor ?? 0),
                ];
            });

        return Inertia::render('Warehouses/Index', ['warehouses' => $warehouses]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:warehouses,code',
            'type' => 'required|in:sucursal,almacen',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'manager_name' => 'nullable|string|max:255',
            'allows_sales' => 'boolean',
            'replicate_products' => 'boolean',
        ]);

        $warehouse = DB::transaction(function () use ($validated) {
            $warehouse = Warehouse::create([
                'name' => $validated['name'],
                'code' => strtoupper($validated['code']),
                'type' => $validated['type'],
                'address' => $validated['address'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'manager_name' => $validated['manager_name'] ?? null,
                'allows_sales' => $validated['allows_sales'] ?? true,
                'is_active' => true,
                'is_default' => false,
            ]);

            // Crea las filas de stock en cero para todos los productos activos,
            // así la sucursal ya aparece en inventario y puede recibir transferencias.
            if ($validated['replicate_products'] ?? true) {
                $products = \App\Models\Product::where('is_active', true)->get(['id', 'min_stock']);
                $rows = $products->map(fn($p) => [
                    'product_id' => $p->id,
                    'warehouse_id' => $warehouse->id,
                    'stock' => 0,
                    'min_stock' => $p->min_stock ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])->toArray();

                foreach (array_chunk($rows, 200) as $chunk) {
                    ProductStock::insert($chunk);
                }
            }

            return $warehouse;
        });

        AuditService::log(
            'sucursal.crear',
            "Creó la sucursal \"{$warehouse->name}\" ({$warehouse->code})",
            $warehouse,
            ['tipo' => $warehouse->type, 'permite_ventas' => $warehouse->allows_sales]
        );

        return redirect()->route('warehouses.index')->with('success', 'Sucursal creada correctamente');
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:warehouses,code,' . $warehouse->id,
            'type' => 'required|in:sucursal,almacen',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'manager_name' => 'nullable|string|max:255',
            'allows_sales' => 'boolean',
        ]);

        $before = $warehouse->only(array_keys($validated));
        $validated['code'] = strtoupper($validated['code']);
        $warehouse->update($validated);

        AuditService::logChange(
            'sucursal.editar',
            "Editó la sucursal \"{$warehouse->name}\"",
            $warehouse,
            $before,
            $warehouse->fresh()->toArray(),
            array_keys($before)
        );

        return back()->with('success', 'Sucursal actualizada');
    }

    public function toggleStatus(Warehouse $warehouse)
    {
        if ($warehouse->is_default) {
            return back()->with('error', 'No puedes desactivar la sucursal principal.');
        }

        if ($warehouse->is_active) {
            $openSessions = $warehouse->cashSessions()->where('status', 'abierta')->count();
            if ($openSessions > 0) {
                return back()->with('error', "No puedes desactivar la sucursal: tiene {$openSessions} caja(s) abierta(s).");
            }
        }

        $warehouse->update(['is_active' => !$warehouse->is_active]);
        $accion = $warehouse->is_active ? 'activó' : 'desactivó';

        AuditService::log('sucursal.estado', "Se {$accion} la sucursal \"{$warehouse->name}\"", $warehouse);

        return back()->with('success', "Sucursal {$accion} correctamente");
    }

    public function setDefault(Warehouse $warehouse)
    {
        if (!$warehouse->is_active) {
            return back()->with('error', 'Solo una sucursal activa puede ser la principal.');
        }

        DB::transaction(function () use ($warehouse) {
            Warehouse::where('is_default', true)->update(['is_default' => false]);
            $warehouse->update(['is_default' => true]);
        });

        AuditService::log('sucursal.editar', "Estableció \"{$warehouse->name}\" como sucursal principal", $warehouse);

        return back()->with('success', 'Sucursal principal actualizada');
    }

    /**
     * Cambia la sucursal en la que opera el usuario durante esta sesión.
     */
    public function setActive(Request $request, Warehouse $warehouse)
    {
        if ($request->user()->warehouse_id) {
            return back()->with('error', 'Tu usuario está asignado a una sucursal fija.');
        }

        if (!$warehouse->is_active) {
            return back()->with('error', 'Esa sucursal está desactivada.');
        }

        if (CashSession::where('user_id', $request->user()->id)->where('status', 'abierta')->exists()) {
            return back()->with('error', 'Cierra tu caja antes de cambiar de sucursal.');
        }

        session(['active_warehouse_id' => $warehouse->id]);

        return back()->with('success', "Ahora operas en {$warehouse->name}");
    }
}
