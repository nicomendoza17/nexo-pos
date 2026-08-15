<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Identidad
            $table->string('employee_code', 20)->nullable()->unique()->after('name');
            $table->string('document_type', 4)->nullable()->after('email'); // dni, ce
            $table->string('document_number', 20)->nullable()->unique()->after('document_type');
            $table->string('phone', 20)->nullable()->after('document_number');

            // Operación
            $table->foreignId('warehouse_id')->nullable()->after('phone')->constrained();
            $table->decimal('commission_rate', 5, 2)->default(0)->after('warehouse_id'); // % sobre ventas

            // Seguridad
            $table->string('authorization_pin')->nullable()->after('password'); // hasheado
            $table->boolean('is_active')->default(true)->after('authorization_pin');
            $table->boolean('must_change_password')->default(false)->after('is_active');

            // Auditoría de sesión
            $table->timestamp('last_login_at')->nullable()->after('must_change_password');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['warehouse_id']);
            $table->dropColumn([
                'employee_code', 'document_type', 'document_number', 'phone',
                'warehouse_id', 'commission_rate', 'authorization_pin',
                'is_active', 'must_change_password', 'last_login_at', 'last_login_ip',
            ]);
        });
    }
};