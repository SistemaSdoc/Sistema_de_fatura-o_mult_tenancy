<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
Schema::connection('tenant')->create('produtos', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('categoria_id')->references('id')->on('categorias')->onDelete('cascade');
    $table->string('nome');
    $table->text('descricao')->nullable();
    $table->decimal('preco_compra', 12, 2);
    $table->decimal('preco_venda', 12, 2);
    $table->integer('estoque_atual')->default(0);
    $table->integer('estoque_minimo')->default(0);
   $table->timestamps();
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('produtos');
      }
};
