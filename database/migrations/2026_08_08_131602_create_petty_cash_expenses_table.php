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
    Schema::create('petty_cash_expenses', function (Blueprint $table) {
        $table->id();
        $table->foreignId('petty_cash_fund_id')->constrained();
        $table->foreignId('user_id')->constrained(); // quien registra (debe ser el custodio)
        $table->decimal('amount', 10, 2);
        $table->string('concept');
        $table->string('category')->nullable(); // ej. Limpieza, Transporte, Insumos
        $table->string('receipt_type')->nullable(); // Boleta, Factura, Sin comprobante
        $table->string('receipt_ruc', 20)->nullable();
        $table->string('receipt_number')->nullable();
        $table->foreignId('reverses_expense_id')->nullable()->constrained('petty_cash_expenses')->nullOnDelete();
        $table->timestamp('created_at')->useCurrent();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('petty_cash_expenses');
    }
};
