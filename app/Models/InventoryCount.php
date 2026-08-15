<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryCount extends Model
{
    protected $fillable = ['warehouse_id', 'user_id', 'category_id', 'status', 'closed_at', 'notes'];
    protected $casts = ['closed_at' => 'datetime'];

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
    public function items()
    {
        return $this->hasMany(InventoryCountItem::class);
    }
}
