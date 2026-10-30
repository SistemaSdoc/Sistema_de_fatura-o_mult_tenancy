<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public $connection = 'shared';

    public function up(): void
    {
        DB::connection('shared')->statement("
            ALTER TABLE series_fiscais
            MODIFY COLUMN tipo_documento ENUM(
                'FT','FR','FP','FA','RC','NC','ND','FRt',
                'FG','FGR','TV','FGEN','AC','ACR'
            ) NOT NULL
        ");

        DB::connection('shared')->statement("
            ALTER TABLE documentos_fiscais
            MODIFY COLUMN tipo_documento ENUM(
                'FT','FR','FP','FA','RC','NC','ND','FRt',
                'FG','FGR','TV','FGEN','AC','ACR'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        DB::connection('shared')->statement("
            ALTER TABLE series_fiscais
            MODIFY COLUMN tipo_documento ENUM(
                'FT','FR','FP','FA','RC','NC','ND','FRt'
            ) NOT NULL
        ");

        DB::connection('shared')->statement("
            ALTER TABLE documentos_fiscais
            MODIFY COLUMN tipo_documento ENUM(
                'FT','FR','FP','FA','RC','NC','ND','FRt'
            ) NOT NULL
        ");
    }
};