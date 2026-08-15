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
    Schema::create('quotations', function (Blueprint $table) {
        $table->id();
        $table->string('code')->unique(); // folio correlativo, ej. COT-000001
        $table->foreignId('client_id')->constrained();
        $table->foreignId('user_id')->constrained(); // vendedor asignado
        $table->date('issue_date');
        $table->date('valid_until');
        $table->string('currency', 3)->default('PEN'); // PEN, USD
        $table->decimal('exchange_rate', 8, 4)->nullable(); // solo si currency != PEN
        $table->string('payment_terms')->nullable(); // 'contado', 'credito_15', 'credito_30', 'adelanto_50'
        $table->string('delivery_time')->nullable();
        $table->string('delivery_place')->nullable();
        $table->decimal('discount_percent', 5, 2)->default(0); // descuento global %
        $table->decimal('discount_amount', 10, 2)->default(0); // descuento global monto fijo
        $table->decimal('subtotal', 12, 2);
        $table->decimal('tax', 12, 2);
        $table->decimal('total', 12, 2);
        $table->enum('status', ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'])->default('borrador');
        $table->text('notes')->nullable();
        $table->foreignId('converted_sale_id')->nullable()->constrained('sales');
        $table->timestamp('converted_at')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotations');
    }
};
