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
    Schema::create('petty_cash_funds', function (Blueprint $table) {
        $table->id();
        $table->string('name'); // ej. "Caja chica tienda principal"
        $table->foreignId('custodian_id')->constrained('users'); // custodio único
        $table->decimal('fixed_amount', 10, 2); // monto fijo asignado
        $table->decimal('current_balance', 10, 2); // saldo disponible actual
        $table->enum('status', ['activo', 'cerrado'])->default('activo');
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('petty_cash_funds');
    }
};
