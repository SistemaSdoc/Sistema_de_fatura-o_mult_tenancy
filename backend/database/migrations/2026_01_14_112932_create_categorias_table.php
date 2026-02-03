<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categorias', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Dados da categoria
            $table->string('nome');
            $table->text('descricao')->nullable();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users');

            // Estado
            $table->enum('status', ['ativo', 'inativo'])->default('ativo');
            $table->enum('tipo', ['produto','servico'])->default('produto');


            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categorias');
    }
};
