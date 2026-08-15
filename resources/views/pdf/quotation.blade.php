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
        .doc-title { font-size: 16px; font-weight: bold; color: #101528; }
        .doc-code { font-size: 13px; color: #4f46e5; font-weight: bold; margin-top: 2px; }
        .doc-dates { font-size: 10px; color: #69708a; margin-top: 4px; }
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

        .conditions { margin-top: 20px; }
        .conditions-title { font-size: 11px; font-weight: bold; color: #101528; margin-bottom: 5px; }
        .conditions-item { font-size: 10px; color: #69708a; margin-bottom: 3px; }
        .notes { margin-top: 15px; padding: 10px; background: #f8f9fc; font-size: 10px; color: #69708a; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e6e9f2; font-size: 9px; color: #a7aecb; text-align: center; }
    </style>
</head>
<body>

    {{-- ENCABEZADO --}}
    <table class="layout">
        <tr>
            <td style="width: 58%;">
                @if ($logoPath)
                    <img src="{{ $logoPath }}" style="max-height: 55px; max-width: 180px;">
                    <div class="company-info">
                        <strong>{{ $company['legal_name'] ?: $company['name'] }}</strong><br>
                        @if ($company['ruc']) RUC: {{ $company['ruc'] }}<br> @endif
                        @if ($company['address']) {{ $company['address'] }}<br> @endif
                        {{ $company['phone'] }}@if($company['phone'] && $company['email']) · @endif{{ $company['email'] }}
                    </div>
                @else
                    <div class="company-name">{{ $company['name'] }}</div>
                    <div class="company-info">
                        @if ($company['legal_name']) {{ $company['legal_name'] }}<br> @endif
                        @if ($company['ruc']) RUC: {{ $company['ruc'] }}<br> @endif
                        @if ($company['address']) {{ $company['address'] }}<br> @endif
                        {{ $company['phone'] }}@if($company['phone'] && $company['email']) · @endif{{ $company['email'] }}
                    </div>
                @endif
            </td>
            <td style="width: 42%; text-align: right;">
                <div class="doc-title">COTIZACIÓN</div>
                <div class="doc-code">{{ $quotation->code }}</div>
                <div class="doc-dates">
                    Emisión: {{ $quotation->issue_date->format('d/m/Y') }}<br>
                    Válida hasta: {{ $quotation->valid_until->format('d/m/Y') }}
                </div>
            </td>
        </tr>
    </table>

    <div class="divider"></div>

    {{-- DATOS DEL CLIENTE Y VENDEDOR --}}
    <table class="layout">
        <tr>
            <td style="width: 50%;">
                <div class="info-label">Cliente</div>
                <div class="info-value">{{ $quotation->client->name }}</div>
                <div class="info-label">Documento</div>
                <div class="info-value">{{ $quotation->client->document_number ?? '—' }}</div>
                @if ($quotation->client->address)
                    <div class="info-label">Dirección</div>
                    <div class="info-value">{{ $quotation->client->address }}</div>
                @endif
            </td>
            <td style="width: 50%;">
                <div class="info-label">Vendedor</div>
                <div class="info-value">{{ $quotation->user->name }}</div>
                <div class="info-label">Moneda</div>
                <div class="info-value">{{ $quotation->currency === 'USD' ? 'Dólares (USD)' : 'Soles (PEN)' }}</div>
                @if ($quotation->exchange_rate)
                    <div class="info-label">Tipo de cambio</div>
                    <div class="info-value">{{ number_format($quotation->exchange_rate, 4) }}</div>
                @endif
            </td>
        </tr>
    </table>

    {{-- DETALLE DE PRODUCTOS --}}
    <table class="items">
        <thead>
            <tr>
                <th>Producto</th>
                <th class="right">Cant.</th>
                <th class="right">P. Unit.</th>
                <th class="right">Desc.</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($quotation->items as $item)
                <tr>
                    <td>{{ $item->description ?: $item->product->name }}</td>
                    <td class="right">{{ rtrim(rtrim(number_format($item->quantity, 3), '0'), '.') }}</td>
                    <td class="right">{{ $currencySymbol }} {{ number_format($item->unit_price, 2) }}</td>
                    <td class="right">
                        @if ($item->discount_percent > 0 || $item->discount_amount > 0)
                            {{ rtrim(rtrim(number_format($item->discount_percent, 2), '0'), '.') }}%
                            @if ($item->discount_amount > 0)
                                + {{ $currencySymbol }} {{ number_format($item->discount_amount, 2) }}
                            @endif
                        @else
                            —
                        @endif
                    </td>
                    <td class="right">{{ $currencySymbol }} {{ number_format($item->total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- TOTALES --}}
    <table class="layout" style="margin-top: 15px;">
        <tr>
            <td style="width: 60%;"></td>
            <td style="width: 40%;">
                <table class="totals">
                    <tr>
                        <td class="label">Subtotal</td>
                        <td class="value">{{ $currencySymbol }} {{ number_format($quotation->subtotal, 2) }}</td>
                    </tr>
                    @if ($quotation->discount_percent > 0 || $quotation->discount_amount > 0)
                        <tr>
                            <td class="label">Descuento global</td>
                            <td class="value">
                                {{ rtrim(rtrim(number_format($quotation->discount_percent, 2), '0'), '.') }}%
                                @if ($quotation->discount_amount > 0)
                                    + {{ $currencySymbol }} {{ number_format($quotation->discount_amount, 2) }}
                                @endif
                            </td>
                        </tr>
                    @endif
                    <tr>
                        <td class="label">IGV</td>
                        <td class="value">{{ $currencySymbol }} {{ number_format($quotation->tax, 2) }}</td>
                    </tr>
                    <tr class="total-row">
                        <td class="label"><strong>TOTAL</strong></td>
                        <td class="value">{{ $currencySymbol }} {{ number_format($quotation->total, 2) }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- CONDICIONES COMERCIALES --}}
    <div class="conditions">
        <div class="conditions-title">Condiciones comerciales</div>
        <div class="conditions-item"><strong>Términos de pago:</strong> {{ $paymentTermsLabel }}</div>
        @if ($quotation->delivery_time)
            <div class="conditions-item"><strong>Tiempo de entrega:</strong> {{ $quotation->delivery_time }}</div>
        @endif
        @if ($quotation->delivery_place)
            <div class="conditions-item"><strong>Lugar de entrega:</strong> {{ $quotation->delivery_place }}</div>
        @endif
    </div>

    @if ($quotation->notes)
        <div class="notes">
            <strong>Notas:</strong> {{ $quotation->notes }}
        </div>
    @endif

    <div class="footer">
        @if ($footerText)
            {{ $footerText }}<br>
        @endif
        Esta cotización tiene una validez hasta el {{ $quotation->valid_until->format('d/m/Y') }}. Precios sujetos a cambio después de esta fecha.<br>
        {{ $company['name'] }} · Generado el {{ now()->format('d/m/Y H:i') }}
    </div>

</body>
</html>