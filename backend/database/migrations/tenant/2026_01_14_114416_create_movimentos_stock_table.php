<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: criar tabela movimentos_stock
 *
 * Alterações face às versões anteriores:
 *  - Migration de "fix de foreign key cascade" (versão separada) eliminada —
 *    a FK com cascade está aqui desde o início
 *  - 'venda_cancelada' adicionado ao enum tipo_movimento — usado pelo
 *    VendaService::cancelarVenda() ao devolver stock
 *  - Enum 'tipo' simplificado para entrada | saida (sem 'ajuste' redundante
 *    — o tipo_movimento='ajuste' já distingue o contexto)
 *  - Índice em 'referencia' incluído — necessário para buscar movimentos
 *    associados a um documento fiscal específico
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimentos_stock', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // ── Relacionamentos ──────────────────────────────────────────
            $table->foreignUuid('produto_id')
                ->constrained('produtos')
                ->onDelete('cascade');

            $table->foreignUuid('user_id')
                ->constrained('users')
                ->onDelete('restrict');

            // ── Tipo de movimento ────────────────────────────────────────
            // entrada: stock aumenta | saida: stock diminui
            $table->enum('tipo', ['entrada', 'saida']);

            // Contexto do movimento — alinhado com StockService e VendaService
            $table->enum('tipo_movimento', [
                'compra',           // StockService::entradaCompra()
                'venda',            // StockService::saidaVenda() — originado por FT/FR
                'nota_credito',     // StockService::processarDocumentoFiscal() — NC
                'ajuste',           // StockService::ajusteManual() + reversões por cancelamento
                'venda_cancelada',  // VendaService::cancelarVenda() — devolução ao stock
                'devolucao',        // devolução avulsa
            ]);

            // ── Quantidades e rastreabilidade ────────────────────────────
            $table->integer('quantidade');        // positivo = entrada; negativo = saida
            $table->integer('estoque_anterior')->default(0);
            $table->integer('estoque_novo')->default(0);
            $table->integer('stock_minimo')->default(0); // valor no momento do movimento

            // ── Custo ────────────────────────────────────────────────────
            $table->decimal('custo_medio', 15, 2)->default(0);   // custo médio após movimento
            $table->decimal('custo_unitario', 15, 2)->nullable(); // custo da transacção

            // ── Rastreabilidade ──────────────────────────────────────────
            // referencia: ID do DocumentoFiscal, Compra ou outro documento de origem
            $table->string('referencia', 100)->nullable();
            $table->text('observacao')->nullable();

            // ── Timestamps ───────────────────────────────────────────────
            $table->timestamps();

            // ── Índices ──────────────────────────────────────────────────
            $table->index('produto_id');
            $table->index('user_id');
            $table->index('tipo');
            $table->index('tipo_movimento');
            $table->index('created_at');
            $table->index('referencia');                       // busca por documento fiscal
            $table->index(['produto_id', 'created_at']);       // histórico de um produto
            $table->index(['tipo_movimento', 'created_at']);   // relatórios por tipo e período
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimentos_stock');
    }
};