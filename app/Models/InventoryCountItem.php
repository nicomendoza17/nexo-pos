<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryCountItem extends Model
{
    protected $fillable = ['inventory_count_id', 'product_id', 'system_stock', 'counted_stock'];

    public function inventoryCount()
    {
        return $this->belongsTo(InventoryCount::class);
    }
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function difference(): ?float
    {
        if ($this->counted_stock === null) return null;
        return (float) $this->counted_stock - (float) $this->system_stock;
    }
}
