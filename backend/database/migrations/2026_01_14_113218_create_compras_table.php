<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
Schema::create('compras', function (Blueprint $table) {
    $table->uuid('id')->primary();

    
    // Auditoria
    $table->uuid('user_id');
    $table->foreign('user_id')->references('id')->on('users');

    $table->uuid('fornecedor_id');
    $table->foreign('fornecedor_id')->references('id')->on('fornecedores');

    $table->date('data');
       // Documento fiscal externo
    $table->enum('tipo_documento', ['fatura', 'nota_credito']);
    $table->string('numero_documento');
    $table->date('data_emissao');

    // Fiscal
    $table->decimal('base_tributavel', 14, 2);
    $table->decimal('total_iva', 14, 2);
    $table->decimal('total_fatura', 14, 2);

    // Elegibilidade fiscal
    $table->boolean('validado_fiscalmente')->default(true);

    $table->decimal('total', 12, 2);

    $table->timestamps();
});


Schema::create('itens_compras', function (Blueprint $table) {
    $table->uuid('id')->primary();

    $table->uuid('compra_id');
    $table->foreign('compra_id')->references('id')->on('compras')->onDelete('cascade');

    $table->uuid('produto_id');
    $table->foreign('produto_id')->references('id')->on('produtos');

    $table->integer('quantidade');
    $table->decimal('preco_compra', 12, 2);
    $table->decimal('subtotal', 12, 2);

    $table->decimal('base_tributavel', 14, 2);
    $table->decimal('valor_iva', 14, 2);

    $table->timestamps();
});


    }

    public function down(): void
    {
        Schema::dropIfExists('itens_compras');
        Schema::dropIfExists('compras');
    }
};
