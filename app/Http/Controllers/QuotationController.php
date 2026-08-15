<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

use Barryvdh\DomPDF\Facade\Pdf;
use App\Mail\QuotationMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use App\Services\AuditService;
use App\Services\SettingsService;


class QuotationController extends Controller
{
    public function index(Request $request)
    {
        // Marca vencidas automáticamente antes de listar
        Quotation::where('status', 'enviada')
            ->orWhere('status', 'borrador')
            ->get()
            ->each(function ($q) {
                if ($q->isExpired()) {
                    $q->update(['status' => 'vencida']);
                }
            });

        $quotations = Quotation::with(['client', 'user'])
            ->orderByDesc('created_at')
            ->paginate(15)
            ->through(fn($q) => [
                'id' => $q->id,
                'code' => $q->code,
                'client' => $q->client->name,
                'user' => $q->user->name,
                'issue_date' => $q->issue_date->format('Y-m-d'),
                'valid_until' => $q->valid_until->format('Y-m-d'),
                'total' => (float) $q->total,
                'currency' => $q->currency,
                'status' => $q->status,
                'converted_sale_id' => $q->converted_sale_id,
            ]);

        return Inertia::render('Quotations/Index', ['quotations' => $quotations]);
    }

    public function create()
    {
        $clients = Client::orderBy('name')->get(['id', 'name', 'document_number']);
        $products = Product::where('is_active', true)->with('category')->orderBy('name')
            ->get(['id', 'name', 'price', 'stock', 'unit_type', 'category_id']);

        return Inertia::render('Quotations/Create', [
            'clients' => $clients,
            'products' => $products,
            'nextCode' => Quotation::nextCode(),
            'defaultValidityDays' => (int) SettingsService::get('quotation_validity_days', 15),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'issue_date' => 'required|date',
            'valid_until' => 'required|date|after_or_equal:issue_date',
            'currency' => 'required|in:PEN,USD',
            'exchange_rate' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:100',
            'delivery_time' => 'nullable|string|max:100',
            'delivery_place' => 'nullable|string|max:255',
            'discount_percent' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
        ]);

        $quotation = DB::transaction(function () use ($validated, $request) {
            $subtotal = 0;
            $itemsData = [];

            foreach ($validated['items'] as $item) {
                $lineGross = $item['quantity'] * $item['unit_price'];
                $lineDiscount = ($lineGross * (($item['discount_percent'] ?? 0) / 100)) + ($item['discount_amount'] ?? 0);
                $lineTotal = $lineGross - $lineDiscount;
                $subtotal += $lineTotal;

                $itemsData[] = [
                    'product_id' => $item['product_id'],
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_percent' => $item['discount_percent'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'total' => $lineTotal,
                ];
            }

            $globalDiscount = ($subtotal * (($validated['discount_percent'] ?? 0) / 100)) + ($validated['discount_amount'] ?? 0);
            $amounts = SettingsService::breakdown($subtotal - $globalDiscount);

            $quotation = Quotation::create([
                'code' => Quotation::nextCode(),
                'client_id' => $validated['client_id'],
                'user_id' => $request->user()->id,
                'issue_date' => $validated['issue_date'],
                'valid_until' => $validated['valid_until'],
                'currency' => $validated['currency'],
                'exchange_rate' => $validated['exchange_rate'] ?? null,
                'payment_terms' => $validated['payment_terms'] ?? null,
                'delivery_time' => $validated['delivery_time'] ?? null,
                'delivery_place' => $validated['delivery_place'] ?? null,
                'discount_percent' => $validated['discount_percent'] ?? 0,
                'discount_amount' => $validated['discount_amount'] ?? 0,
                'subtotal' => $amounts['subtotal'],
                'tax' => $amounts['tax'],
                'total' => $amounts['total'],
                'status' => 'borrador',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($itemsData as $data) {
                QuotationItem::create(['quotation_id' => $quotation->id, ...$data]);
            }

            return $quotation;
        });

        $quotation->load('client');

        AuditService::log('cotizacion.crear', "Creó la cotización {$quotation->code} para {$quotation->client->name} por S/ " . number_format($quotation->total, 2), $quotation);

        return redirect()->route('quotations.index')->with('success', 'Cotización creada');
    }

    public function show(Quotation $quotation)
    {
        $quotation->load(['client', 'user', 'items.product']);

        return Inertia::render('Quotations/Show', [
            'quotation' => [
                'id' => $quotation->id,
                'code' => $quotation->code,
                'client' => $quotation->client,
                'user' => $quotation->user->name,
                'issue_date' => $quotation->issue_date->format('Y-m-d'),
                'valid_until' => $quotation->valid_until->format('Y-m-d'),
                'currency' => $quotation->currency,
                'exchange_rate' => $quotation->exchange_rate ? (float) $quotation->exchange_rate : null,
                'payment_terms' => $quotation->payment_terms,
                'delivery_time' => $quotation->delivery_time,
                'delivery_place' => $quotation->delivery_place,
                'discount_percent' => (float) $quotation->discount_percent,
                'discount_amount' => (float) $quotation->discount_amount,
                'subtotal' => (float) $quotation->subtotal,
                'tax' => (float) $quotation->tax,
                'total' => (float) $quotation->total,
                'status' => $quotation->status,
                'notes' => $quotation->notes,
                'converted_sale_id' => $quotation->converted_sale_id,
                'is_expired' => $quotation->isExpired(),
                'items' => $quotation->items->map(fn($i) => [
                    'id' => $i->id,
                    'product' => $i->product->name,
                    'description' => $i->description,
                    'quantity' => (float) $i->quantity,
                    'unit_price' => (float) $i->unit_price,
                    'discount_percent' => (float) $i->discount_percent,
                    'discount_amount' => (float) $i->discount_amount,
                    'total' => (float) $i->total,
                ]),
            ],
        ]);
    }

    public function updateStatus(Request $request, Quotation $quotation)
    {
        $validated = $request->validate([
            'status' => 'required|in:enviada,aceptada,rechazada',
        ]);

        $quotation->update(['status' => $validated['status']]);

        AuditService::log('cotizacion.estado', "Cambió el estado de la cotización {$quotation->code} a '{$validated['status']}'", $quotation);

        return back()->with('success', 'Estado actualizado');
    }

    /**
     * Convierte la cotización en una venta real, sin volver a digitar nada.
     */
    public function convert(Request $request, Quotation $quotation)
    {
        if ($quotation->converted_sale_id) {
            return back()->with('error', 'Esta cotización ya fue convertida');
        }

        if ($quotation->status !== 'aceptada') {
            return back()->with('error', 'Solo puedes convertir cotizaciones aceptadas');
        }

        $validated = $request->validate([
            'payment_method' => 'required|string',
        ]);

        $sale = DB::transaction(function () use ($quotation, $validated, $request) {
            // Buscamos la sesión de caja abierta del usuario
            $openSession = \App\Models\CashSession::where('user_id', $request->user()->id)
                ->where('status', 'abierta')
                ->first();

            // Si hay caja abierta usamos su sucursal, de lo contrario la por defecto
            $warehouseId = $openSession?->warehouse_id ?? \App\Models\Warehouse::defaultId();

            $sale = Sale::create([
                'user_id' => $request->user()->id,
                'cash_session_id' => $openSession?->id, // Vinculamos la sesión de caja
                'client_id' => $quotation->client_id,
                'subtotal' => $quotation->subtotal,
                'tax' => $quotation->tax,
                'discount' => $quotation->discount_amount,
                'total' => $quotation->total,
                'payment_method' => $validated['payment_method'],
                'status' => 'completed',
            ]);

            foreach ($quotation->items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item->product_id);

                // Validamos el stock disponible en la sucursal específica
                if ($product->stockIn($warehouseId) < $item->quantity) {
                    throw new \Exception("Stock insuficiente para {$product->name} en la sucursal seleccionada");
                }

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'quantity' => $item->quantity,
                    'price' => $item->unit_price,
                    'total' => $item->total,
                ]);

                // Descontamos el stock de la sucursal correspondiente
                StockService::move(
                    product: $product,
                    type: 'venta',
                    quantity: (float) $item->quantity,
                    referenceType: Sale::class,
                    referenceId: $sale->id,
                    warehouseId: $warehouseId,
                );
            }

            $quotation->update(['converted_sale_id' => $sale->id, 'converted_at' => now()]);

            return $sale;
        });

        AuditService::log('cotizacion.convertir', "Convirtió {$quotation->code} en la venta #{$sale->id}", $quotation, [
            'venta_generada' => $sale->id,
            'total' => (float) $quotation->total,
        ]);

        return redirect()->route('sales.index')->with('success', "Cotización convertida en Venta #{$sale->id}");
    }
    private function buildPdf(Quotation $quotation)
    {
        $quotation->load(['client', 'user', 'items.product']);

        $paymentLabels = [
            'contado' => 'Al contado',
            'credito_15' => 'Crédito a 15 días',
            'credito_30' => 'Crédito a 30 días',
            'adelanto_50' => '50% adelanto',
        ];

        $company = \App\Services\SettingsService::company();

        // dompdf necesita la ruta absoluta del archivo, no una URL pública
        $logoPath = $company['logo_path']
            ? storage_path('app/public/' . $company['logo_path'])
            : null;

        return Pdf::loadView('pdf.quotation', [
            'quotation' => $quotation,
            'company' => $company,
            'logoPath' => $logoPath && file_exists($logoPath) ? $logoPath : null,
            'footerText' => \App\Services\SettingsService::get('quotation_footer'),
            'currencySymbol' => $quotation->currency === 'USD'
                ? '$'
                : \App\Services\SettingsService::currency(),
            'paymentTermsLabel' => $paymentLabels[$quotation->payment_terms] ?? $quotation->payment_terms ?? 'No especificado',
        ])->setPaper('a4');
    }

    public function downloadPdf(Quotation $quotation)
    {
        return $this->buildPdf($quotation)->download("{$quotation->code}.pdf");
    }

    /**
     * Vista pública firmada del PDF — para compartir por WhatsApp sin requerir login.
     * El enlace expira junto con la validez de la cotización.
     */
    public function publicPdf(Quotation $quotation)
    {
        return $this->buildPdf($quotation)->stream("{$quotation->code}.pdf");
    }

    public function shareLink(Quotation $quotation)
    {
        $url = URL::temporarySignedRoute(
            'quotations.public-pdf',
            $quotation->valid_until->endOfDay(),
            ['quotation' => $quotation->id]
        );

        return response()->json(['url' => $url]);
    }

    public function sendEmail(Request $request, Quotation $quotation)
    {
        $validated = $request->validate([
            'email' => 'nullable|email',
        ]);

        $quotation->load(['client', 'user', 'items.product']);
        $to = $validated['email'] ?? $quotation->client->email;

        if (!$to) {
            return back()->with('error', 'El cliente no tiene correo registrado. Ingresa uno manualmente.');
        }

        $pdfContent = $this->buildPdf($quotation)->output();

        Mail::to($to)->send(new QuotationMail($quotation, $pdfContent));

        return back()->with('success', "Cotización enviada a {$to}");
    }
}
