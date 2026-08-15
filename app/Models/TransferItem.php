<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransferItem extends Model
{
    protected $fillable = [
        'transfer_id', 'product_id', 'quantity_sent',
        'quantity_received', 'unit_cost', 'discrepancy_reason',
    ];

    protected $casts = [
        'quantity_sent' => 'decimal:3',
        'quantity_received' => 'decimal:3',
        'unit_cost' => 'decimal:4',
    ];

    public function transfer() { return $this->belongsTo(Transfer::class); }
    public function product() { return $this->belongsTo(Product::class); }

    public function difference(): float
    {
        if ($this->quantity_received === null) return 0;
        return (float) $this->quantity_received - (float) $this->quantity_sent;
    }
}