<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
Schema::create('pagamentos', function (Blueprint $table) {
    $table->uuid('id')->primary();

    $table->uuid('fatura_id');
    $table->foreign('fatura_id')->references('id')->on('faturas');

    $table->uuid('user_id');
    $table->foreign('user_id')->references('id')->on('users');

    $table->enum('metodo', ['dinheiro', 'cartao', 'transferencia']);
    $table->decimal('valor_pago', 12, 2);
    $table->decimal('troco', 12, 2)->default(0);
    
    $table->string('referencia')->nullable();       

    $table->date('data_pagamento');
    $table->time('hora_pagamento');

    $table->timestamps();
});


    }

    public function down(): void
    {
        Schema::dropIfExists('pagamentos');
    }
};
