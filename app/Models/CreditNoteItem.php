<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CreditNoteItem extends Model
{
    protected $fillable = [
    'credit_note_id', 'sale_item_id', 'product_id', 'quantity', 'unit_price', 'total', 'restock',
];
protected $casts = ['restock' => 'boolean'];

public function creditNote() { return $this->belongsTo(CreditNote::class); }
public function saleItem() { return $this->belongsTo(SaleItem::class); }
public function product() { return $this->belongsTo(Product::class); }
}
