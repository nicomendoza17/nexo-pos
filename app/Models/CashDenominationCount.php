<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashDenominationCount extends Model
{
    protected $fillable = ['cash_session_id', 'moment', 'denomination', 'quantity', 'subtotal'];

public function cashSession() { return $this->belongsTo(CashSession::class); }
}
