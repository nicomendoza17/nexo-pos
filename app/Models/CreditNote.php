<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CreditNote extends Model
{
    protected $fillable = [
    'code', 'sale_id', 'user_id', 'cash_session_id', 'type', 'reason',
    'subtotal', 'tax', 'total', 'refund_method', 'ip_address',
];
public const UPDATED_AT = null;

public function sale() { return $this->belongsTo(Sale::class); }
public function user() { return $this->belongsTo(User::class); }
public function cashSession() { return $this->belongsTo(CashSession::class); }
public function items() { return $this->hasMany(CreditNoteItem::class); }

public static function nextCode(): string
{
    $last = self::orderByDesc('id')->first();
    $next = $last ? ((int) substr($last->code, 3)) + 1 : 1;
    return 'NC-' . str_pad($next, 6, '0', STR_PAD_LEFT);
}

protected static function booted(): void
{
    static::updating(fn () => throw new \RuntimeException('Una nota de crédito es inmutable.'));
    static::deleting(fn () => throw new \RuntimeException('Una nota de crédito es inmutable.'));
}
}
