<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $defaultWarehouse = DB::table('warehouses')->where('is_default', true)->value('id')
            ?? DB::table('warehouses')->value('id');

        if (!$defaultWarehouse) {
            // Creamos un almacén por defecto automáticamente para que la migración no falle
            $defaultWarehouse = DB::table('warehouses')->insertGetId([
                'name' => 'Almacén Principal',
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Todo el stock actual se asigna al almacén principal
        DB::table('products')->orderBy('id')->chunk(200, function ($products) use ($defaultWarehouse) {
            $rows = [];
            foreach ($products as $p) {
                $rows[] = [
                    'product_id' => $p->id,
                    'warehouse_id' => $p->warehouse_id ?? $defaultWarehouse,
                    'stock' => $p->stock ?? 0,
                    'min_stock' => $p->min_stock ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            DB::table('product_stocks')->insert($rows);
        });
    }

    public function down(): void
    {
        DB::table('product_stocks')->truncate();
    }
};
