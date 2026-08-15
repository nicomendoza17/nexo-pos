<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            // Para transferencias: almacén destino (el origen va en warehouse_id)
            $table->foreignId('destination_warehouse_id')->nullable()->after('warehouse_id')->constrained('warehouses');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropForeign(['destination_warehouse_id']);
            $table->dropColumn('destination_warehouse_id');
        });
    }
};
