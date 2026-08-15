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
    Schema::create('inventory_count_items', function (Blueprint $table) {
        $table->id();
        $table->foreignId('inventory_count_id')->constrained()->cascadeOnDelete();
        $table->foreignId('product_id')->constrained();
        $table->decimal('system_stock', 12, 3); // snapshot al abrir el conteo
        $table->decimal('counted_stock', 12, 3)->nullable(); // lo que se captura
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_count_items');
    }
};
