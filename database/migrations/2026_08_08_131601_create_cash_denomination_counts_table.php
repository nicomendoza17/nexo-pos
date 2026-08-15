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
    Schema::create('cash_denomination_counts', function (Blueprint $table) {
        $table->id();
        $table->foreignId('cash_session_id')->constrained()->cascadeOnDelete();
        $table->enum('moment', ['apertura', 'cierre']);
        $table->decimal('denomination', 6, 2); // 200, 100, 50, 20, 10, 5, 1, 0.50, 0.20, 0.10
        $table->unsignedInteger('quantity');
        $table->decimal('subtotal', 10, 2);
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_denomination_counts');
    }
};
