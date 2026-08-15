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
    Schema::create('sale_payments', function (Blueprint $table) {
        $table->id();
        $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
        $table->string('method', 30);           // Efectivo, Tarjeta, Yape...
        $table->decimal('amount', 12, 2);
        $table->decimal('received', 12, 2)->nullable();  // solo efectivo: cuánto entregó
        $table->decimal('change', 12, 2)->default(0);    // vuelto
        $table->string('reference')->nullable();         // n° de operación
        $table->timestamps();

        $table->index('method');
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_payments');
    }
};
