<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: Helvetica, Arial, sans-serif; }
        body { color: #101528; font-size: 11px; margin: 0; padding: 30px; }

        table.layout { width: 100%; border-collapse: collapse; }
        table.layout td { vertical-align: top; padding: 0; border: none; }

        .company-name { font-size: 18px; font-weight: bold; color: #4f46e5; }
        .company-info { font-size: 10px; color: #69708a; margin-top: 3px; line-height: 1.5; }

        .doc-box { border: 2px solid #4f46e5; border-radius: 4px; padding: 10px; text-align: center; }
        .doc-type { font-size: 11px; font-weight: bold; color: #69708a; }
        .doc-ruc { font-size: 12px; font-weight: bold; margin: 3px 0; }
        .doc-number { font-size: 15px; font-weight: bold; color: #4f46e5; }

        .divider { border-top: 2px solid #4f46e5; margin: 15px 0; }

        .info-label { font-size: 9px; text-transform: uppercase; color: #a7aecb; font-weight: bold; }
        .info-value { font-size: 11px; color: #101528; margin-top: 2px; margin-bottom: 8px; }

        table.items { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.items th { background: #4f46e5; color: white; padding: 8px; text-align: left; font-size: 10px; }
        table.items th.right { text-align: right; }
        table.items td { padding: 7px 8px; border-bottom: 1px solid #e6e9f2; font-size: 10px; }
        table.items td.right { text-align: right; }

        table.totals { width: 260px; border-collapse: collapse; }
        table.totals td { padding: 4px 0; font-size: 11px; border: none; }
        table.totals td.label { color: #69708a; }
        table.totals td.value { text-align: right; font-weight: bold; }
        table.totals tr.total-row td { border-top: 2px solid #101528; padding-top: 8px; font-size: 14px; }

        .words { margin-top: 12px; padding: 8px; background: #f8f9fc; font-size: 10px; color: #69708a; }
        .payment { margin-top: 15px; font-size: 10px; }
        .credit-note { margin-top: 15px; padding: 10px; border: 1px solid #e0483e; }
        .footer { margin-top: 35px; padding-top: 10px; border-top: 1px solid #e6e9f2; font-size: 9px; color: #a7aecb; text-align: center; }
    </style>
</head>
<body>

    {{-- ENCABEZADO --}}
    <table class="layout">
        <tr>
            <td style="width: 60%;">
                @if ($logoPath)
                    <img src="{{ $logoPath }}" style="max-height: 55px; max-width: 180px;">
                    <div class="company-info">
                        <strong>{{ $company['legal_name'] ?: $company['name'] }}</strong><br>
                        @if ($company['address']) {{ $company['address'] }}<br> @endif
                        {{ $company['phone'] }}@if($company['phone'] && $company['email']) · @endif{{ $company['email'] }}
                    </div>
                @else
                    <div class="company-name">{{ $company['name'] }}</div>
                    <div class="company-info">
                        @if ($company['legal_name']) {{ $company['legal_name'] }}<br> @endif
                        @if ($company['address']) {{ $company['address'] }}<br> @endif
                        {{ $company['phone'] }}@if($company['phone'] && $company['email']) · @endif{{ $company['email'] }}
                    </div>
                @endif
            </td>
            <td style="width: 40%;">
                <div class="doc-box">
                    <div class="doc-type">{{ $documentName }}</div>
                    @if ($company['ruc'])
                        <div class="doc-ruc">RUC {{ $company['ruc'] }}</div>
                    @endif
                    <div class="doc-number">{{ $documentNumber }}</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="divider"></div>

    {{-- DATOS DEL CLIENTE Y LA OPERACIÓN --}}
    <table class="layout">
        <tr>
            <td style="width: 50%;">
                <div class="info-label">Cliente</div>
                <div class="info-value">{{ $sale->client?->name ?? 'CLIENTE EN TIENDA' }}</div>

                <div class="info-label">{{ $sale->client?->document_type ? strtoupper($sale->client->document_type) : 'Documento' }}</div>
                <div class="info-value">{{ $sale->client?->document_number ?? '—' }}</div>

                @if ($sale->client?->address)
                    <div class="info-label">Dirección</div>
                    <div class="info-value">{{ $sale->client->address }}</div>
                @endif
            </td>
            <td style="width: 50%;">
                <div class="info-label">Fecha de emisión</div>
                <div class="info-value">{{ $sale->created_at->format('d/m/Y H:i') }}</div>

                <div class="info-label">Atendido por</div>
                <div class="info-value">
                    {{ $sale->user->name }}@if ($showSeller && $sale->user->employee_code) ({{ $sale->user->employee_code }})@endif
                </div>

                @if ($warehouse)
                    <div class="info-label">Sucursal</div>
                    <div class="info-value">{{ $warehouse }}</div>
                @endif

                <div class="info-label">Moneda</div>
                <div class="info-value">{{ $currencyName }}</div>
            </td>
        </tr>
    </table>

    {{-- DETALLE --}}
    <table class="items">
        <thead>
            <tr>
                <th style="width: 8%;">Item</th>
                <th style="width: 44%;">Descripción</th>
                <th style="width: 12%;" class="right">Cant.</th>
                <th style="width: 18%;" class="right">P. Unit.</th>
                <th style="width: 18%;" class="right">Importe</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($sale->items as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>
                        {{ $item->product->name }}
                        @if ($item->product->barcode)
                            <br><span style="color: #a7aecb; font-size: 9px;">{{ $item->product->barcode }}</span>
                        @endif
                    </td>
                    <td class="right">{{ rtrim(rtrim(number_format($item->quantity, 3), '0'), '.') }} {{ $item->product->unit_type }}</td>
                    <td class="right">{{ $currency }} {{ number_format($item->price, 2) }}</td>
                    <td class="right">{{ $currency }} {{ number_format($item->total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- TOTALES --}}
    <table class="layout" style="margin-top: 15px;">
        <tr>
            <td style="width: 58%;">
                @if ($amountInWords)
                    <div class="words">{{ $amountInWords }}</div>
                @endif

                <div class="payment">
                    <strong>Forma de pago:</strong> {{ $sale->payment_method }}<br>
                    <strong>Artículos:</strong> {{ rtrim(rtrim(number_format($sale->items->sum('quantity'), 3), '0'), '.') }}
                </div>
            </td>
            <td style="width: 42%;">
                <table class="totals">
                    <tr>
                        <td class="label">Subtotal</td>
                        <td class="value">{{ $currency }} {{ number_format($sale->subtotal, 2) }}</td>
                    </tr>
                    @if ($sale->discount > 0)
                        <tr>
                            <td class="label">Descuento</td>
                            <td class="value">-{{ $currency }} {{ number_format($sale->discount, 2) }}</td>
                        </tr>
                    @endif
                    <tr>
                        <td class="label">IGV ({{ $taxRate }}%)</td>
                        <td class="value">{{ $currency }} {{ number_format($sale->tax, 2) }}</td>
                    </tr>
                    <tr class="total-row">
                        <td class="label"><strong>TOTAL</strong></td>
                        <td class="value">{{ $currency }} {{ number_format($sale->total, 2) }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- DEVOLUCIONES --}}
    @if ($sale->creditNotes->count() > 0)
        <div class="credit-note">
            <strong style="color: #e0483e;">VENTA CON DEVOLUCIONES</strong>
            <table style="width: 100%; margin-top: 6px; font-size: 10px;">
                @foreach ($sale->creditNotes as $nc)
                    <tr>
                        <td>{{ $nc->code }} — {{ $nc->created_at->format('d/m/Y') }}</td>
                        <td style="text-align: right;">-{{ $currency }} {{ number_format($nc->total, 2) }}</td>
                    </tr>
                @endforeach
                <tr style="font-weight: bold;">
                    <td style="border-top: 1px solid #e6e9f2; padding-top: 4px;">TOTAL NETO</td>
                    <td style="border-top: 1px solid #e6e9f2; padding-top: 4px; text-align: right;">
                        {{ $currency }} {{ number_format($sale->total - $sale->creditNotes->sum('total'), 2) }}
                    </td>
                </tr>
            </table>
        </div>
    @endif

    <div class="footer">
        @if ($footerLine1) {{ $footerLine1 }}<br> @endif
        @if ($footerLine2) {{ $footerLine2 }}<br> @endif
        @if ($footerNote) {{ $footerNote }}<br> @endif
        {{ $company['name'] }} · Emitido el {{ now()->format('d/m/Y H:i') }}
    </div>

</body>
</html>