<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documentos_fiscais', function (Blueprint $table) {
            // Adicionar colunas para cliente avulso
            $table->string('cliente_nome')->nullable()->after('cliente_id');
            $table->string('cliente_nif', 20)->nullable()->after('cliente_nome');
        });
    }

    public function down(): void
    {
        Schema::table('documentos_fiscais', function (Blueprint $table) {
            $table->dropColumn(['cliente_nome', 'cliente_nif']);
        });
    }
};
