<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    protected $fillable = [
    'supplier_id', 'user_id', 'warehouse_id', 'subtotal', 'tax', 'total',
    'paid_amount', 'status', 'payment_status', 'purchase_date', 'due_date',
    'invoice_number', 'notes',
];

protected $casts = [
    'purchase_date' => 'date',
    'due_date' => 'date',
];

public function supplier() { return $this->belongsTo(Supplier::class); }
public function user() { return $this->belongsTo(User::class); }
public function warehouse() { return $this->belongsTo(Warehouse::class); }
public function items() { return $this->hasMany(PurchaseItem::class); }

public function balance(): float
{
    return (float) $this->total - (float) $this->paid_amount;
}
}
