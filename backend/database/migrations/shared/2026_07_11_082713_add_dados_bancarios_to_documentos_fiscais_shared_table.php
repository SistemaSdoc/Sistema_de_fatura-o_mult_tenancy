<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $connection = 'shared';

    public function up(): void
    {
        $schema = Schema::connection('shared');

        // Cada coluna verificada e criada individualmente, na conexão correta
        if (! $schema->hasColumn('documentos_fiscais', 'nome_banco')) {
            $schema->table('documentos_fiscais', function (Blueprint $table) {
                $table->string('nome_banco', 255)->nullable()->after('referencia_externa');
            });
        }

        if (! $schema->hasColumn('documentos_fiscais', 'iban')) {
            $schema->table('documentos_fiscais', function (Blueprint $table) {
                $table->string('iban', 34)->nullable()->after('nome_banco');
            });
        }

        if (! $schema->hasColumn('documentos_fiscais', 'numero_conta')) {
            $schema->table('documentos_fiscais', function (Blueprint $table) {
                $table->string('numero_conta', 50)->nullable()->after('iban');
            });
        }
    }

    public function down(): void
    {
        $schema = Schema::connection('shared');

        if ($schema->hasColumn('documentos_fiscais', 'numero_conta')) {
            $schema->table('documentos_fiscais', fn (Blueprint $t) => $t->dropColumn('numero_conta'));
        }
        if ($schema->hasColumn('documentos_fiscais', 'iban')) {
            $schema->table('documentos_fiscais', fn (Blueprint $t) => $t->dropColumn('iban'));
        }
        if ($schema->hasColumn('documentos_fiscais', 'nome_banco')) {
            $schema->table('documentos_fiscais', fn (Blueprint $t) => $t->dropColumn('nome_banco'));
        }
    }
};