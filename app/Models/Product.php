<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'category_id',
        'brand_id',
        'barcode',
        'name',
        'unit_type',
        'image_path',
        'price',
        'cost_price',
        'stock',
        'min_stock',
        'is_active',
    ];

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }
    protected $casts = [
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'stock' => 'decimal:3',
        'min_stock' => 'decimal:3',
    ];
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
    public function isLowStock(): bool
    {
        return $this->stock <= $this->min_stock;
    }

    public function unitLabel(): string
    {
        return match ($this->unit_type) {
            'kg' => 'kg',
            'g' => 'g',
            'litro' => 'L',
            'ml' => 'ml',
            default => 'und',
        };
    }
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }
    public function stocks()
    {
        return $this->hasMany(ProductStock::class);
    }

    public function warehouses()
    {
        return $this->belongsToMany(Warehouse::class, 'product_stocks')
            ->withPivot('stock', 'min_stock')
            ->withTimestamps();
    }

    /**
     * Stock en un almacén específico. Si no se indica, usa el predeterminado.
     */
    public function stockIn(?int $warehouseId = null): float
    {
        $warehouseId ??= Warehouse::defaultId();

        return (float) ($this->stocks->firstWhere('warehouse_id', $warehouseId)?->stock
            ?? ProductStock::where('product_id', $this->id)->where('warehouse_id', $warehouseId)->value('stock')
            ?? 0);
    }

    /**
     * Suma del stock en todos los almacenes.
     */
    public function totalStock(): float
    {
        return (float) ($this->stocks_sum_stock ?? $this->stocks()->sum('stock'));
    }

    /**
     * Obtiene o crea la fila de stock de este producto en un almacén.
     */
    public function stockRowFor(int $warehouseId): ProductStock
    {
        return ProductStock::firstOrCreate(
            ['product_id' => $this->id, 'warehouse_id' => $warehouseId],
            ['stock' => 0, 'min_stock' => $this->min_stock ?? 0]
        );
    }
}
