<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up()
    {
        // Vendas
Schema::connection('tenant')->create('vendas', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('cliente_id')->references('id')->on('clientes')->onDelete('cascade');
    $table->foreignUuid('user_id')->references('id')->on('users')->onDelete('cascade');
    $table->date('data');
    $table->decimal('total', 12, 2);
   $table->timestamps();
});


        // Itens da venda
Schema::connection('tenant')->create('itens_vendas', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('venda_id')->references('id')->on('vendas')->onDelete('cascade');
    $table->foreignUuid('produto_id')->references('id')->on('produtos')->onDelete('cascade');
    $table->integer('quantidade');
    $table->decimal('preco_venda', 12, 2);
    $table->decimal('subtotal', 12, 2);
   $table->timestamps();
});

    }

    public function down()
    {
        Schema::connection('tenant')->dropIfExists('itens_venda');
        Schema::connection('tenant')->dropIfExists('vendas');
    }
};