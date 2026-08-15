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
    Schema::create('credit_notes', function (Blueprint $table) {
        $table->id();
        $table->string('code')->unique(); // NC-000001
        $table->foreignId('sale_id')->constrained(); // venta original — nunca se modifica
        $table->foreignId('user_id')->constrained(); // quién la emitió
        $table->foreignId('cash_session_id')->nullable()->constrained(); // caja donde se devolvió el efectivo

        // devolucion_total | devolucion_parcial | correccion_monto | anulacion
        $table->string('type', 30);

        $table->string('reason'); // motivo obligatorio, para auditoría
        $table->decimal('subtotal', 12, 2);
        $table->decimal('tax', 12, 2);
        $table->decimal('total', 12, 2);
        $table->string('refund_method')->nullable(); // Efectivo, Tarjeta, Yape, Sin devolución
        $table->string('ip_address', 45)->nullable();
        $table->timestamp('created_at')->useCurrent();

        $table->index(['sale_id']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_notes');
    }
};
