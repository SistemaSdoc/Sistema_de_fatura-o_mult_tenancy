<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

Schema::create('historico_precos', function (Blueprint $table) {
    $table->uuid('id')->primary();

    $table->foreignUuid('produto_id')->constrained()->cascadeOnDelete();

    $table->decimal('preco_antigo', 15, 2);
    $table->decimal('preco_novo', 15, 2);

    $table->decimal('custo_antigo', 15, 2)->nullable();
    $table->decimal('custo_novo', 15, 2)->nullable();

    $table->decimal('margem_antiga', 5, 2)->nullable();
    $table->decimal('margem_nova', 5, 2)->nullable();

    $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();

    $table->string('motivo')->nullable();

    $table->timestamps();
});
    }

    public function down(): void
    {
        Schema::dropIfExists('historico_precos');

    }
};