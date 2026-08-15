<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\PettyCashFund;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Purchase;
use App\Models\Quotation;
use App\Models\Sale;
use App\Models\Transfer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Genera las alertas del sistema en tiempo real.
 *
 * Las notificaciones NO se persisten: son estados calculables que
 * desaparecen solos cuando la condición que las originó se resuelve.
 * Esto evita mantener una bandeja con avisos obsoletos.
 */
class NotificationService
{
    /** Niveles de urgencia, ordenados de mayor a menor */
    public const LEVELS = ['critical' => 3, 'warning' => 2, 'info' => 1];

    public static function for(User $user): array
    {
        $warehouseId = WarehouseContext::currentId();
        $dismissed = session('dismissed_notifications', []);

        $items = collect([
            ...self::inventory($user, $warehouseId),
            ...self::transfers($user, $warehouseId),
            ...self::purchases($user),
            ...self::cash($user, $warehouseId),
            ...self::commercial($user),
            ...self::security($user),
        ]);

        // Se descartan las pospuestas por el usuario en esta sesión
        $items = $items->reject(fn ($n) => in_array($n['id'], $dismissed));

        // Ordenadas por urgencia
        $items = $items->sortByDesc(fn ($n) => self::LEVELS[$n['level']] ?? 0)->values();

        return [
            'items' => $items->all(),
            'total' => $items->count(),
            'critical' => $items->where('level', 'critical')->count(),
        ];
    }

    // ============================================================
    // INVENTARIO
    // ============================================================

    private static function inventory(User $user, int $warehouseId): array
    {
        if (!$user->can('inventario.ver')) return [];

        $out = [];

        // Productos agotados
        $empty = ProductStock::where('product_stocks.warehouse_id', $warehouseId)
            ->where('product_stocks.stock', '<=', 0)
            ->join('products', 'products.id', '=', 'product_stocks.product_id')
            ->where('products.is_active', true)
            ->count();

        if ($empty > 0) {
            $out[] = [
                'id' => 'stock_empty',
                'level' => 'critical',
                'group' => 'Inventario',
                'title' => "{$empty} producto(s) agotado(s)",
                'message' => 'No se pueden vender hasta reponer stock.',
                'url' => route('inventory.index'),
                'action' => 'Ver inventario',
                'icon' => 'box',
            ];
        }

        // Stock bajo (sin contar los agotados, que ya tienen su propia alerta)
        $low = ProductStock::where('product_stocks.warehouse_id', $warehouseId)
            ->where('product_stocks.stock', '>', 0)
            ->whereColumn('product_stocks.stock', '<=', 'product_stocks.min_stock')
            ->join('products', 'products.id', '=', 'product_stocks.product_id')
            ->where('products.is_active', true)
            ->count();

        if ($low > 0 && SettingsService::get('low_stock_alert', true)) {
            $out[] = [
                'id' => 'stock_low',
                'level' => 'warning',
                'group' => 'Inventario',
                'title' => "{$low} producto(s) con stock bajo",
                'message' => 'Están en o por debajo de su nivel mínimo.',
                'url' => route('inventory.index'),
                'action' => 'Revisar',
                'icon' => 'box',
            ];
        }

        return $out;
    }

    // ============================================================
    // TRANSFERENCIAS
    // ============================================================

    private static function transfers(User $user, int $warehouseId): array
    {
        if (!$user->can('transferencias.ver')) return [];

        $out = [];

        $incoming = Transfer::where('to_warehouse_id', $warehouseId)
            ->where('status', 'en_transito')
            ->count();

        if ($incoming > 0) {
            $out[] = [
                'id' => 'transfers_incoming',
                'level' => 'warning',
                'group' => 'Transferencias',
                'title' => "{$incoming} transferencia(s) por recibir",
                'message' => 'Mercadería en camino esperando confirmación.',
                'url' => route('transfers.index', ['filter' => 'por_recibir']),
                'action' => 'Confirmar recepción',
                'icon' => 'transfer',
            ];
        }

        $pending = Transfer::where('from_warehouse_id', $warehouseId)
            ->where('status', 'pendiente')
            ->count();

        if ($pending > 0) {
            $out[] = [
                'id' => 'transfers_pending',
                'level' => 'info',
                'group' => 'Transferencias',
                'title' => "{$pending} transferencia(s) por despachar",
                'message' => 'Creadas pero aún sin salir de esta sucursal.',
                'url' => route('transfers.index', ['filter' => 'por_despachar']),
                'action' => 'Despachar',
                'icon' => 'transfer',
            ];
        }

        return $out;
    }

    // ============================================================
    // COMPRAS
    // ============================================================

    private static function purchases(User $user): array
    {
        if (!$user->can('compras.ver')) return [];

        $out = [];

        $overdue = Purchase::where('status', '!=', 'anulada')
            ->where('payment_status', '!=', 'pagada')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', today())
            ->get();

        if ($overdue->count() > 0) {
            $debt = $overdue->sum(fn ($p) => $p->balance());
            $out[] = [
                'id' => 'purchases_overdue',
                'level' => 'critical',
                'group' => 'Compras',
                'title' => "{$overdue->count()} compra(s) vencida(s)",
                'message' => 'Deuda vencida por ' . SettingsService::currency() . ' ' . number_format($debt, 2),
                'url' => route('purchases.index'),
                'action' => 'Ver deudas',
                'icon' => 'money',
            ];
        }

        // Vencen en los próximos 3 días
        $soon = Purchase::where('status', '!=', 'anulada')
            ->where('payment_status', '!=', 'pagada')
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [today(), today()->addDays(3)])
            ->count();

        if ($soon > 0) {
            $out[] = [
                'id' => 'purchases_due_soon',
                'level' => 'warning',
                'group' => 'Compras',
                'title' => "{$soon} pago(s) vencen esta semana",
                'message' => 'Facturas de proveedor próximas a vencer.',
                'url' => route('purchases.index'),
                'action' => 'Revisar',
                'icon' => 'money',
            ];
        }

        $pendingReceipt = Purchase::where('status', 'pendiente')
            ->whereDate('purchase_date', '<=', today()->subDays(2))
            ->count();

        if ($pendingReceipt > 0) {
            $out[] = [
                'id' => 'purchases_pending_receipt',
                'level' => 'warning',
                'group' => 'Compras',
                'title' => "{$pendingReceipt} compra(s) sin recibir",
                'message' => 'Creadas hace más de 2 días y aún no se confirma la recepción.',
                'url' => route('purchases.index'),
                'action' => 'Recibir',
                'icon' => 'truck',
            ];
        }

        return $out;
    }

    // ============================================================
    // CAJA
    // ============================================================

    private static function cash(User $user, int $warehouseId): array
    {
        $out = [];

        // Caja sin abrir en horario de operación
        if ($user->can('caja.abrir') && now()->hour >= 9 && now()->hour < 21) {
            $hasOpen = CashSession::where('user_id', $user->id)
                ->where('status', 'abierta')
                ->exists();

            if (!$hasOpen) {
                $out[] = [
                    'id' => 'cash_not_open',
                    'level' => 'warning',
                    'group' => 'Caja',
                    'title' => 'No tienes caja abierta',
                    'message' => 'No podrás registrar ventas hasta aperturarla.',
                    'url' => route('cash-sessions.index'),
                    'action' => 'Abrir caja',
                    'icon' => 'cash',
                ];
            }
        }

        // Caja chica sin saldo suficiente
        if ($user->can('caja-chica.gestionar')) {
            $funds = PettyCashFund::where('status', 'activo')
                ->where(function ($q) {
                    $q->whereColumn('current_balance', '<=', DB::raw('fixed_amount * 0.2'));
                })
                ->get();

            foreach ($funds as $fund) {
                $out[] = [
                    'id' => "petty_cash_{$fund->id}",
                    'level' => $fund->current_balance <= 0 ? 'critical' : 'warning',
                    'group' => 'Caja chica',
                    'title' => $fund->current_balance <= 0
                        ? "\"{$fund->name}\" sin saldo"
                        : "\"{$fund->name}\" con saldo bajo",
                    'message' => 'Disponible: ' . SettingsService::currency() . ' ' . number_format($fund->current_balance, 2),
                    'url' => route('petty-cash.show', $fund->id),
                    'action' => 'Reponer',
                    'icon' => 'cash',
                ];
            }
        }

        // Cierres con descuadre en las últimas 24 horas
        if ($user->can('caja.ver-historial')) {
            $mismatches = CashSession::where('status', 'cerrada')
                ->where('closed_at', '>=', now()->subDay())
                ->whereRaw('ABS(difference) > 0.01')
                ->with('user:id,name')
                ->get();

            if ($mismatches->count() > 0) {
                $totalDiff = $mismatches->sum('difference');
                $out[] = [
                    'id' => 'cash_mismatch',
                    'level' => 'critical',
                    'group' => 'Caja',
                    'title' => "{$mismatches->count()} cierre(s) con descuadre",
                    'message' => 'Diferencia acumulada: ' . SettingsService::currency() . ' ' . number_format($totalDiff, 2),
                    'url' => route('reports.index', ['type' => 'caja', 'preset' => 'hoy']),
                    'action' => 'Ver arqueos',
                    'icon' => 'alert',
                ];
            }
        }

        return $out;
    }

    // ============================================================
    // COMERCIAL
    // ============================================================

    private static function commercial(User $user): array
    {
        if (!$user->can('cotizaciones.ver')) return [];

        $out = [];

        // Aceptadas pero nunca convertidas: dinero sobre la mesa
        $unconverted = Quotation::where('status', 'aceptada')
            ->whereNull('converted_sale_id')
            ->get();

        if ($unconverted->count() > 0) {
            $amount = $unconverted->sum('total');
            $out[] = [
                'id' => 'quotations_unconverted',
                'level' => 'warning',
                'group' => 'Cotizaciones',
                'title' => "{$unconverted->count()} cotización(es) aceptada(s) sin convertir",
                'message' => 'Valor pendiente: ' . SettingsService::currency() . ' ' . number_format($amount, 2),
                'url' => route('quotations.index'),
                'action' => 'Convertir a venta',
                'icon' => 'document',
            ];
        }

        $expiring = Quotation::whereIn('status', ['borrador', 'enviada'])
            ->whereBetween('valid_until', [today(), today()->addDays(3)])
            ->count();

        if ($expiring > 0) {
            $out[] = [
                'id' => 'quotations_expiring',
                'level' => 'info',
                'group' => 'Cotizaciones',
                'title' => "{$expiring} cotización(es) por vencer",
                'message' => 'Vencen en los próximos 3 días sin respuesta del cliente.',
                'url' => route('quotations.index'),
                'action' => 'Dar seguimiento',
                'icon' => 'document',
            ];
        }

        return $out;
    }

    // ============================================================
    // SEGURIDAD
    // ============================================================

    private static function security(User $user): array
    {
        if (!$user->can('auditoria.ver')) return [];

        $out = [];

        // Intentos de acceso fallidos en las últimas 6 horas
        $failed = DB::table('activity_logs')
            ->where('action', 'sesion.fallida')
            ->where('created_at', '>=', now()->subHours(6))
            ->count();

        if ($failed >= 3) {
            $out[] = [
                'id' => 'failed_logins',
                'level' => 'critical',
                'group' => 'Seguridad',
                'title' => "{$failed} intentos de acceso fallidos",
                'message' => 'Registrados en las últimas 6 horas.',
                'url' => route('audit.index', ['action' => 'sesion.fallida']),
                'action' => 'Revisar auditoría',
                'icon' => 'shield',
            ];
        }

        // Descuentos que necesitaron autorización hoy
        $authorized = Sale::whereNotNull('discount_authorized_by')
            ->whereDate('created_at', today())
            ->count();

        if ($authorized > 0) {
            $out[] = [
                'id' => 'discounts_authorized',
                'level' => 'info',
                'group' => 'Seguridad',
                'title' => "{$authorized} descuento(s) con autorización",
                'message' => 'Superaron el límite permitido y requirieron PIN.',
                'url' => route('audit.index', ['action' => 'venta.descuento']),
                'action' => 'Ver detalle',
                'icon' => 'shield',
            ];
        }

        // Transferencias recibidas con diferencias
        $discrepancies = Transfer::where('status', 'recibida')
            ->where('received_at', '>=', now()->subDay())
            ->whereHas('items', function ($q) {
                $q->whereNotNull('quantity_received')
                  ->whereColumn('quantity_received', '!=', 'quantity_sent');
            })
            ->count();

        if ($discrepancies > 0) {
            $out[] = [
                'id' => 'transfer_discrepancies',
                'level' => 'critical',
                'group' => 'Seguridad',
                'title' => "{$discrepancies} transferencia(s) con faltantes",
                'message' => 'Se recibió menos de lo despachado en las últimas 24h.',
                'url' => route('transfers.index'),
                'action' => 'Investigar',
                'icon' => 'alert',
            ];
        }

        return $out;
    }
}