<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    protected $fillable = [
    'code', 'client_id', 'user_id', 'issue_date', 'valid_until', 'currency',
    'exchange_rate', 'payment_terms', 'delivery_time', 'delivery_place',
    'discount_percent', 'discount_amount', 'subtotal', 'tax', 'total',
    'status', 'notes', 'converted_sale_id', 'converted_at',
];
protected $casts = ['issue_date' => 'date', 'valid_until' => 'date', 'converted_at' => 'datetime'];

public function client() { return $this->belongsTo(Client::class); }
public function user() { return $this->belongsTo(User::class); }
public function items() { return $this->hasMany(QuotationItem::class); }
public function convertedSale() { return $this->belongsTo(Sale::class, 'converted_sale_id'); }

public function isExpired(): bool
{
    return $this->status !== 'aceptada' && $this->status !== 'rechazada' && $this->valid_until->isPast();
}

public static function nextCode(): string
{
    $last = self::orderByDesc('id')->first();
    $next = $last ? ((int) substr($last->code, 4)) + 1 : 1;
    return 'COT-' . str_pad($next, 6, '0', STR_PAD_LEFT);
}
}
