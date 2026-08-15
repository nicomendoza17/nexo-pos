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
    Schema::create('purchases', function (Blueprint $table) {
        $table->id();
        $table->foreignId('supplier_id')->constrained();
        $table->foreignId('user_id')->constrained(); // quién la registró
        $table->foreignId('warehouse_id')->constrained();
        $table->decimal('subtotal', 12, 2);
        $table->decimal('tax', 12, 2)->default(0);
        $table->decimal('total', 12, 2);
        $table->decimal('paid_amount', 12, 2)->default(0); // para CxC/CxP parcial
        $table->enum('status', ['pendiente', 'recibida', 'anulada'])->default('pendiente');
        $table->enum('payment_status', ['pendiente', 'parcial', 'pagada'])->default('pendiente');
        $table->date('purchase_date');
        $table->date('due_date')->nullable(); // fecha límite de pago (crédito con proveedor)
        $table->string('invoice_number')->nullable(); // número de factura del proveedor
        $table->string('notes')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchases');
    }
};
