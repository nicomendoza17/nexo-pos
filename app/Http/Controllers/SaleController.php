<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Services\SettingsService;
use App\Services\NumberToWords;

class SaleController extends Controller
{
    public function index()
    {
        $sales = Sale::with(['items.product', 'user', 'client'])
            ->orderByDesc('created_at')
            ->paginate(15);

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
        ]);
    }
    public function show(Sale $sale)
    {
        $sale->load(['items.product', 'client', 'user', 'creditNotes']);

        return Inertia::render('Sales/Show', [
            'sale' => [
                'id' => $sale->id,
                'client' => $sale->client?->name ?? 'Cliente general',
                'user' => $sale->user->name,
                'payment_method' => $sale->payment_method,
                'subtotal' => (float) $sale->subtotal,
                'tax' => (float) $sale->tax,
                'discount' => (float) $sale->discount,
                'total' => (float) $sale->total,
                'status' => $sale->status,
                'created_at' => $sale->created_at,
                'total_credited' => $sale->totalCredited(),
                'items' => $sale->items->map(fn($i) => [
                    'id' => $i->id,
                    'product' => $i->product->name,
                    'quantity' => (float) $i->quantity,
                    'price' => (float) $i->price,
                    'total' => (float) $i->total,
                    'returned' => $sale->returnedQuantityFor($i->id),
                ]),
                'credit_notes' => $sale->creditNotes->map(fn($n) => [
                    'id' => $n->id,
                    'code' => $n->code,
                    'type' => $n->type,
                    'total' => (float) $n->total,
                    'created_at' => $n->created_at,
                ]),
            ],
        ]);
    }
    /**
     * Datos comunes a ambos formatos de comprobante.
     */
    private function receiptData(Sale $sale): array
    {
        $sale->load(['items.product', 'client', 'user', 'creditNotes', 'cashSession.warehouse', 'payments']);

        $company = SettingsService::company();

        // dompdf necesita la ruta absoluta del archivo, no una URL
        $logoPath = null;
        if ($company['logo_path']) {
            $candidate = storage_path('app/public/' . $company['logo_path']);
            $logoPath = file_exists($candidate) ? $candidate : null;
        }

        $currencyName = SettingsService::get('currency_code') === 'USD' ? 'DÓLARES' : 'SOLES';

        return [
            'sale' => $sale,
            'company' => $company,
            'logoPath' => $logoPath,
            'currency' => SettingsService::currency(),
            'currencyName' => $currencyName,
            'taxRate' => SettingsService::get('tax_rate'),
            'documentName' => strtoupper(SettingsService::get('ticket_document_name', 'NOTA DE VENTA')),
            'documentNumber' => SettingsService::get('ticket_series', 'NV01') . '-' . str_pad($sale->id, 6, '0', STR_PAD_LEFT),
            'warehouse' => $sale->cashSession?->warehouse?->name,
            'showSeller' => SettingsService::get('ticket_show_seller', true),
            'showPaymentDetail' => SettingsService::get('ticket_show_payment_detail', true),
            'showBarcode' => SettingsService::get('ticket_show_barcode', true),
            'amountInWords' => SettingsService::get('ticket_show_amount_in_words', true)
                ? NumberToWords::currency((float) $sale->total, $currencyName)
                : null,
            'footerLine1' => SettingsService::get('ticket_footer_line1'),
            'footerLine2' => SettingsService::get('ticket_footer_line2'),
            'footerNote' => SettingsService::get('ticket_footer_note'),
        ];
    }

    /**
     * Ticket para impresora térmica (papel continuo de 58 u 80 mm).
     */
    public function ticket(Sale $sale)
    {
        $data = $this->receiptData($sale);

        // Copias configurables, cada una con su etiqueta
        $copiesCount = max(1, (int) SettingsService::get('ticket_copies', 1));
        $labels = array_map('trim', explode(',', SettingsService::get('ticket_copy_labels', '')));

        $copies = [];
        for ($i = 0; $i < $copiesCount; $i++) {
            $copies[] = $labels[$i] ?? ($copiesCount > 1 ? 'COPIA ' . ($i + 1) : '');
        }

        // El logo en ticket es opcional aparte del de la empresa
        if (!SettingsService::get('ticket_show_logo')) {
            $data['logoPath'] = null;
        }

        // Ancho configurable: 1 mm = 2.8346 puntos
        $widthMm = (float) SettingsService::get('ticket_paper_width', 80);
        $widthPt = $widthMm * 2.8346;

        // Alto dinámico según la cantidad de líneas, para no dejar papel en blanco
        $height = 560                                    // encabezado, datos, totales y pie
            + ($sale->items->count() * 22)               // cada línea de producto
            + ($sale->creditNotes->count() * 18)
            + ($data['logoPath'] ? 60 : 0)
            + ($data['amountInWords'] ? 30 : 0);

        return Pdf::loadView('pdf.ticket', [...$data, 'copies' => $copies])
            ->setPaper([0, 0, $widthPt, $height])
            ->stream("ticket-{$sale->id}.pdf");
    }

    /**
     * Boleta en formato A4, para clientes que la solicitan impresa.
     */
    public function receipt(Sale $sale)
    {
        return Pdf::loadView('pdf.receipt', $this->receiptData($sale))
            ->setPaper('a4')
            ->stream("boleta-{$sale->id}.pdf");
    }
}
