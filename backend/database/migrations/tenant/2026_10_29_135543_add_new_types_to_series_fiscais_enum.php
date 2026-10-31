<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Conexão usada quando a migration corre fora do contexto stancl
     * (ex: `php artisan migrate --path=database/migrations/tenant --database=tenant`).
     * Dentro do `tenants:migrate`, o stancl faz bootstrap e a conexão `tenant`
     * já aponta para a BD dedicada correcta.
     */
    public $connection = 'tenant';

    public function up(): void
    {
        $conn = DB::connection('tenant');

        if (Schema::connection('tenant')->hasTable('series_fiscais')) {
            $conn->statement("
                ALTER TABLE series_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','NC','ND',
                    'FG','FGR','TV','FGEN','AC','ACR'
                ) NOT NULL
            ");
        }

        if (Schema::connection('tenant')->hasTable('documentos_fiscais')) {
            $conn->statement("
                ALTER TABLE documentos_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','NC','ND',
                    'FG','FGR','TV','FGEN','AC','ACR'
                ) NOT NULL
            ");
        }
    }

    public function down(): void
    {
        $conn = DB::connection('tenant');

        if (Schema::hasTable('series_fiscais')) {
            $conn->statement("
                ALTER TABLE series_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','NC','ND'
                ) NOT NULL
            ");
        }

        if (Schema::hasTable('documentos_fiscais')) {
            $conn->statement("
                ALTER TABLE documentos_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','NC','ND'
                ) NOT NULL
            ");
        }
    }
};