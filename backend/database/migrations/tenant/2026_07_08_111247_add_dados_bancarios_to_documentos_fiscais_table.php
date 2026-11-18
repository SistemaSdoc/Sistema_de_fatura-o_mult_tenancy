<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('documentos_fiscais', 'nome_banco')) {
            Schema::table('documentos_fiscais', function (Blueprint $table) {
                $table->string('nome_banco', 255)->nullable()->after('referencia_externa');
            });
        }

        if (! Schema::hasColumn('documentos_fiscais', 'iban')) {
            Schema::table('documentos_fiscais', function (Blueprint $table) {
                $table->string('iban', 34)->nullable()->after('nome_banco');
            });
        }

        if (! Schema::hasColumn('documentos_fiscais', 'numero_conta')) {
            Schema::table('documentos_fiscais', function (Blueprint $table) {
                $table->string('numero_conta', 50)->nullable()->after('iban');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('documentos_fiscais', 'numero_conta')) {
            Schema::table('documentos_fiscais', fn (Blueprint $t) => $t->dropColumn('numero_conta'));
        }
        if (Schema::hasColumn('documentos_fiscais', 'iban')) {
            Schema::table('documentos_fiscais', fn (Blueprint $t) => $t->dropColumn('iban'));
        }
        if (Schema::hasColumn('documentos_fiscais', 'nome_banco')) {
            Schema::table('documentos_fiscais', fn (Blueprint $t) => $t->dropColumn('nome_banco'));
        }
    }
};