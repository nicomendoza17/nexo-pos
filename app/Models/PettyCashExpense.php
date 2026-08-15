<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PettyCashExpense extends Model
{
   protected $fillable = [
    'petty_cash_fund_id', 'user_id', 'amount', 'concept', 'category',
    'receipt_type', 'receipt_ruc', 'receipt_number', 'reverses_expense_id',
];
public const UPDATED_AT = null;

public function fund() { return $this->belongsTo(PettyCashFund::class, 'petty_cash_fund_id'); }
public function user() { return $this->belongsTo(User::class); }

protected static function booted(): void
{
    static::updating(fn () => throw new \RuntimeException('PettyCashExpense es inmutable.'));
    static::deleting(fn () => throw new \RuntimeException('PettyCashExpense es inmutable.'));
}
}
