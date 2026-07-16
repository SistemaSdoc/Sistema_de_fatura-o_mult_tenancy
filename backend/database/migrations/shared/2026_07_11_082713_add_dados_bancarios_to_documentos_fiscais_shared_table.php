<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('shared')->table('documentos_fiscais', function (Blueprint $table) {
            if (!Schema::hasColumn('documentos_fiscais', 'nome_banco')) {
                $table->string('nome_banco', 255)->nullable()->after('referencia_externa');
            }
            if (!Schema::hasColumn('documentos_fiscais', 'iban')) {
                $table->string('iban', 34)->nullable()->after('nome_banco');
            }
            if (!Schema::hasColumn('documentos_fiscais', 'numero_conta')) {
                $table->string('numero_conta', 50)->nullable()->after('iban');
            }
        });
    }

    public function down(): void
    {
        Schema::connection('shared')->table('documentos_fiscais', function (Blueprint $table) {
            $table->dropColumnIfExists(['nome_banco', 'iban', 'numero_conta']);
        });
    }
};