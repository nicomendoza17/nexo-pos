<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashSession extends Model
{
    protected $fillable = [
    'user_id', 'warehouse_id', 'opening_amount', 'blind_count_amount',
    'expected_amount', 'difference', 'status', 'opened_at', 'closed_at',
    'opened_ip', 'closed_ip', 'notes',
];
protected $casts = ['opened_at' => 'datetime', 'closed_at' => 'datetime'];

public function user() { return $this->belongsTo(User::class); }
public function warehouse() { return $this->belongsTo(Warehouse::class); }
public function movements() { return $this->hasMany(CashMovement::class); }
public function denominationCounts() { return $this->hasMany(CashDenominationCount::class); }

protected static function booted(): void
{
    static::deleting(fn () => throw new \RuntimeException('CashSession es inmutable.'));
}
}
