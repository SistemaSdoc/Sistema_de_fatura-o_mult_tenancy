<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $connection = 'tenant';

    public function up(): void
    {
        $connection = DB::connection('tenant');
        $schema = Schema::connection('tenant');

        if ($connection->getDriverName() !== 'mysql') {
            return;
        }

        if ($schema->hasTable('series_fiscais')) {
            $connection->statement("
                ALTER TABLE series_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','RG','RE','NC','ND','FRt',
                    'FG','FGR','TV','FGEN','AC','ACR'
                ) NOT NULL
            ");
        }

        if ($schema->hasTable('documentos_fiscais')) {
            $connection->statement("
                ALTER TABLE documentos_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','RG','RE','NC','ND',
                    'FG','FGR','TV','FGEN','AC','ACR'
                ) NOT NULL
            ");
            $connection->statement("
                ALTER TABLE documentos_fiscais
                MODIFY COLUMN estado ENUM(
                    'emitido','paga','parcialmente_paga','cancelado','expirado',
                    'estornado','parcialmente_estornado'
                ) NOT NULL DEFAULT 'emitido'
            ");
        }
    }

    public function down(): void
    {
        throw new RuntimeException('A migration de RG/RE é irreversível para preservar documentos e estados emitidos.');
    }
};
