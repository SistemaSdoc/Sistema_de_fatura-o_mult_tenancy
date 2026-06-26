<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Adicionar taxa_iva e sujeito_iva à tabela categorias
 *
 * Contexto AGT Angola:
 *  - O IVA passa a ser definido ao nível da CATEGORIA (não do produto individual)
 *  - Produtos herdam a taxa_iva da sua categoria
 *  - Serviços mantêm a sua própria taxa_iva (não têm categoria)
 *
 * Taxas válidas em Angola:
 *  - 0%   → isentos (produtos agrícolas, medicamentos)
 *  - 5%   → cesta básica
 *  - 14%  → taxa geral (maioria dos produtos)
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Adicionar taxa_iva e sujeito_iva à tabela categorias
        Schema::table('categorias', function (Blueprint $table) {
            $table->decimal('taxa_iva', 5, 2)->default(14.00)->after('tipo')
                  ->comment('Taxa de IVA aplicada a todos os produtos desta categoria (AGT Angola)');
            $table->boolean('sujeito_iva')->default(true)->after('taxa_iva')
                  ->comment('Se false, produto isento de IVA (ex: produtos agrícolas)');
            $table->string('codigo_isencao', 10)->nullable()->after('sujeito_iva')
                  ->comment('Código de isenção SAF-T para categorias isentas de IVA');
        });

        // 2. (Opcional mas recomendado) Remover taxa_iva e sujeito_iva da tabela produtos
        //    ATENÇÃO: Apenas produtos físicos — serviços mantêm os seus campos
        //    Se quiser manter os campos para serviços, não apague — eles são ignorados para produtos
        //
        // Se quiser remover completamente da tabela produtos, descomente:
        //
        // Schema::table('produtos', function (Blueprint $table) {
        //     $table->dropColumn(['taxa_iva', 'sujeito_iva']);
        // });
        //
        // RECOMENDAÇÃO: Não remover agora — manter por compatibilidade com serviços
        // que usam taxa_iva própria. O campo taxa_iva em produtos será ignorado pelo código.
    }

    public function down(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropColumn(['taxa_iva', 'sujeito_iva', 'codigo_isencao']);
        });
    }
};