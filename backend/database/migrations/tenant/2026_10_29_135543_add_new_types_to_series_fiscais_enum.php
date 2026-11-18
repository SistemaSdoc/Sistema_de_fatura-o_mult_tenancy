<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // ⚠️ SEM $connection — usa o default (landlord)

    public function up(): void
    {
        if (! Schema::hasTable('documentos_fiscais')) {
            return;
        }

        Schema::table('documentos_fiscais', function ($t) {
            if (! Schema::hasColumn('documentos_fiscais', 'periodo_referencia_inicio')) {
                $t->date('periodo_referencia_inicio')->nullable()->after('data_emissao');
            }
        });

        DB::statement("
            ALTER TABLE documentos_fiscais
            MODIFY COLUMN tipo_documento ENUM(
                'FT','FR','FP','FA','RC','RG','RE','NC','ND',
                'FG','FGR','TV','FGEN','AC','ACR'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        Schema::table('documentos_fiscais', function ($t) {
            if (Schema::hasColumn('documentos_fiscais', 'periodo_referencia_inicio')) {
                $t->dropColumn('periodo_referencia_inicio');
            }
        });

        DB::statement("
            ALTER TABLE documentos_fiscais
            MODIFY COLUMN tipo_documento ENUM('FT','FR','FP','FA','RC','NC','ND') NOT NULL
        ");
    }
};