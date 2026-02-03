<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabela de Faturas (Documentos Fiscais)
        Schema::create('faturas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users');

            $table->uuid('venda_id');
            $table->foreign('venda_id')->references('id')->on('vendas');

            $table->uuid('cliente_id')->nullable();
            $table->foreign('cliente_id')->references('id')->on('clientes');

            $table->string('serie', 10)->default('A'); // Série fiscal
            $table->string('numero')->unique(); // Número sequencial

            $table->enum('tipo_documento', ['FT', 'FR', 'NC', 'ND'])->default('FT');

            $table->date('data_emissao');
            $table->time('hora_emissao');
            $table->date('data_vencimento')->nullable();

            $table->decimal('base_tributavel', 12, 2)->default(0); // soma das linhas antes do IVA
            $table->decimal('total_iva', 12, 2)->default(0);
            $table->decimal('total_retenção', 12, 2)->default(0);
            $table->decimal('total_liquido', 12, 2)->default(0);

            $table->enum('estado', ['emitido', 'anulado', 'pago','pendente'])->default('emitido');
            $table->text('motivo_anulacao')->nullable();

            $table->string('hash_fiscal')->nullable(); // integridade fiscal

            $table->timestamps();
            $table->timestamp('criado_em')->useCurrent(); // auditoria
        });

        // Tabela de Itens da Fatura
        Schema::create('itens_fatura', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('fatura_id');
            $table->foreign('fatura_id')
                  ->references('id')
                  ->on('faturas')
                  ->onDelete('cascade');

            $table->uuid('produto_id')->nullable();
            $table->foreign('produto_id')
                  ->references('id')
                  ->on('produtos')
                  ->nullOnDelete();

            $table->string('descricao'); // imutável
            $table->integer('quantidade');
            $table->decimal('preco_unitario', 12, 2);

            $table->decimal('base_tributavel', 12, 2); // quantidade * preço - desconto
            $table->decimal('taxa_iva', 5, 2)->default(0);
            $table->decimal('valor_iva', 12, 2)->default(0);
            $table->decimal('valor_retenção', 12, 2)->default(0);
            $table->decimal('desconto', 12, 2)->default(0);

            $table->decimal('total_linha', 12, 2); // base + IVA - retenção - desconto

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itens_fatura');
        Schema::dropIfExists('faturas');
    }
};
