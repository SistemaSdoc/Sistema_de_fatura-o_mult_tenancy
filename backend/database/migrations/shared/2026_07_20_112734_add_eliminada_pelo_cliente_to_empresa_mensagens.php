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
        $schema = Schema::connection('shared');

        // Cada coluna verificada e criada individualmente, na conexão correta
        if (! $schema->hasColumn('empresa_mensagens', 'eliminada_pelo_cliente')) {
            $schema->table('empresa_mensagens', function (Blueprint $table) {
                $table->string('eliminada_pelo_cliente', 255)->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $schema = Schema::connection('shared');

        if ($schema->hasColumn('empresa_mensagens', 'eliminada_pelo_cliente')) {
            $schema->table('empresa_mensagens', function (Blueprint $table) {
                $table->dropColumn('eliminada_pelo_cliente');
            });
        }
    }
};
