<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Adicionar 'FP' ao ENUM de tipo_documento na tabela documentos_fiscais
        DB::statement("ALTER TABLE documentos_fiscais MODIFY COLUMN tipo_documento ENUM(
            'FT',   -- Fatura
            'FR',   -- Fatura-Recibo
            'FP',   -- Fatura Proforma (NOVO)
            'FA',   -- Fatura de Adiantamento
            'NC',   -- Nota de Crédito
            'ND',   -- Nota de Débito
            'RC',   -- Recibo
            'FRt'   -- Fatura de Retificação
        ) NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remover 'FP' do ENUM (reverter para o estado anterior)
        DB::statement("ALTER TABLE documentos_fiscais MODIFY COLUMN tipo_documento ENUM(
            'FT',   -- Fatura
            'FR',   -- Fatura-Recibo
            'FA',   -- Fatura de Adiantamento
            'NC',   -- Nota de Crédito
            'ND',   -- Nota de Débito
            'RC',   -- Recibo
            'FRt'   -- Fatura de Retificação
        ) NOT NULL");
    }
};
