<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('shared')->table('documentos_fiscais', function (Blueprint $table) {
            // Factura Global (FG / FGR)
            $table->date('periodo_referencia_inicio')->nullable()->after('data_emissao');
            $table->date('periodo_referencia_fim')->nullable()->after('periodo_referencia_inicio');

            // Auto-facturação (flag em FR) — Art. 12.º
            $table->boolean('auto_faturacao')->default(false)->after('tipo_documento');
            $table->string('motivo_auto_faturacao', 255)->nullable()->after('auto_faturacao');

            // Art. 10.º n.º 1 al. j) — certificação do software
            $table->string('software_certificacao_numero', 100)->nullable();

            // Art. 7.º n.º 4-5 — 1.ª via / 2.ª via
            $table->unsignedTinyInteger('print_count')->default(0);

            // Índices úteis
            $table->index(['tenant_id', 'tipo_documento', 'estado'], 'idx_tipo_estado');
            $table->index(['auto_faturacao'], 'idx_auto_facturacao');
        });

        // Estender o ENUM de tipo_documento (só MySQL)
        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                ALTER TABLE documentos_fiscais
                MODIFY COLUMN tipo_documento ENUM(
                    'FT','FR','FP','FA','RC','NC','ND','FRt',
                    'FG','FGR','TV',
                    'FGEN','AC','ACR'
                ) NOT NULL
            ");
        }
    }

    public function down(): void
    {
        Schema::connection('shared')->table('documentos_fiscais', function (Blueprint $table) {
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
                    'FT','FR','FP','FA','RC','NC','ND','FRt'
                ) NOT NULL
            ");
        }
    }
};