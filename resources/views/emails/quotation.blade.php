@component('mail::message')
# Cotización {{ $quotation->code }}

Hola {{ $quotation->client->name }},

Adjuntamos la cotización solicitada, válida hasta el **{{ $quotation->valid_until->format('d/m/Y') }}**.

**Total: {{ $quotation->currency === 'USD' ? '$' : 'S/' }} {{ number_format($quotation->total, 2) }}**

Cualquier consulta, quedamos atentos.

Saludos,<br>
{{ config('company.name') }}
@endcomponent
