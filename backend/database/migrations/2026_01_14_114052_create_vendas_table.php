<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Vendas - SEM FK para documentos_fiscais (evita circular)
        Schema::create('vendas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('cliente_id')
                  ->nullable()
                  ->constrained('clientes');

            $table->foreignUuid('user_id')
                  ->constrained('users');

            // documento_fiscal_id SEM foreign key (será adicionada depois)
            $table->uuid('documento_fiscal_id')->nullable();
            $table->index('documento_fiscal_id');

            // Tipo interno da venda
            $table->enum('tipo_documento', ['venda'])->default('venda');

            // Numeração interna da venda
            $table->string('serie')->nullable();
            $table->string('numero');

            // Totais
            $table->decimal('base_tributavel', 15, 2)->default(0);
            $table->decimal('total_iva', 15, 2)->default(0);
            $table->decimal('total_retencao', 15, 2)->default(0);
            $table->decimal('total_pagar', 15, 2)->default(0);

            // Datas
            $table->date('data_venda');
            $table->time('hora_venda');
            $table->decimal('total', 15, 2)->default(0);

            // Status da venda
            $table->enum('status', ['aberta', 'faturada', 'cancelada'])->default('aberta');

            // ATUALIZADO: Estado de pagamento (adicionado 'cancelada', removido valores obsoletos)
            $table->enum('estado_pagamento', ['pendente', 'paga', 'parcial', 'cancelada'])
                  ->default('pendente');

            $table->string('hash_fiscal')->nullable();
            $table->timestamps();

            // Índices
            $table->index('cliente_id');
            $table->index('status');
            $table->index('estado_pagamento');
            $table->index('data_venda');
            $table->index(['status', 'estado_pagamento']); // Índice composto para consultas comuns
        });

        // Itens da venda
        Schema::create('itens_venda', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('venda_id')
                  ->constrained('vendas')
                  ->onDelete('cascade');

            $table->foreignUuid('produto_id')
                  ->constrained('produtos');

            $table->integer('quantidade');
            $table->string('descricao', 255);

            // Preço no momento da venda
            $table->decimal('preco_venda', 15, 4);
            $table->decimal('desconto', 15, 2)->default(0);
            $table->decimal('base_tributavel', 15, 2)->default(0);
            $table->decimal('valor_iva', 15, 2)->default(0);
            $table->decimal('valor_retencao', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);

            $table->timestamps();

            // Índices
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
