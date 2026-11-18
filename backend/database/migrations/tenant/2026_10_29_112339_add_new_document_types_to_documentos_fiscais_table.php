<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documentos_fiscais', function (Blueprint $table) {
            if (! Schema::hasColumn('documentos_fiscais', 'periodo_referencia_inicio')) {
                $table->date('periodo_referencia_inicio')->nullable()->after('data_emissao');
            }
            if (! Schema::hasColumn('documentos_fiscais', 'periodo_referencia_fim')) {
                $table->date('periodo_referencia_fim')->nullable()->after('periodo_referencia_inicio');
            }
            if (! Schema::hasColumn('documentos_fiscais', 'auto_faturacao')) {
                $table->boolean('auto_faturacao')->default(false)->after('tipo_documento');
            }
            if (! Schema::hasColumn('documentos_fiscais', 'motivo_auto_faturacao')) {
                $table->string('motivo_auto_faturacao', 255)->nullable()->after('auto_faturacao');
            }
            if (! Schema::hasColumn('documentos_fiscais', 'software_certificacao_numero')) {
                $table->string('software_certificacao_numero', 100)->nullable();
            }
            if (! Schema::hasColumn('documentos_fiscais', 'print_count')) {
                $table->unsignedTinyInteger('print_count')->default(0);
            }
            if (! Schema::hasIndex('documentos_fiscais', 'idx_tipo_estado')) {
                $table->index(['tipo_documento', 'estado'], 'idx_tipo_estado');
            }
            if (! Schema::hasIndex('documentos_fiscais', 'idx_auto_facturacao')) {
                $table->index(['auto_faturacao'], 'idx_auto_facturacao');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                ALTER TABLE documentos_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','RG','RE','NC','ND',
                    'FG','FGR','TV','FGEN','AC','ACR'
                ) NOT NULL
            ");
        }
    }

    public function down(): void
    {
        Schema::table('documentos_fiscais', function (Blueprint $table) {
            $table->dropIndex('idx_tipo_estado');
            $table->dropIndex('idx_auto_facturacao');
            $table->dropColumn([
                'periodo_referencia_inicio',
                'periodo_referencia_fim',
                'auto_faturacao',
                'motivo_auto_faturacao',
                'software_certificacao_numero',
                'print_count',
            ]);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                ALTER TABLE documentos_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','NC','ND'
                ) NOT NULL
            ");
        }
    }
};