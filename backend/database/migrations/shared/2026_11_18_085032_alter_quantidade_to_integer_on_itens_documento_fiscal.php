<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Para cada conexão que tenha a tabela (shared + tenant)
        foreach (['shared', 'tenant'] as $conn) {
            if (!Schema::connection($conn)->hasTable('itens_documento_fiscal')) {
                continue;
            }

            // Normaliza decimais para inteiros antes de alterar
            DB::connection($conn)->table('itens_documento_fiscal')
                ->whereRaw('quantidade <> FLOOR(quantidade)')
                ->update(['quantidade' => DB::raw('ROUND(quantidade)')]);

            DB::connection($conn)->statement(
                'ALTER TABLE itens_documento_fiscal MODIFY quantidade INT NOT NULL'
            );
        }
    }

    public function down(): void
    {
        foreach (['shared', 'tenant'] as $conn) {
            if (!Schema::connection($conn)->hasTable('itens_documento_fiscal')) {
                continue;
            }
            DB::connection($conn)->statement(
                'ALTER TABLE itens_documento_fiscal MODIFY quantidade DECIMAL(15,4) NOT NULL'
            );
        }
    }
};