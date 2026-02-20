<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimentos_stock', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Relações com cascade delete
            $table->foreignUuid('produto_id')
                ->constrained('produtos')
                ->onDelete('cascade');

            $table->foreignUuid('user_id')
                ->constrained('users')
                ->onDelete('restrict');

            // Tipo de movimento (entrada/saída)
            $table->enum('tipo', ['entrada', 'saida']);

            // Contexto do movimento - ATUALIZADO: adicionado 'nota_credito'
            $table->enum('tipo_movimento', [
                'compra',
                'venda',
                'ajuste',
                'nota_credito', // ATUALIZADO: Para NC
                'devolucao',
                'transferencia'
            ]);

            // Quantidades
            $table->integer('quantidade');
            $table->integer('estoque_anterior')->default(0);
            $table->integer('estoque_novo')->default(0);

            // Valores (para cálculo de custo médio)
            $table->decimal('custo_medio', 12, 2)->default(0);
            $table->decimal('custo_unitario', 12, 2)->nullable();

            // Referências externas - pode ser ID de Documento Fiscal
            $table->string('referencia', 100)->nullable();
            $table->text('observacao')->nullable();

            // Stock mínimo do produto no momento do movimento
            $table->integer('stock_minimo')->default(0);

            $table->timestamps();

            // Índices para performance
            $table->index('produto_id');
            $table->index('user_id');
            $table->index('tipo');
            $table->index('tipo_movimento');
            $table->index('created_at');
            $table->index(['produto_id', 'created_at']);
            $table->index('referencia'); // NOVO: Para buscar por documento fiscal
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimentos_stock');
    }
};
