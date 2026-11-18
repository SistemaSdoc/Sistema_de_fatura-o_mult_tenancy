<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 'shared' é fixo. A default é 'tenant' quando o seeder corre
        // (--database=tenant). Se for 'mysql' (landlord), a tabela não existe
        // e é ignorado em segurança.
        $connections = array_unique(['shared', config('database.default')]);

        foreach ($connections as $conn) {
            if (! Schema::connection($conn)->hasTable('itens_documento_fiscal')) {
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
        $connections = array_unique(['shared', config('database.default')]);

        foreach ($connections as $conn) {
            if (! Schema::connection($conn)->hasTable('itens_documento_fiscal')) {
                continue;
            }
            DB::connection($conn)->statement(
                'ALTER TABLE itens_documento_fiscal MODIFY quantidade DECIMAL(15,4) NOT NULL'
            );
        }
    }
};