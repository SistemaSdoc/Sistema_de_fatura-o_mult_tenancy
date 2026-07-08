<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('documentos_fiscais', function (Blueprint $table) {
            $table->string('nome_banco')->nullable()->after('referencia_pagamento');
            $table->string('iban')->nullable()->after('nome_banco');
            $table->string('numero_conta')->nullable()->after('iban');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documentos_fiscais', function (Blueprint $table) {
            $table->dropColumn(['nome_banco', 'iban', 'numero_conta']);
        });
    }
};