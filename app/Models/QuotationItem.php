<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationItem extends Model
{
    protected $fillable = [
        'quotation_id',
        'product_id',
        'description',
        'quantity',
        'unit_price',
        'discount_percent',
        'discount_amount',
        'total',
    ];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
