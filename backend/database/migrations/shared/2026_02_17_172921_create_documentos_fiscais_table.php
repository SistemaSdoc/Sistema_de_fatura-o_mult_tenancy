<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $schema = Schema::connection('shared');

        // ── Documentos Fiscais ────────────────────────────────────────────
        $schema->create('documentos_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');

            $table->foreignUuid('user_id')->constrained('users');

            $table->uuid('venda_id')->nullable()->index();

            $table->foreignUuid('cliente_id')
                ->nullable()
                ->constrained('clientes')
                ->nullOnDelete();

            $table->string('cliente_nome')->nullable();
            $table->string('cliente_nif', 20)->nullable();

            $table->uuid('fatura_id')->nullable()->index();

            $table->string('serie', 10);
            $table->integer('numero');
            $table->string('numero_documento', 50)->unique();

            $table->enum('tipo_documento', [
                'FT', 'FR', 'FP', 'FA', 'NC', 'ND', 'RC',
            ]);

            $table->date('data_emissao');
            $table->time('hora_emissao');
            $table->date('data_vencimento')->nullable();
            $table->date('data_cancelamento')->nullable();

            $table->decimal('base_tributavel', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total_retencao', 15, 2)->default(0);
            $table->decimal('total_liquido', 15, 2)->default(0);

            $table->enum('estado', [
                'emitido', 'paga', 'parcialmente_paga', 'cancelado', 'expirado',
            ])->default('emitido');

            $table->text('motivo')->nullable();
            $table->text('motivo_cancelamento')->nullable();
            $table->foreignUuid('user_cancelamento_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->enum('metodo_pagamento', [
                'transferencia', 'multibanco', 'dinheiro', 'cheque', 'cartao',
            ])->nullable();

            $table->string('cliente_endereco')->nullable();
            $table->string('cliente_cidade')->nullable();
            $table->string('cliente_pais', 2)->nullable();
            $table->unsignedTinyInteger('periodo')->nullable();

            $table->string('referencia_pagamento', 100)->nullable();

            // ── Campos AGT ───────────────────────────────────────────────
            $table->string('hash_fiscal', 64)->nullable();
            $table->text('rsa_assinatura')->nullable();
            $table->unsignedTinyInteger('rsa_versao_chave')->nullable();
            $table->string('hash_anterior', 64)->nullable();
            $table->string('qr_code', 500)->nullable();

            $table->string('referencia_externa', 100)->nullable();

            $table->timestamps();

            $table->index(['tipo_documento', 'estado']);
            $table->index('cliente_id');
            $table->index('data_emissao');
            $table->index('data_vencimento');
            $table->index(['serie', 'numero']);
            $table->index(['tipo_documento', 'created_at']);
            $table->index('hash_fiscal');
        });

        // Auto-relacionamento fatura_id
        $schema->table('documentos_fiscais', function (Blueprint $table) {
            $table->foreign('fatura_id')
                ->references('id')
                ->on('documentos_fiscais')
                ->nullOnDelete();
        });

        // ── Itens do Documento Fiscal ─────────────────────────────────────
        $schema->create('itens_documento_fiscal', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');

            $table->foreignUuid('documento_fiscal_id')
                ->constrained('documentos_fiscais')
                ->onDelete('cascade');

            $table->foreignUuid('produto_id')
                ->nullable()
                ->constrained('produtos')
                ->nullOnDelete();

            $table->uuid('item_origem_id')->nullable()->index();

            $table->string('descricao', 255);
            $table->string('referencia', 50)->nullable();
            $table->string('unidade', 10)->default('UN');
            $table->decimal('quantidade', 15, 4);
            $table->decimal('preco_unitario', 15, 4);
            $table->decimal('desconto', 15, 2)->default(0);
            $table->decimal('base_tributavel', 15, 2);

            $table->decimal('taxa_iva', 5, 2)->default(0);
            $table->decimal('valor_iva', 15, 2)->default(0);

            $table->string('codigo_isencao', 3)->nullable();
            $table->string('motivo_isencao', 255)->nullable();

            $table->decimal('taxa_retencao', 5, 2)->default(0);
            $table->decimal('valor_retencao', 15, 2)->default(0);

            $table->decimal('total_linha', 15, 2);
            $table->integer('ordem')->default(1);

            $table->text('motivo_alteracao')->nullable();
            $table->text('observacoes')->nullable();

            $table->timestamps();

            $table->index('documento_fiscal_id');
            $table->index('produto_id');
            $table->index(['documento_fiscal_id', 'ordem']);
        });

        // Auto-relacionamento itens
        $schema->table('itens_documento_fiscal', function (Blueprint $table) {
            $table->foreign('item_origem_id')
                ->references('id')
                ->on('itens_documento_fiscal')
                ->nullOnDelete();
        });

        // ── Pivot: adiantamento ↔ fatura ─────────────────────────────────
        $schema->create('adiantamento_fatura', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');

            $table->uuid('adiantamento_id')->index();
            $table->uuid('fatura_id')->index();
            $table->decimal('valor_utilizado', 15, 2);

            $table->timestamps();

            $table->unique(['adiantamento_id', 'fatura_id']);
        });

        // FKs da pivot
        $schema->table('adiantamento_fatura', function (Blueprint $table) {
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
        $schema = Schema::connection('shared');
        $schema->dropIfExists('adiantamento_fatura');
        $schema->dropIfExists('itens_documento_fiscal');
        $schema->dropIfExists('documentos_fiscais');
    }
};