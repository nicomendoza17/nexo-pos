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
        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_session_id')->constrained();
            $table->foreignId('user_id')->constrained(); // quién lo registró
            $table->enum('type', ['venta', 'retiro', 'ingreso_manual', 'anulacion']);
            $table->string('payment_method')->nullable(); // Efectivo, Tarjeta, Yape... null si no aplica
            $table->decimal('amount', 10, 2); // siempre positivo; 'type' da el signo
            $table->string('concept')->nullable();
            $table->string('reference_type')->nullable(); // Sale::class, etc.
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('reverses_movement_id')->nullable()->constrained('cash_movements')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['cash_session_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_movements');
    }
};
