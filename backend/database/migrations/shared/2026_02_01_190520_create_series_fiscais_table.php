<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $schema = Schema::connection('shared');
        $db     = DB::connection('shared');

        $schema->create('series_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();

            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->enum('tipo_documento', [
                'FT', 'FR', 'FP', 'FA', 'NC', 'ND', 'RC',
            ]);

            $table->string('serie', 20);
            $table->string('descricao', 255)->nullable();
            $table->year('ano')->nullable(false);
            $table->unsignedInteger('ultimo_numero')->default(0);
            $table->unsignedTinyInteger('digitos')->default(4);
            $table->boolean('ativa')->default(true);
            $table->boolean('padrao')->default(false);
            $table->boolean('valida_agt')->default(true);
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['tipo_documento', 'ativa']);
            $table->index(['tipo_documento', 'ano', 'ativa']);
            $table->index(['tipo_documento', 'padrao', 'ativa']);
            $table->unique(['tipo_documento', 'serie', 'ano'], 'uk_serie_tipo_ano');
        });

        $ano = (int) date('Y');
        $now = now();

        $db->table('series_fiscais')->insert([
            [
                'id' => (string) Str::uuid(),
                'tipo_documento' => 'FT',
                'serie' => 'A',
                'descricao' => 'Série padrão — Faturas (Loja Principal)',
                'ano' => $ano, 'ultimo_numero' => 0, 'digitos' => 4,
                'ativa' => true, 'padrao' => true, 'valida_agt' => true,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'tipo_documento' => 'FR',
                'serie' => 'A',
                'descricao' => 'Série padrão — Faturas-Recibo (Loja Principal)',
                'ano' => $ano, 'ultimo_numero' => 0, 'digitos' => 4,
                'ativa' => true, 'padrao' => true, 'valida_agt' => true,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'tipo_documento' => 'FP',
                'serie' => 'PROFORMA',
                'descricao' => 'Série padrão — Faturas Proforma',
                'ano' => $ano, 'ultimo_numero' => 0, 'digitos' => 4,
                'ativa' => true, 'padrao' => true, 'valida_agt' => false,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'tipo_documento' => 'FA',
                'serie' => 'ADTO',
                'descricao' => 'Série padrão — Faturas de Adiantamento',
                'ano' => $ano, 'ultimo_numero' => 0, 'digitos' => 4,
                'ativa' => true, 'padrao' => true, 'valida_agt' => true,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'tipo_documento' => 'NC',
                'serie' => 'CREDITO',
                'descricao' => 'Série padrão — Notas de Crédito',
                'ano' => $ano, 'ultimo_numero' => 0, 'digitos' => 4,
                'ativa' => true, 'padrao' => true, 'valida_agt' => true,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'tipo_documento' => 'ND',
                'serie' => 'DEBITO',
                'descricao' => 'Série padrão — Notas de Débito',
                'ano' => $ano, 'ultimo_numero' => 0, 'digitos' => 4,
                'ativa' => true, 'padrao' => true, 'valida_agt' => true,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'tipo_documento' => 'RC',
                'serie' => 'RECIBO',
                'descricao' => 'Série padrão — Recibos',
                'ano' => $ano, 'ultimo_numero' => 0, 'digitos' => 4,
                'ativa' => true, 'padrao' => true, 'valida_agt' => false,
                'created_at' => $now, 'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::connection('shared')->dropIfExists('series_fiscais');
    }
};