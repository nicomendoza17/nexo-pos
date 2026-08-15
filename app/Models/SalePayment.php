<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalePayment extends Model
{
    protected $fillable = ['sale_id', 'method', 'amount', 'received', 'change', 'reference'];

    protected $casts = [
        'amount' => 'decimal:2',
        'received' => 'decimal:2',
        'change' => 'decimal:2',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}