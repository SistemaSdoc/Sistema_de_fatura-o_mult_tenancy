<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: criar tabelas documentos_fiscais, itens_documento_fiscal
 * e adiantamento_fatura
 *
 * Alterações face às versões anteriores:
 *  - Migration separada "add_FP_to_tipo_documento" eliminada — FP incluído
 *    desde o início no enum tipo_documento
 *  - Campos AGT adicionados à tabela documentos_fiscais:
 *      · rsa_assinatura    — assinatura RSA-SHA256 do fabricante (base64)
 *      · rsa_versao_chave  — versão do par de chaves usado (AGT obrigatório)
 *      · hash_anterior     — hash do documento anterior da mesma série
 *                            (hash encadeado — AGT obrigatório)
 *      · qr_code           — conteúdo do QR Code (DP 71/25, em vigor Set/2025)
 *  - itens_documento_fiscal: campos 'codigo_isencao' e 'motivo_isencao'
 *    adicionados — SAF-T (AO) campo TaxExemptionCode e TaxExemptionReason
 *  - Índice parcial MySQL removido (whereIn no index não é suportado em
 *    Laravel cross-DB) — substituído por índice normal
 *  - FKs e auto-relacionamentos mantidos exactamente como antes
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Documentos Fiscais ────────────────────────────────────────────
        Schema::create('documentos_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // ── Relacionamentos ──────────────────────────────────────────
            $table->foreignUuid('user_id')
                ->constrained('users');

            // venda_id sem FK directa — evita dependência circular com tabela vendas
            $table->uuid('venda_id')->nullable()->index();

            $table->foreignUuid('cliente_id')
                ->nullable()
                ->constrained('clientes')
                ->nullOnDelete();

            $table->string('cliente_nome')->nullable();
            $table->string('cliente_nif', 20)->nullable();

            // Auto-relacionamento para NC, ND, RC, FRt — FK adicionada abaixo
            $table->uuid('fatura_id')->nullable()->index();

            // ── Numeração fiscal ─────────────────────────────────────────
            $table->string('serie', 10);
            $table->integer('numero');
            $table->string('numero_documento', 50)->unique();

            // ── Tipo de documento ────────────────────────────────────────
            $table->enum('tipo_documento', [
                'FT',  // Fatura                   — É venda, afecta stock
                'FR',  // Fatura-Recibo             — É venda, afecta stock
                'FP',  // Fatura Proforma           — Não é venda, não afecta stock
                'FA',  // Fatura de Adiantamento    — Não é venda
                'NC',  // Nota de Crédito           — Não é venda, afecta stock
                'ND',  // Nota de Débito            — Não é venda
                'RC',  // Recibo                    — É venda
                'FRt', // Fatura de Retificação     — Não é venda
            ]);

            // ── Datas ────────────────────────────────────────────────────
            $table->date('data_emissao');
            $table->time('hora_emissao');
            $table->date('data_vencimento')->nullable();
            $table->date('data_cancelamento')->nullable();

            // ── Totais ───────────────────────────────────────────────────
            $table->decimal('base_tributavel', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total_retencao', 15, 2)->default(0);
            $table->decimal('total_liquido', 15, 2)->default(0);

            // ── Estado ───────────────────────────────────────────────────
            $table->enum('estado', [
                'emitido',
                'paga',
                'parcialmente_paga',
                'cancelado',
                'expirado',
            ])->default('emitido');

            // ── Cancelamento ─────────────────────────────────────────────
            $table->text('motivo')->nullable();
            $table->text('motivo_cancelamento')->nullable();
            $table->foreignUuid('user_cancelamento_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // ── Pagamento (para FR e RC) ──────────────────────────────────
            $table->enum('metodo_pagamento', [
                'transferencia',
                'multibanco',
                'dinheiro',
                'cheque',
                'cartao',
            ])->nullable();
            $table->string('referencia_pagamento', 100)->nullable();

            // ── Campos AGT — Assinatura RSA (obrigatório para certificação) ──
            //
            // hash_fiscal      : SHA-256 dos dados de assinatura
            //                    Formato: data;hora;numero_doc;total;hash_anterior
            // rsa_assinatura   : assinatura RSA-SHA256 em base64 (chave privada do fabricante)
            // rsa_versao_chave : versão do par RSA usado — incrementar ao trocar chaves
            // hash_anterior    : hash_fiscal do documento anterior da mesma série
            //                    (encadeamento obrigatório pela AGT)
            //
            // ATENÇÃO: estes campos são IMUTÁVEIS após a emissão do documento.
            // O DocumentoFiscalService.cancelarDocumento() NUNCA os actualiza.
            $table->string('hash_fiscal', 64)->nullable();       // SHA-256 = 64 chars hex
            $table->text('rsa_assinatura')->nullable();          // base64 pode ser longo
            $table->unsignedTinyInteger('rsa_versao_chave')->nullable();
            $table->string('hash_anterior', 64)->nullable();

            // ── Campo AGT — QR Code (DP 71/25, obrigatório desde Set/2025) ──
            //
            // Conteúdo: NIF_EMITENTE*NIF_CLIENTE*DATA*BASE*IVA*TOTAL*HASH4*CERT
            // Gerado pelo DocumentoFiscalService após assinatura RSA.
            // Impresso em todos os documentos (PDF e papel).
            $table->string('qr_code', 500)->nullable();

            // Referência externa (número de encomenda, contrato, etc.)
            $table->string('referencia_externa', 100)->nullable();

            // ── Timestamps ───────────────────────────────────────────────
            $table->timestamps();

            // ── Índices ──────────────────────────────────────────────────
            $table->index(['tipo_documento', 'estado']);
            $table->index('cliente_id');
            $table->index('data_emissao');
            $table->index('data_vencimento');
            $table->index(['serie', 'numero']);
            $table->index(['tipo_documento', 'created_at']);
            // Índice para auditoria AGT — busca por hash
            $table->index('hash_fiscal');
        });

        // Auto-relacionamento — adicionado após criação da tabela
        Schema::table('documentos_fiscais', function (Blueprint $table) {
            $table->foreign('fatura_id')
                ->references('id')
                ->on('documentos_fiscais')
                ->nullOnDelete();
        });

        // ── Itens do Documento Fiscal ─────────────────────────────────────
        Schema::create('itens_documento_fiscal', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('documento_fiscal_id')
                ->constrained('documentos_fiscais')
                ->onDelete('cascade');

            $table->foreignUuid('produto_id')
                ->nullable()
                ->constrained('produtos')
                ->nullOnDelete();

            // Auto-relacionamento para NC, ND, FRt — FK adicionada abaixo
            $table->uuid('item_origem_id')->nullable()->index();

            // ── Dados do item ────────────────────────────────────────────
            $table->string('descricao', 255);
            $table->string('referencia', 50)->nullable();
            $table->string('unidade', 10)->default('UN');
            $table->decimal('quantidade', 15, 4);
            $table->decimal('preco_unitario', 15, 4);
            $table->decimal('desconto', 15, 2)->default(0);
            $table->decimal('base_tributavel', 15, 2);

            // ── Fiscal ───────────────────────────────────────────────────
            // Taxas válidas Angola: 0%, 5%, 14%
            $table->decimal('taxa_iva', 5, 2)->default(0);
            $table->decimal('valor_iva', 15, 2)->default(0);

            // SAF-T (AO): TaxExemptionCode e TaxExemptionReason
            // Obrigatório quando taxa_iva = 0%
            $table->string('codigo_isencao', 3)->nullable();     // M00–M99
            $table->string('motivo_isencao', 255)->nullable();

            // Retenção na fonte — apenas para serviços
            // Taxas válidas: 2%, 5%, 6.5%, 10%, 15% (Art. 67.º IRPC)
            $table->decimal('taxa_retencao', 5, 2)->default(0);
            $table->decimal('valor_retencao', 15, 2)->default(0);

            $table->decimal('total_linha', 15, 2);
            $table->integer('ordem')->default(1);

            $table->text('motivo_alteracao')->nullable();
            $table->text('observacoes')->nullable();

            $table->timestamps();

            // ── Índices ──────────────────────────────────────────────────
            $table->index('documento_fiscal_id');
            $table->index('produto_id');
            $table->index(['documento_fiscal_id', 'ordem']);
        });

        // Auto-relacionamento de itens
        Schema::table('itens_documento_fiscal', function (Blueprint $table) {
            $table->foreign('item_origem_id')
                ->references('id')
                ->on('itens_documento_fiscal')
                ->nullOnDelete();
        });

        // ── Pivot: adiantamento ↔ fatura ─────────────────────────────────
        Schema::create('adiantamento_fatura', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // FA (adiantamento) → FT (fatura)
            $table->uuid('adiantamento_id')->index();
            $table->uuid('fatura_id')->index();
            $table->decimal('valor_utilizado', 15, 2);

            $table->timestamps();

            // Um adiantamento só pode ser vinculado uma vez a cada fatura
            $table->unique(['adiantamento_id', 'fatura_id']);
        });

        // FKs da tabela pivot
        Schema::table('adiantamento_fatura', function (Blueprint $table) {
            $table->foreign('adiantamento_id')
                ->references('id')
                ->on('documentos_fiscais')
                ->onDelete('cascade');

            $table->foreign('fatura_id')
                ->references('id')
                ->on('documentos_fiscais')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adiantamento_fatura');
        Schema::dropIfExists('itens_documento_fiscal');
        Schema::dropIfExists('documentos_fiscais');
    }
};