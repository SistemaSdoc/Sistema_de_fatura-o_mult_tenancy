<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
Schema::create('empresas', function (Blueprint $table) {
    $table->uuid('id')->primary();

    $table->string('nome');
    $table->string('nif')->unique();
    $table->string('email')->unique();
    $table->string('telefone')->nullable();
    $table->text('endereco')->nullable();

    // Fiscal
    $table->enum('regime_fiscal', ['simplificado', 'geral'])->default('geral');
    $table->boolean('sujeito_iva')->default(true);

    $table->string('logo')->nullable();
    $table->enum('status', ['ativo', 'suspenso'])->default('ativo');

    $table->date('data_registro')->nullable();
    $table->timestamps();
});

    }

    public function down(): void
    {
        Schema::dropIfExists('empresas');
    }
};
