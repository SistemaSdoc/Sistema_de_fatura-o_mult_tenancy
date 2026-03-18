<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: criar tabelas vendas e itens_venda
 *
 * Alterações face à versão anterior:
 *  - numero_documento da venda reflecte a separação do VendaService:
 *    a venda tem número interno (VD-XXXXXX); o número fiscal vem do
 *    DocumentoFiscal relacionado. O campo 'serie' é removido da venda
 *    pois já não é necessário — a série fiscal é exclusiva do DocumentoFiscal.
 *  - hash_fiscal removido da tabela vendas — a integridade fiscal é garantida
 *    pelo DocumentoFiscal (que tem hash_fiscal + rsa_assinatura + qr_code)
 *  - itens_venda: campo 'codigo_isencao' adicionado para SAF-T
 *  - softDeletes() adicionado à tabela vendas para consistência com produtos
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Vendas ────────────────────────────────────────────────────────
        Schema::create('vendas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // ── Relacionamentos ──────────────────────────────────────────
            $table->foreignUuid('cliente_id')
                ->nullable()
                ->constrained('clientes')
                ->nullOnDelete();

            $table->string('cliente_nome')->nullable();   // cliente avulso
            $table->string('cliente_nif', 20)->nullable();

            $table->foreignUuid('user_id')
                ->constrained('users');

            // documento_fiscal_id sem FK — evita dependência circular.
            // A relação é gerida pelo DocumentoFiscalService via venda_id.
            $table->uuid('documento_fiscal_id')->nullable()->index();

            // ── Numeração interna da venda ───────────────────────────────
            // O número fiscal (FT-00001, FR-00001, etc.) está no DocumentoFiscal.
            // Aqui guardamos apenas o número sequencial interno (VD-000001).
            $table->integer('numero');
            $table->string('numero_documento', 50)->nullable()->index();

            // ── Totais ───────────────────────────────────────────────────
            $table->decimal('base_tributavel', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total_retencao', 15, 2)->default(0);
            $table->decimal('total_pagar', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            // ── Datas ────────────────────────────────────────────────────
            $table->date('data_venda');
            $table->time('hora_venda');

            // ── Estado ───────────────────────────────────────────────────
            $table->enum('status', ['aberta', 'faturada', 'cancelada'])->default('aberta');
            $table->enum('estado_pagamento', ['pendente', 'paga', 'parcial', 'cancelada'])
                ->default('pendente');

            // Tipo de documento fiscal que originou esta venda (FT, FR, FP, FA…)
            $table->string('tipo_documento_fiscal', 10)->nullable();

            $table->text('observacoes')->nullable();

            // ── Timestamps e soft delete ─────────────────────────────────
            $table->timestamps();
            $table->softDeletes();

            // ── Índices ──────────────────────────────────────────────────
            $table->index('cliente_id');
            $table->index('status');
            $table->index('estado_pagamento');
            $table->index('data_venda');
            $table->index('tipo_documento_fiscal');
            $table->index(['status', 'estado_pagamento']);
            $table->index(['data_venda', 'tipo_documento_fiscal']);
            $table->index(['cliente_id', 'estado_pagamento']);
        });

        // ── Itens da venda ────────────────────────────────────────────────
        Schema::create('itens_venda', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('venda_id')
                ->constrained('vendas')
                ->onDelete('cascade');

            $table->foreignUuid('produto_id')
                ->nullable()
                ->constrained('produtos')
                ->nullOnDelete();

            // ── Dados do item no momento da venda ────────────────────────
            $table->string('descricao', 255);
            $table->string('codigo_produto', 50)->nullable();
            $table->string('unidade', 10)->default('UN');
            $table->integer('quantidade');
            $table->decimal('preco_venda', 15, 4);
            $table->decimal('desconto', 15, 2)->default(0);

            // ── Fiscal ───────────────────────────────────────────────────
            $table->decimal('base_tributavel', 15, 2)->default(0);
            // Taxas válidas Angola: 0%, 5%, 14%
            $table->decimal('taxa_iva', 5, 2)->default(14.00);
            $table->decimal('valor_iva', 15, 2)->default(0);
            // Código de isenção — SAF-T TaxExemptionCode (M00–M99)
            $table->string('codigo_isencao', 3)->nullable();
            // Retenção na fonte — apenas para serviços
            $table->decimal('taxa_retencao', 5, 2)->default(0);
            $table->decimal('valor_retencao', 15, 2)->default(0);

            $table->decimal('subtotal', 15, 2)->default(0);

            $table->timestamps();

            // ── Índices ──────────────────────────────────────────────────
            $table->index('venda_id');
            $table->index('produto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itens_venda');
        Schema::dropIfExists('vendas');
    }
};