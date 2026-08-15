<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PettyCashFund extends Model
{
    protected $fillable = ['name', 'custodian_id', 'fixed_amount', 'current_balance', 'status'];

public function custodian() { return $this->belongsTo(User::class, 'custodian_id'); }
public function expenses() { return $this->hasMany(PettyCashExpense::class); }
public function replenishments() { return $this->hasMany(PettyCashReplenishment::class); }

public function spentSinceLastReplenishment(): float
{
    $lastReplenishment = $this->replenishments()->latest('created_at')->first();
    return (float) $this->expenses()
        ->when($lastReplenishment, fn ($q) => $q->where('created_at', '>', $lastReplenishment->created_at))
        ->sum('amount');
}
}
