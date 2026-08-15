<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = [
        'user_id',
        'cash_session_id',
        'client_id',
        'subtotal',
        'tax',
        'discount',
        'total',
        'payment_method',
        'status',
        // TODO: Agrega aquí los campos nuevos de tu migración si los hay
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cashSession()
    {
        return $this->belongsTo(CashSession::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function creditNotes()
    {
        return $this->hasMany(CreditNote::class);
    }

    public function payments()
    {
        return $this->hasMany(SalePayment::class);
    }

    /**
     * Cantidad ya devuelta de una línea específica, considerando todas
     * las notas de crédito previas sobre esta venta.
     */
    public function returnedQuantityFor(int $saleItemId): float
    {
        return (float) CreditNoteItem::whereIn('credit_note_id', $this->creditNotes()->pluck('id'))
            ->where('sale_item_id', $saleItemId)
            ->sum('quantity');
    }

    public function totalCredited(): float
    {
        return (float) $this->creditNotes()->sum('total');
    }

    /**
     * Cuánto se pagó en efectivo en esta venta.
     * Con pago mixto puede ser solo una parte del total.
     */
    public function cashAmount(): float
    {
        return (float) $this->payments()->where('method', 'Efectivo')->sum('amount');
    }

    public function isMixedPayment(): bool
    {
        return $this->payments()->count() > 1;
    }
}