<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        if (Schema::hasTable('series_fiscais')) {
            DB::statement("
                ALTER TABLE series_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','RG','RE','NC','ND','FRt',
                    'FG','FGR','TV','FGEN','AC','ACR','AF'
                ) NOT NULL
            ");
        }

        if (Schema::hasTable('documentos_fiscais')) {
            DB::statement("
                ALTER TABLE documentos_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','RG','RE','NC','ND',
                    'FG','FGR','TV','FGEN','AC','ACR','AF'
                ) NOT NULL
            ");
        }
    }

    public function down(): void
    {
        throw new RuntimeException('A migração de AF na base tenant é irreversível para preservar documentos emitidos.');
    }
};