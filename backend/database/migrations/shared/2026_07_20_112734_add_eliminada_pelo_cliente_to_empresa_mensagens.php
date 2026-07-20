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
        Schema::connection('shared')->table('empresa_mensagens', function (Blueprint $table) {
            $table->boolean('eliminada_pelo_cliente')->default(false)->after('lida_em');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('shared')->table('empresa_mensagens', function (Blueprint $table) {
            $table->dropColumn('eliminada_pelo_cliente');
        });
    }
};
