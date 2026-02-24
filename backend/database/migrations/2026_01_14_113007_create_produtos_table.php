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

            // ===== RELACIONAMENTOS =====
            // Nullable para permitir serviços sem categoria
            $table->uuid('categoria_id')->nullable();
            $table->foreign('categoria_id')->references('id')->on('categorias')->nullOnDelete();

            // Nullable - será preenchido pelo controller
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            // ⚠️ COMENTADO TEMPORARIAMENTE - A FK será adicionada após a tabela fornecedores existir
            $table->uuid('fornecedor_id')->nullable();
            // $table->foreign('fornecedor_id')->references('id')->on('fornecedores')->nullOnDelete();

            // ===== IDENTIFICAÇÃO =====
            $table->string('codigo')->nullable()->unique(); // Código único (SKU)
            $table->string('nome');
            $table->text('descricao')->nullable();

            // ===== PREÇOS =====
            $table->decimal('preco_compra', 12, 2)->default(0);
            $table->decimal('preco_venda', 12, 2);
            $table->decimal('custo_medio', 12, 2)->nullable();

            // ===== FISCAL =====
            $table->boolean('sujeito_iva')->default(true);
            $table->decimal('taxa_iva', 5, 2)->default(14);

            // ===== CAMPOS ESPECÍFICOS PARA SERVIÇOS =====
            $table->decimal('retencao', 5, 2)->nullable(); // Retenção na fonte (%) - 6.5% em Angola
            $table->string('duracao_estimada')->nullable(); // Ex: "2 horas", "1 dia"
            $table->enum('unidade_medida', ['hora', 'dia', 'semana', 'mes'])->nullable();

            // ===== ESTOQUE (APENAS PARA PRODUTOS) =====
            $table->integer('estoque_atual')->default(0);
            $table->integer('estoque_minimo')->default(0);

            // ===== TIPO E STATUS =====
            $table->enum('tipo', ['produto', 'servico'])->default('produto');
            $table->enum('status', ['ativo', 'inativo'])->default('ativo');

            // ===== TIMESTAMPS =====
            $table->timestamps();
            $table->softDeletes(); // deleted_at para soft delete

            // ===== ÍNDICES =====
            $table->index('tipo');
            $table->index('status');
            $table->index('categoria_id');
            $table->index('codigo');
            $table->index('nome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};
