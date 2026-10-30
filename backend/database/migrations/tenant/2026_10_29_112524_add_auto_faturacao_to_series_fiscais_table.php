<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('series_fiscais', function (Blueprint $table) {
            $table->boolean('auto_faturacao')->default(false)->after('serie');

            // A chave única deve incluir auto_faturacao para permitir
            // série "AF" ao lado da série "A" do mesmo tipo FR.
            $table->unique(
                ['tenant_id', 'tipo_documento', 'serie', 'ano', 'auto_faturacao'],
                'uk_serie_completa'
            );
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