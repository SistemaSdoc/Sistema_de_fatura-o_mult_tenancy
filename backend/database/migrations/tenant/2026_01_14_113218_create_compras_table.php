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
Schema::connection('tenant')->create('compras', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('fornecedor_id')->references('id')->on('fornecedores')->onDelete('cascade');
    $table->date('data');
    $table->decimal('total', 12, 2);
  $table->timestamps();
});



Schema::connection('tenant')->create('itens_compras', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('compra_id')->references('id')->on('compras')->onDelete('cascade');
    $table->foreignUuid('produto_id')->references('id')->on('produtos')->onDelete('cascade');
    $table->integer('quantidade');
    $table->decimal('preco_compra', 12, 2);
    $table->decimal('subtotal', 12, 2);
   $table->timestamps();
});


    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('compras');
        Schema::connection('tenant')->dropIfExists('itens_compras');
    }
};
