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
    Schema::create('credit_note_items', function (Blueprint $table) {
        $table->id();
        $table->foreignId('credit_note_id')->constrained()->cascadeOnDelete();
        $table->foreignId('sale_item_id')->constrained(); // línea original de la venta
        $table->foreignId('product_id')->constrained();
        $table->decimal('quantity', 12, 3); // cantidad devuelta
        $table->decimal('unit_price', 12, 4); // precio congelado de la venta original
        $table->decimal('total', 14, 4);
        $table->boolean('restock')->default(true); // false si el producto vuelve dañado
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_note_items');
    }
};
