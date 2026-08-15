<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

class AuditService
{
    /**
     * Catálogo de acciones auditables.
     * clave => [módulo, severidad, etiqueta legible]
     */
    public const ACTIONS = [
        // Ventas
        'venta.registrar' => ['Ventas', 'info', 'Registró una venta'],
        'venta.descuento' => ['Ventas', 'warning', 'Aplicó un descuento'],
        'nota-credito.emitir' => ['Ventas', 'critical', 'Emitió una nota de crédito'],

        // Caja
        'caja.abrir' => ['Caja', 'info', 'Abrió caja'],
        'caja.cerrar' => ['Caja', 'info', 'Cerró caja'],
        'caja.descuadre' => ['Caja', 'critical', 'Cierre con descuadre'],
        'caja.retiro' => ['Caja', 'critical', 'Retiró efectivo'],
        'caja.ingreso' => ['Caja', 'warning', 'Registró ingreso manual'],
        'caja.anular-movimiento' => ['Caja', 'critical', 'Anuló un movimiento de caja'],
        'caja-chica.gasto' => ['Caja', 'info', 'Registró gasto de caja chica'],
        'caja-chica.reponer' => ['Caja', 'warning', 'Repuso fondo de caja chica'],

        // Inventario
        'producto.crear' => ['Inventario', 'info', 'Creó un producto'],
        'producto.editar' => ['Inventario', 'info', 'Editó un producto'],
        'producto.precio' => ['Inventario', 'warning', 'Cambió el precio de un producto'],
        'producto.eliminar' => ['Inventario', 'critical', 'Eliminó un producto'],
        'producto.desactivar' => ['Inventario', 'warning', 'Desactivó un producto'],
        'inventario.ajuste' => ['Inventario', 'critical', 'Ajustó stock manualmente'],
        'inventario.conteo-cerrar' => ['Inventario', 'warning', 'Cerró una toma de inventario'],
        'inventario.carga-masiva' => ['Inventario', 'warning', 'Importó productos por CSV'],
        'transferencia.crear' => ['Inventario', 'info', 'Creó una transferencia'],
        'transferencia.despachar' => ['Inventario', 'warning', 'Despachó mercadería a otra sucursal'],
        'transferencia.recibir' => ['Inventario', 'warning', 'Recibió una transferencia'],
        'transferencia.discrepancia' => ['Inventario', 'critical', 'Recepción con diferencias'],
        'transferencia.anular' => ['Inventario', 'warning', 'Anuló una transferencia'],
        'sucursal.crear' => ['Administración', 'warning', 'Creó una sucursal'],
        'sucursal.editar' => ['Administración', 'warning', 'Editó una sucursal'],
        'sucursal.estado' => ['Administración', 'critical', 'Cambió el estado de una sucursal'],

        // Compras
        'compra.crear' => ['Compras', 'info', 'Creó una orden de compra'],
        'compra.recibir' => ['Compras', 'warning', 'Recibió mercadería'],
        'compra.pagar' => ['Compras', 'warning', 'Registró pago a proveedor'],
        'compra.anular' => ['Compras', 'critical', 'Anuló una orden de compra'],

        // Comercial
        'cotizacion.convertir' => ['Comercial', 'warning', 'Convirtió cotización en venta'],

        // Seguridad
        'sesion.inicio' => ['Seguridad', 'info', 'Inició sesión'],
        'sesion.fin' => ['Seguridad', 'info', 'Cerró sesión'],
        'sesion.fallida' => ['Seguridad', 'warning', 'Intento de acceso fallido'],
        'usuario.crear' => ['Seguridad', 'warning', 'Creó un usuario'],
        'usuario.editar' => ['Seguridad', 'warning', 'Editó un usuario'],
        'usuario.estado' => ['Seguridad', 'critical', 'Cambió el estado de un usuario'],
        'usuario.password' => ['Seguridad', 'critical', 'Restableció una contraseña'],
        'usuario.pin' => ['Seguridad', 'critical', 'Modificó un PIN de autorización'],
        'autorizacion.pin' => ['Seguridad', 'critical', 'Autorizó una acción con PIN'],
        'configuracion.cambiar' => ['Seguridad', 'critical', 'Modificó la configuración'],
    ];

    public static function log(
        string $action,
        string $description,
        ?Model $subject = null,
        ?array $metadata = null,
        ?int $authorizedBy = null,
    ): ?ActivityLog {
        [$module, $severity] = self::ACTIONS[$action] ?? ['General', 'info'];

        return ActivityLog::create([
            'user_id' => auth()->id(),
            'authorized_by' => $authorizedBy,
            'action' => $action,
            'module' => $module,
            'severity' => $severity,
            'description' => $description,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata,
            'ip_address' => request()->ip(),
            'user_agent' => substr(request()->userAgent() ?? '', 0, 255),
        ]);
    }

    /**
     * Registra un cambio comparando valores antes y después.
     * Solo guarda los campos que realmente cambiaron.
     */
    public static function logChange(
        string $action,
        string $description,
        Model $subject,
        array $before,
        array $after,
        array $onlyFields = [],
    ): ?ActivityLog {
        $changes = [];

        $fields = $onlyFields ?: array_keys($after);
        foreach ($fields as $field) {
            $old = $before[$field] ?? null;
            $new = $after[$field] ?? null;
            if ((string) $old !== (string) $new) {
                $changes[$field] = ['antes' => $old, 'despues' => $new];
            }
        }

        if (empty($changes)) return null;

        return self::log($action, $description, $subject, ['cambios' => $changes]);
    }
}
