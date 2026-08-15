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
    Schema::create('transfers', function (Blueprint $table) {
        $table->id();
        $table->string('code')->unique(); // TR-000001
        $table->foreignId('from_warehouse_id')->constrained('warehouses');
        $table->foreignId('to_warehouse_id')->constrained('warehouses');
        $table->foreignId('created_by')->constrained('users');
        $table->foreignId('dispatched_by')->nullable()->constrained('users');
        $table->foreignId('received_by')->nullable()->constrained('users');

        $table->enum('status', ['pendiente', 'en_transito', 'recibida', 'anulada'])->default('pendiente');
        $table->text('notes')->nullable();
        $table->text('reception_notes')->nullable();

        $table->timestamp('dispatched_at')->nullable();
        $table->timestamp('received_at')->nullable();
        $table->timestamps();

        $table->index(['from_warehouse_id', 'status']);
        $table->index(['to_warehouse_id', 'status']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfers');
    }
};
