<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\SaleItem;
use App\Models\Warehouse;
use App\Services\AuditService;
use App\Services\StockService;
use App\Services\WarehouseContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index()
    {
        $warehouseId = WarehouseContext::currentId();

        $products = Product::with(['category', 'brand'])
            // El leftJoin trae el stock de ESTA sucursal; los productos sin fila
            // en ella siguen apareciendo, en cero, gracias al COALESCE.
            ->leftJoin('product_stocks', function ($join) use ($warehouseId) {
                $join->on('product_stocks.product_id', '=', 'products.id')
                     ->where('product_stocks.warehouse_id', '=', $warehouseId);
            })
            ->select(
                'products.*',
                DB::raw('COALESCE(product_stocks.stock, 0) as warehouse_stock'),
                DB::raw('COALESCE(product_stocks.min_stock, products.min_stock) as warehouse_min_stock')
            )
            ->orderBy('products.name')
            ->paginate(15)
            ->through(function ($p) {
                return [
                    'id' => $p->id,
                    'category_id' => $p->category_id,
                    'category' => $p->category->name,
                    'brand_id' => $p->brand_id,
                    'brand' => $p->brand?->name,
                    'barcode' => $p->barcode,
                    'name' => $p->name,
                    'unit_type' => $p->unit_type,
                    'image_path' => $p->image_path,
                    'image_url' => $p->image_path ? Storage::url($p->image_path) : null,
                    'price' => (float) $p->price,
                    'cost_price' => $p->cost_price ? (float) $p->cost_price : null,
                    'stock' => (float) $p->warehouse_stock,
                    'min_stock' => (float) $p->warehouse_min_stock,
                    'total_stock' => (float) $p->stock, // consolidado de todas las sucursales
                    'is_active' => $p->is_active,
                ];
            });

        return Inertia::render('Inventory/Index', [
            'products' => $products,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'brands' => Brand::orderBy('name')->get(['id', 'name']),
            'currentWarehouse' => Warehouse::find($warehouseId)?->only(['id', 'name', 'code']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'unit_type' => 'required|in:unidad,kg,g,litro,ml',
            'barcode' => 'nullable|string|max:50|unique:products,barcode',
            'brand_id' => 'nullable|exists:brands,id',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock' => 'required|numeric|min:0',
            'min_stock' => 'required|numeric|min:0',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }
        unset($validated['image']);

        $warehouseId = WarehouseContext::currentId();
        $initialStock = (float) $validated['stock'];
        $minStock = (float) $validated['min_stock'];

        $product = DB::transaction(function () use ($validated, $warehouseId, $initialStock, $minStock) {
            // products.stock funciona como caché del total consolidado
            $product = Product::create([...$validated, 'stock' => $initialStock]);

            // Se crea la fila de stock en todas las sucursales activas;
            // solo la sucursal actual recibe el stock inicial.
            $warehouses = Warehouse::where('is_active', true)->pluck('id');

            foreach ($warehouses as $wId) {
                ProductStock::create([
                    'product_id' => $product->id,
                    'warehouse_id' => $wId,
                    'stock' => $wId === $warehouseId ? $initialStock : 0,
                    'min_stock' => $minStock,
                ]);
            }

            return $product;
        });

        AuditService::log('producto.crear', "Creó el producto \"{$product->name}\"", $product, [
            'precio' => (float) $product->price,
            'stock_inicial' => $initialStock,
            'sucursal' => Warehouse::find($warehouseId)?->name,
        ]);

        return redirect()->route('inventory.index')->with('success', 'Producto creado correctamente');
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'unit_type' => 'required|in:unidad,kg,g,litro,ml',
            'barcode' => 'nullable|string|max:50|unique:products,barcode,' . $product->id,
            'brand_id' => 'nullable|exists:brands,id',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock' => 'required|numeric|min:0',
            'min_stock' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }
        unset($validated['image']);

        $warehouseId = WarehouseContext::currentId();
        $newStock = (float) $validated['stock'];
        $newMinStock = (float) $validated['min_stock'];

        $before = $product->only(['name', 'price', 'cost_price', 'is_active', 'category_id', 'brand_id']);
        $stockRow = $product->stockRowFor($warehouseId);
        $stockBefore = (float) $stockRow->stock;

        DB::transaction(function () use ($product, $validated, $stockRow, $newStock, $newMinStock) {
            // El stock se maneja por sucursal, no en la tabla de productos
            unset($validated['stock']);
            $product->update($validated);

            $stockRow->update(['stock' => $newStock, 'min_stock' => $newMinStock]);

            StockService::syncTotalStock($product);
        });

        AuditService::logChange(
            'producto.editar',
            "Editó el producto \"{$product->name}\"",
            $product,
            $before,
            $product->fresh()->toArray(),
            array_keys($before)
        );

        // El cambio de precio se registra aparte por su sensibilidad
        if ((float) ($before['price'] ?? 0) !== (float) $product->price) {
            AuditService::log(
                'producto.precio',
                "Cambió el precio de \"{$product->name}\" de S/ " . number_format($before['price'], 2) . " a S/ " . number_format($product->price, 2),
                $product,
                ['precio_anterior' => (float) $before['price'], 'precio_nuevo' => (float) $product->price]
            );
        }

        // Un cambio manual de stock queda documentado, aunque no genera Kardex
        if (abs($stockBefore - $newStock) > 0.0001) {
            AuditService::log(
                'inventario.ajuste',
                "Ajustó el stock de \"{$product->name}\" de {$stockBefore} a {$newStock} desde la edición del producto",
                $product,
                [
                    'antes' => $stockBefore,
                    'despues' => $newStock,
                    'sucursal' => Warehouse::find($warehouseId)?->name,
                ]
            );
        }

        return redirect()->route('inventory.index')->with('success', 'Producto actualizado');
    }

    public function destroy(Product $product)
    {
        $hasSales = SaleItem::where('product_id', $product->id)->exists();

        if ($hasSales) {
            $product->update(['is_active' => false]);
            AuditService::log('producto.desactivar', "Desactivó \"{$product->name}\" (tiene ventas registradas)", $product);
            return redirect()->route('inventory.index')->with('success', 'Producto desactivado (tiene ventas registradas)');
        }

        $imagePath = $product->image_path;

        AuditService::log('producto.eliminar', "Eliminó permanentemente el producto \"{$product->name}\"", $product, [
            'stock_al_eliminar' => (float) $product->stock,
        ]);

        // Las filas de product_stocks se borran en cascada por la FK
        $product->delete();

        if ($imagePath) {
            Storage::disk('public')->delete($imagePath);
        }

        return redirect()->route('inventory.index')->with('success', 'Producto eliminado');
    }

    public function template()
    {
        $headers = ['name', 'category', 'brand', 'unit_type', 'barcode', 'price', 'cost_price', 'stock', 'min_stock'];
        $sample = ['Coca Cola 500ml', 'Bebidas', 'Coca-Cola', 'unidad', '7750001000010', '3.50', '2.00', '48', '10'];

        $csv = implode(',', $headers) . "\n" . implode(',', $sample) . "\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="plantilla_productos.csv"',
        ]);
    }

    public function bulkImport(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $path = $request->file('file')->getRealPath();
        $rows = array_map('str_getcsv', file($path));
        $header = array_map('trim', array_shift($rows));

        $warehouseId = WarehouseContext::currentId();
        $warehouses = Warehouse::where('is_active', true)->pluck('id');

        $created = 0;
        $errors = 0;

        DB::transaction(function () use ($rows, $header, $warehouseId, $warehouses, &$created, &$errors) {
            foreach ($rows as $row) {
                if (count($row) < 2 || empty(trim($row[0] ?? ''))) {
                    continue;
                }

                $data = array_combine($header, array_pad($row, count($header), null));

                try {
                    $category = Category::firstOrCreate(['name' => trim($data['category'])]);
                    $brand = !empty(trim($data['brand'] ?? '')) ? Brand::firstOrCreate(['name' => trim($data['brand'])]) : null;

                    $stock = (float) ($data['stock'] ?? 0);
                    $minStock = (float) ($data['min_stock'] ?? 5);

                    $product = Product::create([
                        'category_id' => $category->id,
                        'brand_id' => $brand?->id,
                        'name' => trim($data['name']),
                        'unit_type' => in_array($data['unit_type'] ?? '', ['unidad', 'kg', 'g', 'litro', 'ml']) ? $data['unit_type'] : 'unidad',
                        'barcode' => !empty(trim($data['barcode'] ?? '')) ? trim($data['barcode']) : null,
                        'price' => (float) ($data['price'] ?? 0),
                        'cost_price' => !empty($data['cost_price']) ? (float) $data['cost_price'] : null,
                        'stock' => $stock,
                        'min_stock' => $minStock,
                        'is_active' => true,
                    ]);

                    // El stock importado entra a la sucursal activa
                    foreach ($warehouses as $wId) {
                        ProductStock::create([
                            'product_id' => $product->id,
                            'warehouse_id' => $wId,
                            'stock' => $wId === $warehouseId ? $stock : 0,
                            'min_stock' => $minStock,
                        ]);
                    }

                    $created++;
                } catch (\Exception $e) {
                    $errors++;
                }
            }
        });

        AuditService::log('inventario.carga-masiva', "Importó {$created} producto(s) por CSV ({$errors} error(es))", null, [
            'creados' => $created,
            'errores' => $errors,
            'sucursal' => Warehouse::find($warehouseId)?->name,
        ]);

        return redirect()->route('inventory.index')->with('bulk_result', ['created' => $created, 'errors' => $errors]);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:products,id',
        ]);

        $products = Product::whereIn('id', $validated['ids'])->get();

        $deleted = 0;
        $deactivated = 0;

        foreach ($products as $product) {
            $hasSales = SaleItem::where('product_id', $product->id)->exists();

            if ($hasSales) {
                $product->update(['is_active' => false]);
                $deactivated++;
            } else {
                $imagePath = $product->image_path;
                $product->delete();
                if ($imagePath) {
                    Storage::disk('public')->delete($imagePath);
                }
                $deleted++;
            }
        }

        $message = "{$deleted} producto(s) eliminado(s)";
        if ($deactivated > 0) {
            $message .= ", {$deactivated} desactivado(s) por tener ventas registradas";
        }

        AuditService::log('producto.eliminar', $message, null, [
            'eliminados' => $deleted,
            'desactivados' => $deactivated,
        ]);

        return redirect()->route('inventory.index')->with('success', $message);
    }

    public function bulkActivate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:products,id',
        ]);

        $count = Product::whereIn('id', $validated['ids'])->update(['is_active' => true]);

        AuditService::log('producto.editar', "Activó {$count} producto(s)", null, ['cantidad' => $count]);

        return redirect()->route('inventory.index')->with('success', "{$count} producto(s) activado(s)");
    }

    public function bulkDeactivate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:products,id',
        ]);

        $count = Product::whereIn('id', $validated['ids'])->update(['is_active' => false]);

        AuditService::log('producto.desactivar', "Desactivó {$count} producto(s)", null, ['cantidad' => $count]);

        return redirect()->route('inventory.index')->with('success', "{$count} producto(s) desactivado(s)");
    }

    public function search(Request $request)
    {
        $query = $request->get('q', '');

        if (strlen($query) < 1) {
            return response()->json([]);
        }

        $warehouseId = WarehouseContext::currentId();

        $products = Product::with(['category', 'brand'])
            ->where('is_active', true)
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('barcode', $query)
                    ->orWhere('barcode', 'like', "%{$query}%")
                    ->orWhereHas('brand', function ($b) use ($query) {
                        $b->where('name', 'like', "%{$query}%");
                    });
            })
            ->limit(10)
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

        return response()->json($products);
    }
}