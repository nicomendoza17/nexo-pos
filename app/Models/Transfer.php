<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transfer extends Model
{
    protected $fillable = [
        'code', 'from_warehouse_id', 'to_warehouse_id', 'created_by',
        'dispatched_by', 'received_by', 'status', 'notes', 'reception_notes',
        'dispatched_at', 'received_at',
    ];

    protected $casts = [
        'dispatched_at' => 'datetime',
        'received_at' => 'datetime',
    ];

    public function fromWarehouse() { return $this->belongsTo(Warehouse::class, 'from_warehouse_id'); }
    public function toWarehouse() { return $this->belongsTo(Warehouse::class, 'to_warehouse_id'); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function dispatcher() { return $this->belongsTo(User::class, 'dispatched_by'); }
    public function receiver() { return $this->belongsTo(User::class, 'received_by'); }
    public function items() { return $this->hasMany(TransferItem::class); }

    public static function nextCode(): string
    {
        $last = self::orderByDesc('id')->first();
        $next = $last ? ((int) substr($last->code, 3)) + 1 : 1;
        return 'TR-' . str_pad($next, 6, '0', STR_PAD_LEFT);
    }

    public function totalValue(): float
    {
        return (float) $this->items->sum(fn ($i) => (float) $i->quantity_sent * (float) ($i->unit_cost ?? 0));
    }

    public function hasDiscrepancies(): bool
    {
        return $this->items->contains(fn ($i) =>
            $i->quantity_received !== null && abs((float) $i->quantity_received - (float) $i->quantity_sent) > 0.0001
        );
    }
}