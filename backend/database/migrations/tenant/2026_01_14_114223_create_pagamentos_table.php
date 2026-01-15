<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up()
    {
Schema::connection('tenant')->create('pagamentos', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('fatura_id')->references('id')->on('faturas')->onDelete('cascade');
    $table->enum('metodo', ['dinheiro', 'cartao', 'transferencia']);
    $table->decimal('valor_pago', 12, 2);
    $table->decimal('troco', 12, 2)->default(0);
    $table->dateTime('data');
   $table->timestamps();
});

    }

    public function down()
    {
        Schema::connection('tenant')->dropIfExists('pagamentos');
    }
};