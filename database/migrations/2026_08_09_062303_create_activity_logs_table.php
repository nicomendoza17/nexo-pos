<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained(); // quién ejecutó
            $table->foreignId('authorized_by')->nullable()->constrained('users'); // quién autorizó con PIN
            $table->string('action', 60); // ej. 'anular_venta', 'aplicar_descuento'
            $table->string('description');
            $table->string('subject_type')->nullable(); // modelo afectado
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('metadata')->nullable(); // datos extra del contexto
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};