<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductStock extends Model
{
    protected $fillable = ['product_id', 'warehouse_id', 'stock', 'min_stock'];

    protected $casts = [
        'stock' => 'decimal:3',
        'min_stock' => 'decimal:3',
    ];

    public function product() { return $this->belongsTo(Product::class); }
    public function warehouse() { return $this->belongsTo(Warehouse::class); }

    public function isLow(): bool
    {
        return (float) $this->stock <= (float) $this->min_stock;
    }
}