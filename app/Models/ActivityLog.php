<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'authorized_by', 'action', 'module', 'severity',
        'description', 'subject_type', 'subject_id', 'metadata',
        'ip_address', 'user_agent',
    ];

    protected $casts = ['metadata' => 'array'];

    public function user() { return $this->belongsTo(User::class); }
    public function authorizer() { return $this->belongsTo(User::class, 'authorized_by'); }

    /**
     * Enlace directo al documento afectado, para saltar desde el log al origen.
     */
    public function subjectUrl(): ?string
    {
        if (!$this->subject_type || !$this->subject_id) return null;

        return match ($this->subject_type) {
            Sale::class => route('sales.show', $this->subject_id),
            Product::class => route('inventory.index') . '?search=' . $this->subject_id,
            CreditNote::class => route('credit-notes.show', $this->subject_id),
            Purchase::class => route('purchases.index'),
            Quotation::class => route('quotations.show', $this->subject_id),
            CashSession::class => route('cash-sessions.index'),
            User::class => route('users.index'),
            default => null,
        };
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \RuntimeException('Los logs de actividad son inmutables.'));
        static::deleting(fn () => throw new \RuntimeException('Los logs de actividad son inmutables.'));
    }
}