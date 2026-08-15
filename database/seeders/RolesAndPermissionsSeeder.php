<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Permisos agrupados por área. La clave es el permiso,
     * el valor es la descripción legible que se muestra en la UI.
     */
    public const PERMISSIONS = [
        'Ventas' => [
            'ventas.registrar' => 'Registrar ventas en el POS',
            'ventas.ver' => 'Ver historial de ventas',
            'ventas.aplicar-descuento' => 'Aplicar descuentos en una venta',
            'ventas.anular' => 'Anular una venta',
            'notas-credito.emitir' => 'Emitir notas de crédito y devoluciones',
        ],
        'Caja' => [
            'caja.abrir' => 'Abrir y cerrar su propia caja',
            'caja.retirar-efectivo' => 'Retirar efectivo de la caja',
            'caja.cerrar-ajena' => 'Cerrar la caja de otro usuario',
            'caja.ver-historial' => 'Ver historial de cajas de todos',
            'caja-chica.gestionar' => 'Registrar gastos de caja chica',
            'caja-chica.reponer' => 'Aprobar reposiciones de caja chica',
        ],
        'Inventario' => [
            'inventario.ver' => 'Ver el inventario',
            'inventario.crear' => 'Crear y editar productos',
            'inventario.eliminar' => 'Eliminar o desactivar productos',
            'inventario.ajustar' => 'Registrar ajustes de stock y mermas',
            'inventario.conteo' => 'Realizar tomas de inventario',
            'inventario.ver-costos' => 'Ver precios de costo y márgenes',
            'transferencias.ver' => 'Ver transferencias entre sucursales',
            'transferencias.crear' => 'Crear órdenes de transferencia',
            'transferencias.despachar' => 'Despachar mercadería a otra sucursal',
            'transferencias.recibir' => 'Confirmar recepción de transferencias',
        ],
        'Compras' => [
            'compras.ver' => 'Ver órdenes de compra',
            'compras.crear' => 'Crear órdenes de compra',
            'compras.recibir' => 'Confirmar recepción de mercadería',
            'compras.pagar' => 'Registrar pagos a proveedores',
        ],
        'Terceros' => [
            'clientes.gestionar' => 'Crear y editar clientes',
            'proveedores.gestionar' => 'Crear y editar proveedores',
        ],
        'Comercial' => [
            'cotizaciones.ver' => 'Ver cotizaciones',
            'cotizaciones.crear' => 'Crear y enviar cotizaciones',
            'cotizaciones.convertir' => 'Convertir cotizaciones en ventas',
        ],
        'Análisis' => [
            'dashboard.ver' => 'Ver el panel general',
            'reportes.ver' => 'Ver reportes operativos',
            'reportes.ver-ganancias' => 'Ver reportes de utilidad y ganancias',
            'kardex.ver' => 'Consultar el Kardex',
        ],
        'Administración' => [
            'usuarios.gestionar' => 'Crear y editar usuarios',
            'usuarios.permisos' => 'Asignar roles y permisos',
            'configuracion.gestionar' => 'Modificar la configuración del sistema',
            'auditoria.ver' => 'Ver el registro de actividad',
            'sucursales.gestionar' => 'Crear y editar sucursales',
            'sucursales.cambiar' => 'Cambiar entre sucursales',

        ],
    ];

    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Crear todos los permisos
        foreach (self::PERMISSIONS as $group => $permissions) {
            foreach (array_keys($permissions) as $permission) {
                Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            }
        }

        // ============ ADMINISTRADOR — todo ============
        $admin = Role::firstOrCreate(['name' => 'Administrador', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::all());

        // ============ SUPERVISOR — casi todo, sin tocar usuarios ni config ============
        $supervisor = Role::firstOrCreate(['name' => 'Supervisor', 'guard_name' => 'web']);
        $supervisor->syncPermissions([
            'ventas.registrar',
            'ventas.ver',
            'ventas.aplicar-descuento',
            'ventas.anular',
            'notas-credito.emitir',
            'caja.abrir',
            'caja.retirar-efectivo',
            'caja.cerrar-ajena',
            'caja.ver-historial',
            'caja-chica.gestionar',
            'caja-chica.reponer',
            'inventario.ver',
            'inventario.crear',
            'inventario.eliminar',
            'inventario.ajustar',
            'inventario.conteo',
            'inventario.ver-costos',
            'compras.ver',
            'compras.crear',
            'compras.recibir',
            'compras.pagar',
            'clientes.gestionar',
            'proveedores.gestionar',
            'cotizaciones.ver',
            'cotizaciones.crear',
            'cotizaciones.convertir',
            'dashboard.ver',
            'reportes.ver',
            'reportes.ver-ganancias',
            'kardex.ver',
            'auditoria.ver',
            'transferencias.ver',
            'transferencias.crear',
            'transferencias.despachar',
            'transferencias.recibir',
            'sucursales.cambiar',
        ]);

        // ============ VENDEDOR — vende y cotiza, sin ver costos ni ganancias ============
        $vendedor = Role::firstOrCreate(['name' => 'Vendedor', 'guard_name' => 'web']);
        $vendedor->syncPermissions([
            'ventas.registrar',
            'ventas.ver',
            'caja.abrir',
            'inventario.ver',
            'clientes.gestionar',
            'cotizaciones.ver',
            'cotizaciones.crear',
            'dashboard.ver',
        ]);

        // ============ CAJERO — solo opera el POS y su caja ============
        $cajero = Role::firstOrCreate(['name' => 'Cajero', 'guard_name' => 'web']);
        $cajero->syncPermissions([
            'ventas.registrar',
            'ventas.ver',
            'caja.abrir',
            'caja-chica.gestionar',
            'inventario.ver',
            'clientes.gestionar',
            'dashboard.ver',
        ]);

        // ============ ALMACENERO — inventario y compras, sin vender ============
        $almacenero = Role::firstOrCreate(['name' => 'Almacenero', 'guard_name' => 'web']);
        $almacenero->syncPermissions([
            'inventario.ver',
            'inventario.crear',
            'inventario.ajustar',
            'inventario.conteo',
            'compras.ver',
            'compras.crear',
            'compras.recibir',
            'proveedores.gestionar',
            'kardex.ver',
            'dashboard.ver',
            'transferencias.ver',
            'transferencias.crear',
            'transferencias.despachar',
            'transferencias.recibir',
        ]);
    }
}
