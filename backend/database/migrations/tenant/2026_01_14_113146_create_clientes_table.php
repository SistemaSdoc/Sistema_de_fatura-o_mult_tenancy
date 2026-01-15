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
Schema::connection('tenant')->create('clientes', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('nome');
    $table->string('nif')->nullable();
    $table->enum('tipo', ['consumidor_final', 'empresa'])->default('consumidor_final');
    $table->string('telefone')->nullable();
    $table->string('email')->nullable();
    $table->text('endereco')->nullable();
    $table->timestamps();
});


    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('clientes');
    }
};
