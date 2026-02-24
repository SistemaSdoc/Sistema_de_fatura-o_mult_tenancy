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

            // Relacionamento com usuário
            $table->uuid('user_id');
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            // Dados do fornecedor
            $table->string('nome');
            $table->string('nif')->nullable()->unique(); // NIF pode ser nulo para internacionais
            $table->string('telefone')->nullable();
            $table->string('email')->nullable();
            $table->text('endereco')->nullable();

            // Estado e tipo
            $table->enum('tipo', ['nacional', 'internacional'])->default('nacional'); // ✅ CORRIGIDO (espaço removido)
            $table->enum('status', ['ativo', 'inativo'])->default('ativo');

            // Timestamps
            $table->timestamps();
            $table->softDeletes(); // ✅ Adicionado soft delete

            // Índices para performance
            $table->index('nome');
            $table->index('tipo');
            $table->index('status');
            $table->index('nif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fornecedores');
    }
};
