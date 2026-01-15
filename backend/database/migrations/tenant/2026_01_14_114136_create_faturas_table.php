<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up()
    {
        // Faturas
 Schema::connection('tenant')->create('faturas', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('venda_id')->references('id')->on('vendas')->onDelete('cascade');
    $table->string('numero')->unique();
    $table->decimal('total', 12, 2);
    $table->enum('status', ['emitida', 'cancelada'])->default('emitida');
    $table->string('hash'); // hash fiscal
   $table->timestamps();
});


        // Itens da fatura
Schema::connection('tenant')->create('itens_fatura', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('fatura_id')->references('id')->on('faturas')->onDelete('cascade');
    $table->string('descricao');
    $table->integer('quantidade');
    $table->decimal('preco', 12, 2);
    $table->decimal('iva', 12, 2);
    $table->decimal('subtotal', 12, 2);
    $table->timestamps();
});

    }

    public function down()
    {
        Schema::connection('tenant')->dropIfExists('itens_fatura');
        Schema::connection('tenant')->dropIfExists('faturas');
    }
};