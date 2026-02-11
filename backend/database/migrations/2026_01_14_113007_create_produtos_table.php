<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produtos', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Nullable para permitir serviços sem categoria
            $table->uuid('categoria_id')->nullable();
            $table->foreign('categoria_id')->references('id')->on('categorias');

            // Nullable - será preenchido pelo controller
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users');

            $table->string('codigo')->nullable();
            $table->string('nome');
            $table->text('descricao')->nullable();

            $table->decimal('preco_compra', 12, 2)->default(0);
            $table->decimal('preco_venda', 12, 2);

            // Fiscal
            $table->boolean('sujeito_iva')->default(true);
            $table->decimal('taxa_iva', 5, 2)->default(14);

            // Campos específicos para serviços
            $table->decimal('retencao', 5, 2)->nullable(); // Retenção na fonte (%)
            $table->string('duracao_estimada')->nullable(); // Ex: "2"
            $table->enum('unidade_medida', ['hora', 'dia', 'semana', 'mes'])->nullable();

            $table->integer('estoque_atual')->default(0);
            $table->integer('estoque_minimo')->default(0);
            $table->decimal('custo_medio', 12, 2)->nullable();

            $table->enum('tipo', ['produto', 'servico'])->default('produto');
            $table->enum('status', ['ativo', 'inativo'])->default('ativo');

            $table->timestamps();
            $table->softDeletes(); // Adicionar soft deletes
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};
