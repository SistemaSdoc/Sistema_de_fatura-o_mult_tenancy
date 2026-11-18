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

        $tiposDocumento = "'FT','FR','FP','FA','RC','RG','RE','NC','ND','FG','FGR','TV','FGEN','AC','ACR'";
        $tiposSerie = "'FT','FR','FP','FA','RC','RG','RE','NC','ND','FRt','FG','FGR','TV','FGEN','AC','ACR'";

        if (Schema::hasTable('series_fiscais')) {
            DB::statement("
                ALTER TABLE series_fiscais
                MODIFY COLUMN tipo_documento ENUM({$tiposSerie}) NOT NULL
            ");
        }

        if (Schema::hasTable('documentos_fiscais')) {
            DB::statement("
                ALTER TABLE documentos_fiscais
                MODIFY COLUMN tipo_documento ENUM({$tiposDocumento}) NOT NULL
            ");
        }
    }

    public function down(): void
    {
        throw new RuntimeException('A sincronização de tipos é irreversível para preservar documentos emitidos.');
    }
};