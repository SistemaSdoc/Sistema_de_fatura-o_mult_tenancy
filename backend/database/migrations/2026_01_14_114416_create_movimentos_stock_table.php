<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
Schema::create('movimentos_stock', function (Blueprint $table) {
    $table->uuid('id')->primary();

    $table->uuid('produto_id');
    $table->foreign('produto_id')->references('id')->on('produtos');

    $table->uuid('user_id');
    $table->foreign('user_id')->references('id')->on('users');
    
    $table->enum('tipo', ['entrada', 'saida']);
    $table->enum('tipo_movimento', ['compra', 'venda', 'ajuste', 'nota_credito']);

    $table->decimal('custo_medio', 12, 2)->default(0);
    $table->integer('stock_minimo')->default(5);

    $table->integer('quantidade');
    $table->string('referencia')->nullable();
    $table->string('observacao')->nullable();

    $table->timestamps();
});


    }

    public function down(): void
    {
        Schema::dropIfExists('movimentos_stock');
    }
};
