<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Desabilitar checagem de foreign keys temporariamente
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        try {
            // Verificar se a tabela movimentos_stock existe
            if (Schema::hasTable('movimentos_stock')) {

                // Remover a foreign key existente (tenta vários nomes possíveis)
                $foreignKeys = DB::select("
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_NAME = 'movimentos_stock'
                    AND COLUMN_NAME = 'produto_id'
                    AND TABLE_SCHEMA = DATABASE()
                ");

                foreach ($foreignKeys as $key) {
                    try {
                        Schema::table('movimentos_stock', function (Blueprint $table) use ($key) {
                            $table->dropForeign($key->CONSTRAINT_NAME);
                        });
                    } catch (\Exception $e) {
                        // Ignora se não conseguir dropar
                    }
                }

                // Adicionar nova foreign key com CASCADE
                Schema::table('movimentos_stock', function (Blueprint $table) {
                    $table->foreign('produto_id')
                        ->references('id')
                        ->on('produtos')
                        ->onDelete('cascade');
                });

            } else {
                // Se a tabela não existe, recriar ela completa
                Schema::create('movimentos_stock', function (Blueprint $table) {
                    $table->uuid('id')->primary();

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

                    $table->enum('tipo', ['entrada', 'saida', 'ajuste']);
                    $table->enum('tipo_movimento', [
                        'compra',
                        'venda',
                        'ajuste',
                        'nota_credito',
                        'devolucao',
                        'transferencia'
                    ]);
                    $table->integer('quantidade');
                    $table->integer('estoque_anterior')->default(0);
                    $table->integer('estoque_novo')->default(0);
                    $table->decimal('custo_medio', 12, 2)->default(0);
                    $table->decimal('custo_unitario', 12, 2)->nullable();
                    $table->string('referencia', 100)->nullable();
                    $table->text('observacao')->nullable();
                    $table->integer('stock_minimo')->default(0);
                    $table->timestamps();

                    $table->index('produto_id');
                    $table->index('user_id');
                    $table->index('tipo');
                    $table->index('tipo_movimento');
                    $table->index('created_at');
                    $table->index(['produto_id', 'created_at']);
                });
            }
        } finally {
            // Reabilitar checagem de foreign keys
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }
    }

    public function down(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        try {
            if (Schema::hasTable('movimentos_stock')) {
                // Remove a foreign key cascade
                $foreignKeys = DB::select("
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_NAME = 'movimentos_stock'
                    AND COLUMN_NAME = 'produto_id'
                    AND TABLE_SCHEMA = DATABASE()
                ");

                foreach ($foreignKeys as $key) {
                    try {
                        Schema::table('movimentos_stock', function (Blueprint $table) use ($key) {
                            $table->dropForeign($key->CONSTRAINT_NAME);
                        });
                    } catch (\Exception $e) {
                        // Ignora erro
                    }
                }

                // Recria com RESTRICT (volta ao original)
                Schema::table('movimentos_stock', function (Blueprint $table) {
                    $table->foreign('produto_id')
                        ->references('id')
                        ->on('produtos')
                        ->onDelete('restrict');
                });
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }
    }
};
