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

            $table->foreignUuid('categoria_id')
                ->nullable()
                ->constrained('categorias')
                ->nullOnDelete();

            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Sem FK — fornecedores pode não existir ainda neste momento
            $table->uuid('fornecedor_id')->nullable()->index();

            $table->string('nome');
            $table->string('codigo', 50)->nullable()->unique();
            $table->text('descricao')->nullable();
            $table->enum('tipo', ['produto', 'servico'])->default('produto');
            $table->enum('status', ['ativo', 'inativo'])->default('ativo');

            $table->decimal('preco_compra', 15, 2)->default(0);
            $table->decimal('preco_venda', 15, 2);
            $table->decimal('custo_medio', 15, 2)->default(0);

            $table->boolean('sujeito_iva')->default(true);
            $table->decimal('taxa_iva', 5, 2);

            $table->decimal('taxa_retencao', 5, 2)->nullable();
            $table->string('codigo_isencao', 3)->nullable();
            $table->string('duracao_estimada', 50)->nullable();
            $table->enum('unidade_medida', ['hora', 'dia', 'semana', 'mes'])->nullable();

            $table->integer('estoque_atual')->default(0);
            $table->integer('estoque_minimo')->default(5);

            // Custos adicionais
            $table->decimal('despesas_adicionais', 15, 2)->default(0);

            // Estratégia de preço
            $table->enum('tipo_preco', ['margem', 'markup', 'fixo'])->default('margem');

// Percentuais
$table->decimal('margem_lucro', 5, 2)->nullable();
$table->decimal('markup', 5, 2)->nullable();

// Controlo de limites
$table->decimal('preco_minimo', 15, 2)->nullable();
$table->decimal('preco_maximo', 15, 2)->nullable();

// Produto com preço regulado
$table->boolean('preco_controlado')->default(false);

// Permitir venda abaixo do mínimo?
$table->boolean('permite_preco_livre')->default(false);

            $table->timestamps();
            $table->softDeletes();

            $table->index('tipo');
            $table->index('status');
            $table->index('nome');
            $table->index(['tipo', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};