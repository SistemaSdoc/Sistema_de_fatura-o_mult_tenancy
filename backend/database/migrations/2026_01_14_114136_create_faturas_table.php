<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up()
    {
        // Faturas
Schema::create('faturas', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('cliente_id')->nullable()->constrained('clientes')->onDelete('set null');
    $table->foreignUuid('venda_id')->references('id')->on('vendas')->onDelete('cascade');
    $table->string('numero')->unique();
    $table->decimal('total', 12, 2)->default(0.00);
    $table->enum('status', ['emitida', 'cancelada'])->default('emitida');
    $table->string('hash')->nullable(); 
    $table->timestamps();
});


        // Itens da fatura
Schema::create('itens_fatura', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('fatura_id')->references('id')->on('faturas')->onDelete('cascade');
    $table->string('descricao');
    $table->integer('quantidade')->default(1);
    $table->decimal('preco', 12, 2)->default(0.00);
    $table->decimal('iva', 12, 2)->default(0.00);
    $table->decimal('desconto', 12,2)->default(0); // valor absoluto do desconto
    $table->decimal('subtotal', 12, 2)->default(0.00);
    $table->timestamps();
});


    }

    public function down()
    {
        Schema::dropIfExists('itens_fatura');
        Schema::dropIfExists('faturas');
    }
};