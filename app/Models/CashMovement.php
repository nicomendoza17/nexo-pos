<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashMovement extends Model
{
    protected $fillable = [
    'cash_session_id', 'user_id', 'type', 'payment_method', 'amount',
    'concept', 'reference_type', 'reference_id', 'reverses_movement_id', 'ip_address',
];
public const UPDATED_AT = null;

public function cashSession() { return $this->belongsTo(CashSession::class); }
public function user() { return $this->belongsTo(User::class); }
public function reverses() { return $this->belongsTo(self::class, 'reverses_movement_id'); }

protected static function booted(): void
{
    static::updating(fn () => throw new \RuntimeException('CashMovement es inmutable: usa un movimiento compensatorio.'));
    static::deleting(fn () => throw new \RuntimeException('CashMovement es inmutable: usa un movimiento compensatorio.'));
}
}
