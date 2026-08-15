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
    Schema::create('stock_movements', function (Blueprint $table) {
        $table->id();
        $table->foreignId('product_id')->constrained()->cascadeOnDelete();
        $table->foreignId('warehouse_id')->constrained();
        $table->enum('type', ['venta', 'compra', 'ajuste_entrada', 'ajuste_salida', 'transferencia_entrada', 'transferencia_salida']);
        $table->decimal('quantity', 10, 3); // siempre positivo; el 'type' indica dirección
        $table->decimal('stock_before', 10, 3);
        $table->decimal('stock_after', 10, 3);
        $table->string('reference_type')->nullable(); // 'Sale', 'Purchase', etc.
        $table->unsignedBigInteger('reference_id')->nullable(); // id de la venta/compra que originó el movimiento
        $table->foreignId('user_id')->constrained();
        $table->string('notes')->nullable();
        $table->timestamps();

        $table->index(['product_id', 'created_at']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
