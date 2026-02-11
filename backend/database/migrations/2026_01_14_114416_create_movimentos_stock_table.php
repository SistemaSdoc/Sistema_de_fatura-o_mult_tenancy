<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Verificar se a tabela já existe (migration já foi rodada antes)
        if (Schema::hasTable('movimentos_stock')) {
            // Tabela existe - vamos alterar a constraint

            // Remover foreign key existente se existir
            try {
                Schema::table('movimentos_stock', function (Blueprint $table) {
                    $table->dropForeign(['produto_id']);
                });
            } catch (\Exception $e) {
                // Foreign key pode não existir ou ter nome diferente, ignora erro
            }

            // Adicionar nova foreign key com cascade
            Schema::table('movimentos_stock', function (Blueprint $table) {
                $table->foreign('produto_id')
                    ->references('id')
                    ->on('produtos')
                    ->onDelete('cascade');
            });
        } else {
            // Tabela não existe - criar do zero com a constraint correta
            Schema::create('movimentos_stock', function (Blueprint $table) {
                $table->uuid('id')->primary();

                // Relações com cascade delete
                $table->uuid('produto_id');
                $table->foreign('produto_id')
                    ->references('id')
                    ->on('produtos')
                    ->onDelete('cascade');

                $table->uuid('user_id');
                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('restrict');

                // Tipo de movimento (entrada/saída)
                $table->enum('tipo', ['entrada', 'saida', 'ajuste']);

                // Contexto do movimento
                $table->enum('tipo_movimento', [
                    'compra',
                    'venda',
                    'ajuste',
                    'nota_credito',
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

                // Referências externas
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
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('movimentos_stock')) {
            // Tentar remover a foreign key cascade e voltar para restrict
            try {
                Schema::table('movimentos_stock', function (Blueprint $table) {
                    $table->dropForeign(['produto_id']);
                });

                Schema::table('movimentos_stock', function (Blueprint $table) {
                    $table->foreign('produto_id')
                        ->references('id')
                        ->on('produtos')
                        ->onDelete('restrict');
                });
            } catch (\Exception $e) {
                // Se falhar, dropa a tabela inteira
                Schema::dropIfExists('movimentos_stock');
            }
        }
    }
};
