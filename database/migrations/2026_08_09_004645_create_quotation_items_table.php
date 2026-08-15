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
        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained();
            $table->string('description')->nullable(); // editable, distinto al nombre del producto si se desea
            $table->decimal('quantity', 12, 3);
            $table->decimal('unit_price', 12, 4);
            $table->decimal('discount_percent', 5, 2)->default(0); // descuento por línea
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('total', 14, 4);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotation_items');
    }
};
