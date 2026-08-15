<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    /**
     * Definición de todas las configuraciones del sistema.
     * key => [tipo, grupo, etiqueta, valor por defecto, ayuda]
     */
    public const DEFINITIONS = [
        // ============ EMPRESA ============
        'company_name' => ['string', 'empresa', 'Nombre comercial', 'Mi Negocio', 'Aparece en comprobantes y documentos'],
        'company_legal_name' => ['string', 'empresa', 'Razón social', '', 'Nombre legal registrado ante SUNAT'],
        'company_ruc' => ['string', 'empresa', 'RUC', '', 'Número de RUC de 11 dígitos'],
        'company_address' => ['string', 'empresa', 'Dirección', '', 'Dirección fiscal del negocio'],
        'company_phone' => ['string', 'empresa', 'Teléfono', '', ''],
        'company_email' => ['string', 'empresa', 'Correo electrónico', '', 'Correo de contacto para clientes'],
        'company_website' => ['string', 'empresa', 'Sitio web', '', ''],
        'company_logo' => ['image', 'empresa', 'Logo', '', 'Se muestra en cotizaciones y comprobantes'],

        // ============ FISCAL ============
        'tax_rate' => ['number', 'fiscal', 'Tasa de IGV (%)', '18', 'Impuesto aplicado a las ventas'],
        'tax_included_in_price' => ['boolean', 'fiscal', 'Precios incluyen IGV', '0', 'Si está activo, el precio mostrado ya contiene el impuesto'],
        'currency_symbol' => ['string', 'fiscal', 'Símbolo de moneda', 'S/', ''],
        'currency_code' => ['string', 'fiscal', 'Código de moneda', 'PEN', 'Código ISO de tres letras'],

        // ============ OPERACIÓN ============
        'quotation_validity_days' => ['number', 'operacion', 'Validez de cotizaciones (días)', '15', 'Días por defecto al crear una cotización'],
        'low_stock_alert' => ['boolean', 'operacion', 'Alertar stock bajo', '1', 'Mostrar avisos cuando un producto llega a su mínimo'],
        'require_cash_session' => ['boolean', 'operacion', 'Exigir caja abierta para vender', '1', 'Impide registrar ventas sin haber aperturado caja'],
        'dead_stock_days' => ['number', 'operacion', 'Días sin rotación', '60', 'A partir de cuántos días un producto se considera sin rotación'],
        'default_payment_method' => ['string', 'operacion', 'Método de pago por defecto', 'Efectivo', ''],
        'discount_max_percent' => ['number', 'operacion', 'Descuento máximo sin autorización (%)', '10', 'Sobre este porcentaje se pedirá el PIN de un supervisor'],
        'discount_require_reason' => ['boolean', 'operacion', 'Exigir motivo del descuento', '1', 'El motivo queda registrado en la auditoría'],
        'payment_methods' => ['string', 'operacion', 'Métodos de pago', 'Efectivo,Tarjeta,Yape,Plin,Transferencia', 'Separados por coma'],
        'allow_mixed_payment' => ['boolean', 'operacion', 'Permitir pago mixto', '1', 'El cliente puede pagar con varios métodos en una misma venta'],

        // ============ APARIENCIA ============
        'product_placeholder' => ['image', 'apariencia', 'Imagen de producto sin foto', '', 'Se usa cuando un producto no tiene imagen propia'],
        'quotation_footer' => ['string', 'apariencia', 'Pie de cotizaciones', '', 'Texto legal o condiciones que aparecen al final del PDF'],

        // ============ IMPRESIÓN ============
        'ticket_paper_width' => ['number', 'impresion', 'Ancho del papel (mm)', '80', 'Normalmente 80mm o 58mm'],
        'ticket_show_logo' => ['boolean', 'impresion', 'Mostrar logo en el ticket', '0', 'Requiere logo cargado en Datos de la empresa'],
        'ticket_document_name' => ['string', 'impresion', 'Nombre del documento', 'NOTA DE VENTA', 'Ej. NOTA DE VENTA, TICKET, COMPROBANTE'],
        'ticket_series' => ['string', 'impresion', 'Serie del documento', 'NV01', 'Prefijo del correlativo, ej. NV01'],
        'ticket_copies' => ['number', 'impresion', 'Copias a imprimir', '1', 'Normalmente 2: una para el cliente y una para el negocio'],
        'ticket_copy_labels' => ['string', 'impresion', 'Etiquetas de las copias', 'CLIENTE,CONTROL INTERNO', 'Separadas por coma, una por copia'],
        'ticket_show_seller' => ['boolean', 'impresion', 'Mostrar vendedor', '1', ''],
        'ticket_show_amount_in_words' => ['boolean', 'impresion', 'Mostrar monto en letras', '1', 'Ej. SON: TREINTA Y OCHO CON 00/100 SOLES'],
        'ticket_show_payment_detail' => ['boolean', 'impresion', 'Mostrar recibido y vuelto', '1', 'Solo aplica a pagos en efectivo'],
        'ticket_show_barcode' => ['boolean', 'impresion', 'Mostrar código de la venta', '1', ''],
        'ticket_footer_line1' => ['string', 'impresion', 'Mensaje de despedida', '¡GRACIAS POR SU COMPRA!', ''],
        'ticket_footer_line2' => ['string', 'impresion', 'Condiciones', 'No hay cambios ni devoluciones sin comprobante', ''],
        'ticket_footer_note' => ['string', 'impresion', 'Nota legal', 'Este documento no tiene validez fiscal', ''],
        'ticket_auto_print' => ['boolean', 'impresion', 'Imprimir automáticamente al cobrar', '0', 'Si está activo, el ticket se imprime sin pedir confirmación'],

    ];

    public const GROUPS = [
        'empresa' => 'Datos de la empresa',
        'fiscal' => 'Impuestos y moneda',
        'operacion' => 'Reglas de operación',
        'impresion' => 'Impresión de tickets',
        'apariencia' => 'Apariencia y documentos',
    ];

    /**
     * Devuelve todas las configuraciones, cacheadas.
     */
    public static function all(): array
    {
        return Cache::rememberForever('settings.all', function () {
            $stored = Setting::pluck('value', 'key')->toArray();

            $result = [];
            foreach (self::DEFINITIONS as $key => [$type,,, $default]) {
                $raw = $stored[$key] ?? $default;
                $result[$key] = self::cast($raw, $type);
            }

            return $result;
        });
    }

    public static function get(string $key, mixed $fallback = null): mixed
    {
        return self::all()[$key] ?? $fallback;
    }

    public static function set(string $key, mixed $value): void
    {
        if (!isset(self::DEFINITIONS[$key])) return;

        [$type, $group] = self::DEFINITIONS[$key];

        Setting::updateOrCreate(
            ['key' => $key],
            ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value, 'type' => $type, 'group' => $group]
        );
    }

    /**
     * Tasa de IGV como decimal listo para multiplicar (ej. 0.18).
     */
    public static function taxRate(): float
    {
        return (float) self::get('tax_rate', 18) / 100;
    }

    public static function currency(): string
    {
        return self::get('currency_symbol', 'S/');
    }

    /**
     * Datos de la empresa en el formato que espera la plantilla del PDF.
     */
    public static function company(): array
    {
        $all = self::all();

        return [
            'name' => $all['company_name'] ?: 'Mi Negocio',
            'legal_name' => $all['company_legal_name'],
            'ruc' => $all['company_ruc'],
            'address' => $all['company_address'],
            'phone' => $all['company_phone'],
            'email' => $all['company_email'],
            'website' => $all['company_website'],
            'logo_path' => $all['company_logo'],
        ];
    }

    private static function cast(mixed $value, string $type): mixed
    {
        return match ($type) {
            'number' => is_numeric($value) ? (float) $value : 0,
            'boolean' => (bool) $value && $value !== '0',
            default => (string) ($value ?? ''),
        };
    }

    /**
     * Calcula el desglose de impuestos a partir de un monto bruto de productos.
     *
     * Si los precios YA incluyen IGV, el monto recibido es el total y se
     * desglosa hacia atrás. Si no, el monto es la base y el IGV se suma encima.
     *
     * @return array{subtotal: float, tax: float, total: float}
     */
    public static function breakdown(float $grossAmount): array
    {
        $rate = self::taxRate();

        if (self::get('tax_included_in_price', false)) {
            $subtotal = round($grossAmount / (1 + $rate), 2);
            $tax = round($grossAmount - $subtotal, 2);
            $total = $grossAmount;
        } else {
            $subtotal = round($grossAmount, 2);
            $tax = round($subtotal * $rate, 2);
            $total = round($subtotal + $tax, 2);
        }

        return ['subtotal' => $subtotal, 'tax' => $tax, 'total' => $total];
    }
}
