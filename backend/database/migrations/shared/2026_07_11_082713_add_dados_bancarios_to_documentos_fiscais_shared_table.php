<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('shared')->table('documentos_fiscais', function (Blueprint $table) {
            $table->string('nome_banco', 255)->nullable()->after('referencia_externa');
            $table->string('iban', 34)->nullable()->after('nome_banco');
            $table->string('numero_conta', 50)->nullable()->after('iban');
        });
    }

    public function down(): void
    {
        Schema::connection('shared')->table('documentos_fiscais', function (Blueprint $table) {
            $table->dropColumn(['nome_banco', 'iban', 'numero_conta']);
        });
    }
};