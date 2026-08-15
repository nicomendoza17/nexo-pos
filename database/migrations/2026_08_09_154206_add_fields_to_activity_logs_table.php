<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->string('module', 40)->nullable()->after('action');
            $table->string('severity', 10)->default('info')->after('module'); // info, warning, critical
            $table->string('user_agent')->nullable()->after('ip_address');

            $table->index(['module', 'created_at']);
            $table->index('severity');
        });

        // user_id pasa a nullable: los intentos de login fallidos no tienen usuario autenticado
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropColumn(['module', 'severity', 'user_agent']);
        });
    }
};