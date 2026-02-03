<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fornecedores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users');

            // Dados do fornecedor
            $table->string('nome');
            $table->string('nif')->unique();
            $table->string('telefone')->nullable();
            $table->string('email')->nullable();
            $table->text('endereco')->nullable();

            // Estado
            $table->enum('tipo', ['nacional ', 'internacional'])->default('nacional ');
            $table->enum('status', ['ativo', 'inativo'])->default('ativo');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fornecedores');
    }
};
