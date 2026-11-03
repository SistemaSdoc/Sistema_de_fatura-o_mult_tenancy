<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $schema = Schema::connection('tenant');
        $schema->table('series_fiscais', function (Blueprint $table) use ($schema) {
            if (!$schema->hasColumn('series_fiscais', 'auto_faturacao')) {
                $table->boolean('auto_faturacao')->default(false)->after('serie');
            }

            if (!$schema->hasIndex('series_fiscais', 'uk_serie_completa')) {
                $table->unique(
                    ['tenant_id', 'tipo_documento', 'serie', 'ano', 'auto_faturacao'],
                    'uk_serie_completa'
                );
            }
        });
    }

    public function down(): void
    {
        Schema::table('series_fiscais', function (Blueprint $table) {
            $table->dropUnique('uk_serie_completa');
            $table->dropColumn('auto_faturacao');
        });
    }
};