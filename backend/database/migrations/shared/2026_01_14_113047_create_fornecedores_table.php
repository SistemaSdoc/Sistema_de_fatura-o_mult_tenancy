<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: criar tabela fornecedores
 *
 * Deve ser executada ANTES da migration de produtos,
 * pois produtos tem FK para fornecedores.
 * Garante que o timestamp deste ficheiro é anterior ao de produtos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('shared')->create('fornecedores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id')->nullable()->index();

            $table->string('nome');
            $table->string('nif')->nullable()->unique();
            $table->string('telefone')->nullable();
            $table->string('email')->nullable();
            $table->text('endereco')->nullable();
            $table->enum('tipo', ['nacional', 'internacional'])->default('nacional');
            $table->enum('status', ['ativo', 'inativo'])->default('ativo');

            $table->timestamps();
            $table->softDeletes();

            $table->index('nome');
            $table->index('tipo');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fornecedores');
    }
};