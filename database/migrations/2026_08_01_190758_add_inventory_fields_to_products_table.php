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
    Schema::table('products', function (Blueprint $table) {
        $table->enum('unit_type', ['unidad', 'kg', 'g', 'litro', 'ml'])->default('unidad')->after('name');
        $table->decimal('cost_price', 10, 2)->nullable()->after('price');
        $table->decimal('min_stock', 10, 3)->default(5)->after('stock');
        $table->string('image_path')->nullable()->after('emoji');
    });

    // Convertir stock a decimal para soportar peso (ej. 0.750 kg)
    Schema::table('products', function (Blueprint $table) {
        $table->decimal('stock', 10, 3)->default(0)->change();
    });
}

public function down(): void
{
    Schema::table('products', function (Blueprint $table) {
        $table->dropColumn(['unit_type', 'cost_price', 'min_stock', 'image_path']);
        $table->integer('stock')->default(0)->change();
    });
}
};
