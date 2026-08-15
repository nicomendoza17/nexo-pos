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
    Schema::table('warehouses', function (Blueprint $table) {
        $table->string('code', 20)->nullable()->unique()->after('name');
        $table->string('type', 20)->default('sucursal')->after('code'); // sucursal, almacen
        $table->string('phone', 20)->nullable()->after('address');
        $table->string('manager_name')->nullable()->after('phone');
        $table->boolean('allows_sales')->default(true)->after('is_default');
    });
}

public function down(): void
{
    Schema::table('warehouses', function (Blueprint $table) {
        $table->dropColumn(['code', 'type', 'phone', 'manager_name', 'allows_sales']);
    });
}
};
