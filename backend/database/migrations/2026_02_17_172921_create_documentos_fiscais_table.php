<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabela de Documentos Fiscais (unificada)
        Schema::create('documentos_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Relacionamentos
            $table->foreignUuid('user_id')->constrained('users');

            // venda_id SEM foreign key (evita circular, será controlado via código)
            $table->uuid('venda_id')->nullable();
            $table->index('venda_id');

            $table->foreignUuid('cliente_id')->nullable()->constrained('clientes');

            // Documento de origem (para NC, ND, RC, FRt) - auto-relacionamento
            $table->uuid('fatura_id')->nullable();
            $table->index('fatura_id');

            // Numeração fiscal
            $table->string('serie', 10);
            $table->integer('numero');
            $table->string('numero_documento', 50)->unique();

            // Tipo de documento (NOVO: FA, REMOVIDO: NA, PF, PFA)
            $table->enum('tipo_documento', [
                'FT',   // Fatura
                'FR',   // Fatura-Recibo
                'FA',   // Fatura de Adiantamento (NOVO)
                'NC',   // Nota de Crédito
                'ND',   // Nota de Débito
                'RC',   // Recibo
                'FRt'   // Fatura de Retificação
            ]);

            // Datas
            $table->date('data_emissao');
            $table->time('hora_emissao');
            $table->date('data_vencimento')->nullable();
            $table->date('data_cancelamento')->nullable(); // ALTERADO: data_anulacao -> data_cancelamento

            // Totais
            $table->decimal('base_tributavel', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total_retencao', 15, 2)->default(0);
            $table->decimal('total_liquido', 15, 2)->default(0);

            // Estados atualizados (NOVOS: emitido, cancelado, expirado | REMOVIDOS: emitida, anulada, convertida, vinculada)
            $table->enum('estado', [
                'emitido',           // ALTERADO: emitida -> emitido
                'paga',              // Mantido
                'parcialmente_paga', // Mantido
                'cancelado',         // ALTERADO: anulada -> cancelado
                'expirado'           // NOVO (para FA com data de entrega vencida)
            ])->default('emitido');

            // Motivos e cancelamento (ALTERADO: motivo_anulacao -> motivo_cancelamento)
            $table->text('motivo')->nullable(); // Motivo de NC, ND, FRt ou cancelamento
            $table->text('motivo_cancelamento')->nullable(); // ALTERADO
            $table->foreignUuid('user_cancelamento_id')->nullable()->constrained('users'); // ALTERADO

            // Dados de pagamento (para FR e RC)
            $table->enum('metodo_pagamento', [
                'transferencia',
                'multibanco',
                'dinheiro',
                'cheque',
                'cartao'
            ])->nullable();
            $table->string('referencia_pagamento', 100)->nullable();

            // Integridade e referências
            $table->string('hash_fiscal', 255)->nullable();
            $table->string('referencia_externa', 100)->nullable();

            $table->timestamps();

            // Índices otimizados
            $table->index(['tipo_documento', 'estado']);
            $table->index('cliente_id');
            $table->index('data_emissao');
            $table->index(['serie', 'numero']);
            $table->index('data_vencimento'); // NOVO: para controle de expiração de FA
        });

        // Adicionar FK de auto-relacionamento depois de criar a tabela
        Schema::table('documentos_fiscais', function (Blueprint $table) {
            $table->foreign('fatura_id')
                ->references('id')
                ->on('documentos_fiscais')
                ->nullOnDelete();
        });

        // Tabela de Itens do Documento Fiscal
        Schema::create('itens_documento_fiscal', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Relacionamentos
            $table->foreignUuid('documento_fiscal_id')
                ->constrained('documentos_fiscais')
                ->onDelete('cascade');

            $table->foreignUuid('produto_id')
                ->nullable()
                ->constrained('produtos')
                ->nullOnDelete();

            // Item de origem (para NC, ND, FRt) - auto-relacionamento
            $table->uuid('item_origem_id')->nullable();
            $table->index('item_origem_id');

            // Descrição do item
            $table->string('descricao', 255);
            $table->string('referencia', 50)->nullable();

            // Quantidade e unidade
            $table->decimal('quantidade', 15, 4);
            $table->string('unidade', 10)->default('UN');

            // Valores
            $table->decimal('preco_unitario', 15, 4);
            $table->decimal('desconto', 15, 2)->default(0);
            $table->decimal('base_tributavel', 15, 2);

            // IVA
            $table->decimal('taxa_iva', 5, 2)->default(0);
            $table->decimal('valor_iva', 15, 2)->default(0);

            // Retenção na fonte
            $table->decimal('taxa_retencao', 5, 2)->default(0);
            $table->decimal('valor_retencao', 15, 2)->default(0);

            // Total da linha
            $table->decimal('total_linha', 15, 2);

            // Ordenação
            $table->integer('ordem')->default(1);

            // Campos para retificação
            $table->text('motivo_alteracao')->nullable();
            $table->text('observacoes')->nullable();

            $table->timestamps();

            // Índices
            $table->index('documento_fiscal_id');
            $table->index('produto_id');
        });

        // FK de auto-relacionamento para itens
        Schema::table('itens_documento_fiscal', function (Blueprint $table) {
            $table->foreign('item_origem_id')
                ->references('id')
                ->on('itens_documento_fiscal')
                ->nullOnDelete();
        });

        // Tabela pivot para vinculação de adiantamentos (FA) a faturas (FT)
        Schema::create('adiantamento_fatura', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // FA (adiantamento) -> FT (fatura)
            $table->uuid('adiantamento_id');
            $table->index('adiantamento_id');

            $table->uuid('fatura_id');
            $table->index('fatura_id');

            $table->decimal('valor_utilizado', 15, 2);

            $table->timestamps();

            // Garante que um adiantamento só é vinculado uma vez a cada fatura
            $table->unique(['adiantamento_id', 'fatura_id']);
        });

        // FKs da tabela pivot (ambos referenciam documentos_fiscais)
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
