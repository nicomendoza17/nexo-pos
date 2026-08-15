<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 0; }
        * { font-family: 'DejaVu Sans Mono', monospace; }
        body { margin: 0; padding: 3mm 2.5mm; font-size: 8.5px; color: #000; line-height: 1.3; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .big { font-size: 11px; font-weight: bold; }
        .huge { font-size: 13px; font-weight: bold; }
        .sep { border-top: 1px dashed #000; margin: 4px 0; }
        .solid { border-top: 1px solid #000; margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 0.5px 0; vertical-align: top; }
        .copy-label { font-size: 8px; letter-spacing: 1px; }
        .page-break { page-break-after: always; }
        .logo { max-width: 40mm; max-height: 15mm; margin-bottom: 3px; }
    </style>
</head>
<body>

@foreach ($copies as $copyIndex => $copyLabel)

    {{-- ENCABEZADO --}}
    <div class="center">
        @if ($logoPath)
            <img src="{{ $logoPath }}" class="logo">
        @endif
        <div class="big">{{ $company['name'] }}</div>
        @if ($company['legal_name'] && $company['legal_name'] !== $company['name'])
            <div>{{ $company['legal_name'] }}</div>
        @endif
        @if ($company['ruc'])
            <div>RUC {{ $company['ruc'] }}</div>
        @endif
        @if ($company['address'])
            <div>{{ $company['address'] }}</div>
        @endif
        @if ($company['phone'])
            <div>Telf.: {{ $company['phone'] }}</div>
        @endif
        @if ($company['email'])
            <div>{{ $company['email'] }}</div>
        @endif
    </div>

    <div class="sep"></div>

    {{-- TIPO Y NÚMERO DE DOCUMENTO --}}
    <div class="center">
        <div class="bold">{{ $documentName }}</div>
        <div class="huge">{{ $documentNumber }}</div>
        @if ($copyLabel)
            <div class="copy-label">— {{ $copyLabel }} —</div>
        @endif
    </div>

    <div class="sep"></div>

    {{-- DATOS DE LA OPERACIÓN --}}
    <table>
        <tr>
            <td>F.Emisión</td>
            <td class="right">{{ $sale->created_at->format('d/m/Y H:i') }}</td>
        </tr>
        <tr>
            <td>Cajero(a)</td>
            <td class="right">{{ $sale->user->name }}</td>
        </tr>
        @if ($showSeller && $sale->user->employee_code)
            <tr>
                <td>Vendedor(a)</td>
                <td class="right">{{ $sale->user->employee_code }}</td>
            </tr>
        @endif
        @if ($warehouse)
            <tr>
                <td>Sucursal</td>
                <td class="right">{{ $warehouse }}</td>
            </tr>
        @endif
        <tr>
            <td>Moneda</td>
            <td class="right">{{ $currencyName }}</td>
        </tr>
    </table>

    <div class="sep"></div>

    {{-- CLIENTE --}}
    <table>
        <tr>
            <td>Cliente</td>
            <td class="right">{{ $sale->client?->name ?? 'CLIENTE EN TIENDA' }}</td>
        </tr>
        <tr>
            <td>{{ $sale->client?->document_type ? strtoupper($sale->client->document_type) : 'SIN DOC.' }}</td>
            <td class="right">{{ $sale->client?->document_number ?? '00000000' }}</td>
        </tr>
        @if ($sale->client?->address)
            <tr>
                <td>Dirección</td>
                <td class="right">{{ \Illuminate\Support\Str::limit($sale->client->address, 24) }}</td>
            </tr>
        @endif
    </table>

    <div class="sep"></div>

    {{-- DETALLE --}}
    <table>
        <tr class="bold">
            <td style="width: 16%;">Cant</td>
            <td style="width: 44%;">Descripción</td>
            <td style="width: 18%;" class="right">P.Unit</td>
            <td style="width: 22%;" class="right">Importe</td>
        </tr>
    </table>
    <div class="solid"></div>

    <table>
        @foreach ($sale->items as $item)
            <tr>
                <td style="width: 16%;">{{ rtrim(rtrim(number_format($item->quantity, 3), '0'), '.') }}</td>
                <td style="width: 44%;">{{ \Illuminate\Support\Str::limit(strtoupper($item->product->name), 20) }}</td>
                <td style="width: 18%;" class="right">{{ number_format($item->price, 2) }}</td>
                <td style="width: 22%;" class="right">{{ number_format($item->total, 2) }}</td>
            </tr>
        @endforeach
    </table>

    <div class="sep"></div>

    {{-- TOTALES --}}
    <table>
        <tr>
            <td>Subtotal</td>
            <td class="right">{{ $currency }} {{ number_format($sale->subtotal, 2) }}</td>
        </tr>
        <tr>
            <td>IGV ({{ $taxRate }}%)</td>
            <td class="right">{{ $currency }} {{ number_format($sale->tax, 2) }}</td>
        </tr>
        @if ($sale->discount > 0)
            <tr>
                <td>Descuento</td>
                <td class="right">-{{ $currency }} {{ number_format($sale->discount, 2) }}</td>
            </tr>
        @endif
    </table>

    <div class="solid"></div>

    <table>
        <tr class="huge">
            <td>TOTAL A PAGAR</td>
            <td class="right">{{ $currency }} {{ number_format($sale->total, 2) }}</td>
        </tr>
    </table>

    @if ($amountInWords)
        <div class="sep"></div>
        <div style="font-size: 8px;">{{ $amountInWords }}</div>
    @endif

    <div class="sep"></div>

    {{-- FORMA DE PAGO --}}
    <table>
    @if ($sale->payments->count() > 1)
        <tr class="bold">
            <td colspan="2">FORMAS DE PAGO</td>
        </tr>
        @foreach ($sale->payments as $p)
            <tr>
                <td>{{ strtoupper($p->method) }}</td>
                <td class="right">{{ $currency }} {{ number_format($p->amount, 2) }}</td>
            </tr>
            @if ($p->reference)
                <tr><td colspan="2" style="font-size: 8px;">Ref: {{ $p->reference }}</td></tr>
            @endif
        @endforeach
    @else
        @php $p = $sale->payments->first(); @endphp
        <tr>
            <td>Forma de pago</td>
            <td class="right bold">{{ strtoupper($p?->method ?? $sale->payment_method) }}</td>
        </tr>
        @if ($showPaymentDetail && $p && $p->method === 'Efectivo' && $p->received)
            <tr>
                <td>Recibido</td>
                <td class="right">{{ $currency }} {{ number_format($p->received, 2) }}</td>
            </tr>
            <tr>
                <td>Vuelto</td>
                <td class="right">{{ $currency }} {{ number_format($p->change, 2) }}</td>
            </tr>
        @endif
    @endif
    <tr>
        <td>Artículos</td>
        <td class="right">{{ rtrim(rtrim(number_format($sale->items->sum('quantity'), 3), '0'), '.') }}</td>
    </tr>
</table>

    {{-- DEVOLUCIONES --}}
    @if ($sale->creditNotes->count() > 0)
        <div class="sep"></div>
        <div class="center bold">** VENTA CON DEVOLUCIONES **</div>
        <table>
            @foreach ($sale->creditNotes as $nc)
                <tr>
                    <td>{{ $nc->code }}</td>
                    <td class="right">-{{ $currency }} {{ number_format($nc->total, 2) }}</td>
                </tr>
            @endforeach
            <tr class="bold">
                <td>TOTAL NETO</td>
                <td class="right">{{ $currency }} {{ number_format($sale->total - $sale->creditNotes->sum('total'), 2) }}</td>
            </tr>
        </table>
    @endif

    <div class="sep"></div>

    {{-- PIE --}}
    <div class="center" style="font-size: 8px;">
        @if ($footerLine1)
            <div class="bold">{{ $footerLine1 }}</div>
        @endif
        @if ($footerLine2)
            <div>{{ $footerLine2 }}</div>
        @endif
        @if ($showBarcode)
            <div style="margin-top: 4px; letter-spacing: 2px;">*{{ $sale->id }}*</div>
        @endif
        @if ($footerNote)
            <div style="margin-top: 4px;">{{ $footerNote }}</div>
        @endif
    </div>

    @if (!$loop->last)
        <div class="page-break"></div>
    @endif

@endforeach

</body>
</html>