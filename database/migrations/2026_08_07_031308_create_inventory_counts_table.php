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
    Schema::create('inventory_counts', function (Blueprint $table) {
        $table->id();
        $table->foreignId('warehouse_id')->constrained();
        $table->foreignId('user_id')->constrained(); // quién abrió el conteo
        $table->foreignId('category_id')->nullable()->constrained(); // null = todas las categorías
        $table->enum('status', ['abierto', 'cerrado'])->default('abierto');
        $table->timestamp('closed_at')->nullable();
        $table->string('notes')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_counts');
    }
};
