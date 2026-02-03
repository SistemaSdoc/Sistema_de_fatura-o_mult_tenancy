<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Vendas
Schema::create('vendas', function (Blueprint $table) {
    $table->uuid('id')->primary();

    $table->uuid('cliente_id')->nullable();
    $table->foreign('cliente_id')->references('id')->on('clientes');

    $table->uuid('user_id');
    $table->foreign('user_id')->references('id')->on('users');

    $table->enum('tipo_documento', ['fatura','recibo','nota_credito','nota_debito']);
    $table->string('serie')->nullable();
    $table->string('numero')->unique();

    $table->decimal('base_tributavel', 14, 2);
    $table->decimal('total_iva', 14, 2);
    $table->decimal('total_retenção', 14, 2)->default(0);
    $table->decimal('total_pagar', 14, 2);

    $table->date('data_venda');
    $table->time('hora_venda');
    $table->decimal('total', 12, 2);

    $table->enum('status', ['aberta', 'faturada', 'cancelada'])->default('aberta');
    $table->string('hash_fiscal')->nullable();
    $table->timestamps();
});


        // Itens da venda
        Schema::create('itens_venda', function (Blueprint $table) {
    $table->uuid('id')->primary();

    $table->uuid('venda_id');
    $table->foreign('venda_id')
          ->references('id')
          ->on('vendas')
          ->onDelete('cascade');

    $table->uuid('produto_id');
    $table->foreign('produto_id')
          ->references('id')
          ->on('produtos');

    $table->integer('quantidade');
    $table->string('descricao');

    // Preço no momento da venda
    $table->decimal('preco_venda', 12, 2);
    $table->decimal('desconto', 12, 2)->default(0);
    $table->decimal('base_tributavel', 14, 2);
    $table->decimal('valor_iva', 14, 2);
    $table->decimal('valor_retenção', 14, 2)->default(0);

    $table->decimal('subtotal', 12, 2);

    $table->timestamps();
});

    }

    public function down(): void
    {
        Schema::dropIfExists('itens_venda');
        Schema::dropIfExists('vendas');
    }
};
