<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up()
    {
Schema::create('movimentos_stock', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->enum('tipo', ['entrada', 'saida']);
    $table->string('origem'); // compra, venda, ajuste
    $table->string('referencia')->nullable();
    $table->foreignUuid('produto_id')->references('id')->on('produtos')->onDelete('cascade');
    $table->integer('quantidade');
    $table->timestamps();
});

    }

    public function down()
    {
        Schema::dropIfExists('movimentos_stock');
    }
};