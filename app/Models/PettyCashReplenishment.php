<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PettyCashReplenishment extends Model
{
    protected $fillable = ['petty_cash_fund_id', 'approved_by', 'amount', 'notes'];
public const UPDATED_AT = null;

public function fund() { return $this->belongsTo(PettyCashFund::class, 'petty_cash_fund_id'); }
public function approver() { return $this->belongsTo(User::class, 'approved_by'); }
}
