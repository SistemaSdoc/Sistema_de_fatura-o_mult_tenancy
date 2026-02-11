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
        Schema::table('produtos', function (Blueprint $table) {
            // Verifica se a coluna deleted_at não existe antes de adicionar
            if (!Schema::hasColumn('produtos', 'deleted_at')) {
                $table->softDeletes(); // cria a coluna deleted_at
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            // Verifica se a coluna existe antes de remover
            if (Schema::hasColumn('produtos', 'deleted_at')) {
                $table->dropSoftDeletes(); // remove a coluna deleted_at
            }
        });
    }
};
