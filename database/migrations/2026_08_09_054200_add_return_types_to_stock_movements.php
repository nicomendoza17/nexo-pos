<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
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

    public function down(): void
    {
        DB::statement("ALTER TABLE stock_movements MODIFY COLUMN type ENUM(
            'venta',
            'compra',
            'ajuste_entrada',
            'ajuste_salida',
            'transferencia_entrada',
            'transferencia_salida'
        ) NOT NULL");
    }
};