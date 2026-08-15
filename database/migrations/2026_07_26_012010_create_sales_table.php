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
    Schema::create('sales', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained(); // El cajero que cobró
        $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete(); // Cliente general si es nulo
        $table->decimal('subtotal', 10, 2);
        $table->decimal('tax', 10, 2)->default(0); // IGV
        $table->decimal('discount', 10, 2)->default(0);
        $table->decimal('total', 10, 2);
        $table->string('payment_method'); // Efectivo, Tarjeta, Yape
        $table->string('status')->default('completed'); // completed, canceled
        $table->timestamps();
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
