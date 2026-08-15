<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    public function up(): void
    {
        // Si estás usando MySQL en Railway, alteramos la columna de forma segura
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_movements MODIFY COLUMN type ENUM(
                'venta',
                'compra',
                'devolucion_venta',
                'devolucion_compra',
                'merma',
                'ajuste_entrada',
                'ajuste_salida',
                'transferencia_entrada',
                'transferencia_salida'
            ) NOT NULL");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_movements MODIFY COLUMN type ENUM(
                'venta',
                'compra',
                'ajuste_entrada',
                'ajuste_salida',
                'transferencia_entrada',
                'transferencia_salida'
            ) NOT NULL");
        }
    }
};