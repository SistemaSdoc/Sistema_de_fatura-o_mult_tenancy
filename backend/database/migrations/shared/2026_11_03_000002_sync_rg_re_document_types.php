<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $connection = 'shared';

    public function up(): void
    {
        $connection = DB::connection('shared');
        $schema = Schema::connection('shared');

        if ($connection->getDriverName() !== 'mysql') {
            return;
        }

        $tiposDocumento = "'FT','FR','FP','FA','RC','RG','RE','NC','ND','FG','FGR','TV','FGEN','AC','ACR'";
        $tiposSerie = "'FT','FR','FP','FA','RC','RG','RE','NC','ND','FRt','FG','FGR','TV','FGEN','AC','ACR'";

        if ($schema->hasTable('series_fiscais')) {
            $connection->statement("
                ALTER TABLE series_fiscais
                MODIFY COLUMN tipo_documento ENUM({$tiposSerie}) NOT NULL
            ");
        }

        if ($schema->hasTable('documentos_fiscais')) {
            $connection->statement("
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
