<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
       Schema::connection('shared')->table('series_fiscais', function (Blueprint $table) {
            // Remove a unique antiga (global)
            $table->dropUnique('uk_serie_tipo_ano');

            // Nova unique por tenant
            $table->unique(
                ['tenant_id', 'tipo_documento', 'serie', 'ano'],
                'uk_serie_tenant_tipo_ano'
            );
        });
    }

    public function down(): void
    {
        Schema::connection('shared')->table('series_fiscais', function (Blueprint $table) {
            $table->dropUnique('uk_serie_tenant_tipo_ano');
            $table->unique(['tipo_documento', 'serie', 'ano'], 'uk_serie_tipo_ano');
        });
    }
};