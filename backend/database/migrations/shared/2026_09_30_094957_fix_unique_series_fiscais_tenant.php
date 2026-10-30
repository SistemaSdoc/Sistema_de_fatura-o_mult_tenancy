<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $connection = 'shared';

    public function up(): void
    {
        $schema = Schema::connection('shared');

        // Salvaguarda: a coluna tenant_id tem de existir
        if (! $schema->hasColumn('series_fiscais', 'tenant_id')) {
            // Nada a fazer — não é possível criar o unique por tenant
            return;
        }

        // Ler todos os índices atuais
        $indices = collect(DB::connection('shared')->select('SHOW INDEX FROM series_fiscais'))
            ->pluck('Key_name')
            ->unique()
            ->toArray();

        // 1. Remover o unique antigo (global), se existir
        if (in_array('uk_serie_tipo_ano', $indices, true)) {
            $schema->table('series_fiscais', function (Blueprint $table) {
                $table->dropUnique('uk_serie_tipo_ano');
            });
        }

        // 2. Criar o unique novo (por tenant), se ainda não existir
        if (! in_array('uk_serie_tenant_tipo_ano', $indices, true)) {
            $schema->table('series_fiscais', function (Blueprint $table) {
                $table->unique(
                    ['tenant_id', 'tipo_documento', 'serie', 'ano'],
                    'uk_serie_tenant_tipo_ano'
                );
            });
        }
    }

    public function down(): void
    {
        $schema = Schema::connection('shared');

        $indices = collect(DB::connection('shared')->select('SHOW INDEX FROM series_fiscais'))
            ->pluck('Key_name')
            ->unique()
            ->toArray();

        if (in_array('uk_serie_tenant_tipo_ano', $indices, true)) {
            $schema->table('series_fiscais', function (Blueprint $table) {
                $table->dropUnique('uk_serie_tenant_tipo_ano');
            });
        }

        if (! in_array('uk_serie_tipo_ano', $indices, true)) {
            $schema->table('series_fiscais', function (Blueprint $table) {
                $table->unique(['tipo_documento', 'serie', 'ano'], 'uk_serie_tipo_ano');
            });
        }
    }
};