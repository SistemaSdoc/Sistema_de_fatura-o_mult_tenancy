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

            // Cliente pode ser nulo para vendas com cliente avulso
            $table->foreignUuid('cliente_id')
                  ->nullable()
                  ->constrained('clientes')
                  ->nullOnDelete();

            // Nome do cliente para vendas com cliente avulso
            $table->string('cliente_nome')->nullable();

            // NIF para cliente avulso (opcional)
            $table->string('cliente_nif', 20)->nullable();

            $table->foreignUuid('user_id')
                  ->constrained('users');

            // documento_fiscal_id SEM foreign key (será adicionada depois)
            $table->uuid('documento_fiscal_id')->nullable();
            $table->index('documento_fiscal_id');

            // Tipo interno da venda
            $table->enum('tipo_documento', ['venda'])->default('venda');

            // Numeração interna da venda
            $table->string('serie', 20)->nullable();
            $table->string('numero', 20);

            // Número do documento completo (para facilitar buscas)
            $table->string('numero_documento', 50)->nullable()->index();

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

            // Estado de pagamento - ✅ INDICA SE ESTÁ PAGA, MAS NÃO ARMAZENA TROCO
            $table->enum('estado_pagamento', ['pendente', 'paga', 'parcial', 'cancelada'])
                  ->default('pendente');

            // Tipo de documento fiscal associado (FT, FR, RC, FP, FA, etc)
            $table->string('tipo_documento_fiscal', 10)->nullable();
            // NOTA: O índice será criado abaixo junto com os outros

            // Observações
            $table->text('observacoes')->nullable();

            $table->string('hash_fiscal')->nullable();
            $table->timestamps();
            $table->softDeletes(); // Soft delete para permitir recuperação

            // Índices - TODOS OS ÍNDICES AQUI (SEM DUPLICAÇÕES)
            $table->index('cliente_id');
            $table->index('cliente_nome');
            $table->index('status');
            $table->index('estado_pagamento');
            $table->index('data_venda');
            $table->index('tipo_documento_fiscal'); // ÚNICA DECLARAÇÃO DO ÍNDICE
            $table->index(['status', 'estado_pagamento']); // Índice composto para consultas comuns
            $table->index(['data_venda', 'tipo_documento_fiscal']); // Para relatórios por período e tipo
            $table->index(['cliente_id', 'estado_pagamento']); // Para consultas de cliente
        });

        // Itens da venda
        Schema::create('itens_venda', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('venda_id')
                  ->constrained('vendas')
                  ->onDelete('cascade');

            $table->foreignUuid('produto_id')
                  ->nullable() // Pode ser nulo para itens personalizados
                  ->constrained('produtos')
                  ->nullOnDelete();

            $table->integer('quantidade');
            $table->string('descricao', 255);

            // Código do produto no momento da venda
            $table->string('codigo_produto', 50)->nullable();

            // Preço no momento da venda
            $table->decimal('preco_venda', 15, 4);
            $table->decimal('desconto', 15, 2)->default(0);
            $table->decimal('base_tributavel', 15, 2)->default(0);
            $table->decimal('valor_iva', 15, 2)->default(0);
            $table->decimal('taxa_iva', 5, 2)->default(14);
            $table->decimal('valor_retencao', 15, 2)->default(0);
            $table->decimal('taxa_retencao', 5, 2)->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);

            // Unidade de medida
            $table->string('unidade', 10)->default('UN');

            $table->timestamps();

            // Índices
            $table->index('venda_id');
            $table->index('produto_id');
            $table->index('codigo_produto');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itens_venda');
        Schema::dropIfExists('vendas');
    }
};
