<?php

namespace App\Services;

use App\Models\Warehouse;

class WarehouseContext
{
    /**
     * Sucursal en la que opera el usuario actual.
     *
     * Prioridad: la asignada al usuario > la elegida en sesión > la predeterminada.
     * Un usuario con sucursal asignada NO puede operar en otra.
     */
    public static function currentId(): int
    {
        $user = auth()->user();

        if ($user?->warehouse_id) {
            return $user->warehouse_id;
        }

        $sessionId = session('active_warehouse_id');

        if ($sessionId && Warehouse::where('id', $sessionId)->where('is_active', true)->exists()) {
            return $sessionId;
        }

        return Warehouse::defaultId();
    }

    public static function current(): Warehouse
    {
        return Warehouse::findOrFail(self::currentId());
    }

    /**
     * Sucursales entre las que el usuario puede alternar.
     * Vacío si está fijado a una sola.
     */
    public static function switchable()
    {
        $user = auth()->user();

        if ($user?->warehouse_id || !$user?->can('sucursales.cambiar')) {
            return collect();
        }

        return Warehouse::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
    }
}