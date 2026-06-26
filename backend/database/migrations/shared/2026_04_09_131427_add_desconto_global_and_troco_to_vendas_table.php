<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adiciona campos de desconto global e troco à tabela vendas.
     * Estes campos são apenas para registo e controle interno,
     * não afetam os documentos fiscais.
     */
    public function up(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            // Adicionar campo desconto_global após o campo total
            $table->decimal('desconto_global', 15, 2)->default(0)->after('total');
            
            // Adicionar campo troco após desconto_global
            $table->decimal('troco', 15, 2)->default(0)->after('desconto_global');
            
            // Adicionar índice para consultas que envolvam desconto_global
            $table->index('desconto_global');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            // Remover o índice primeiro
            $table->dropIndex(['desconto_global']);
            
            // Remover os campos
            $table->dropColumn(['desconto_global', 'troco']);
        });
    }
};