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
    Schema::create('petty_cash_replenishments', function (Blueprint $table) {
        $table->id();
        $table->foreignId('petty_cash_fund_id')->constrained();
        $table->foreignId('approved_by')->constrained('users'); // debe ser admin
        $table->decimal('amount', 10, 2); // debe = total gastado desde última reposición
        $table->string('notes')->nullable();
        $table->timestamp('created_at')->useCurrent();
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('petty_cash_replenishments');
    }
};
