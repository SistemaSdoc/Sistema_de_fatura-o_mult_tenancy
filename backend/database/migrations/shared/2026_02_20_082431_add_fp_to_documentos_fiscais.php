<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * NOTA: esta migração é redundante com create_documentos_fiscais_table,
 * que já criou o enum tipo_documento com 'FP' incluído.
 * É mantida apenas para compatibilidade com ambientes onde a migração
 * create_documentos_fiscais_table correu antes de 'FP' ter sido incluído.
 * Corre sempre contra a connection 'shared'.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::connection('shared')->statement("ALTER TABLE documentos_fiscais MODIFY COLUMN tipo_documento ENUM(
            'FT',
            'FR',
            'FP',
            'FA',
            'NC',
            'ND',
            'RC'
        ) NOT NULL");
    }

    public function down(): void
    {
        DB::connection('shared')->statement("ALTER TABLE documentos_fiscais MODIFY COLUMN tipo_documento ENUM(
            'FT',
            'FR',
            'FA',
            'NC',
            'ND',
            'RC'
        ) NOT NULL");
    }
};