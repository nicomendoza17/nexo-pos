<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Warehouse extends Model
{
    protected $fillable = [
        'name',
        'code',
        'type',
        'address',
        'phone',
        'manager_name',
        'is_active',
        'is_default',
        'allows_sales',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'allows_sales' => 'boolean',
    ];

    public function productStocks()
    {
        return $this->hasMany(ProductStock::class);
    }
    public function users()
    {
        return $this->hasMany(User::class);
    }
    public function sales()
    {
        return $this->hasManyThrough(Sale::class, CashSession::class);
    }
    public function cashSessions()
    {
        return $this->hasMany(CashSession::class);
    }

    public static function defaultId(): int
    {
        return Cache::rememberForever('warehouse.default_id', function () {
            return static::where('is_default', true)->value('id')
                ?? static::value('id')
                ?? throw new \RuntimeException('No hay ningún almacén configurado.');
        });
    }

    /**
     * Valor del inventario de esta sucursal a precio de costo.
     */
    public function inventoryValue(): float
    {
        return (float) $this->productStocks()
            ->join('products', 'products.id', '=', 'product_stocks.product_id')
            ->selectRaw('SUM(product_stocks.stock * COALESCE(products.cost_price, 0)) as total')
            ->value('total');
    }

    protected static function booted(): void
    {
        static::saved(fn() => Cache::forget('warehouse.default_id'));
        static::deleted(fn() => Cache::forget('warehouse.default_id'));
    }
}
