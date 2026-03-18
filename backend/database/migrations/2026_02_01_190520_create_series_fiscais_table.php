<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Migration: criar tabela series_fiscais e inserir séries padrão
 *
 * A tabela é usada pelo DocumentoFiscalService::gerarNumeroDocumento()
 * com lockForUpdate() dentro de transacção para garantir numeração
 * sequencial sem gaps nem duplicados.
 *
 * Alterações face às versões anteriores do projecto:
 *  - Campos 'prefixo' e 'sufixo' removidos — o DocumentoFiscalService
 *    usa apenas o formato SERIE-NNNNN (ex: B-00001), sem prefixo/sufixo
 *  - Campo 'valida_aft' renomeado para 'valida_agt' — AFT é sigla
 *    portuguesa; em Angola a entidade é AGT
 *  - Séries padrão inseridas directamente no up() — o sistema arranca
 *    com séries operacionais sem precisar de seeder separado
 *  - FP marcada como valida_agt=false (proforma não tem validade fiscal)
 *  - RC marcado como valida_agt=false (recibos isentos de assinatura AGT)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('series_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Auditoria — utilizador que criou a série
            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Tipo de documento — alinhado com DocumentoFiscal::TIPO_* e services
            $table->enum('tipo_documento', [
                'FT',  // Fatura
                'FR',  // Fatura-Recibo
                'FP',  // Fatura Proforma
                'FA',  // Fatura de Adiantamento
                'NC',  // Nota de Crédito
                'ND',  // Nota de Débito
                'RC',  // Recibo
                'FRt', // Fatura de Retificação
            ]);

            // Código da série (ex: 'B', 'A', 'P') — parte do numero_documento
            $table->string('serie', 10);
            $table->string('descricao', 255)->nullable();

            // Ano fiscal — null = válida para qualquer ano
            $table->year('ano')->nullable();

            // Último número emitido — actualizado com lockForUpdate() pelo service
            $table->unsignedInteger('ultimo_numero')->default(0);

            // Número de dígitos no sufixo numérico (ex: 5 → B-00001)
            $table->unsignedTinyInteger('digitos')->default(5);

            // Controlo
            $table->boolean('ativa')->default(true);
            $table->boolean('padrao')->default(false);

            // Valida junto da AGT (Administração Geral Tributária Angola)
            // false para FP (proforma) e RC (recibo) — isentos de assinatura RSA
            $table->boolean('valida_agt')->default(true);

            $table->text('observacoes')->nullable();
            $table->timestamps();

            // ── Índices ──────────────────────────────────────────────────
            $table->index(['tipo_documento', 'ativa']);
            $table->index(['tipo_documento', 'ano', 'ativa']);
            $table->index(['tipo_documento', 'padrao', 'ativa']); // busca série padrão activa

            // Uma série é única por tipo + código + ano
            $table->unique(['tipo_documento', 'serie', 'ano'], 'uk_serie_tipo_ano');
        });

        // ── Séries padrão ─────────────────────────────────────────────────
        // Inseridas aqui para garantir que o sistema arranca com séries activas.
        $ano = (int) date('Y');
        $now = now();

        DB::table('series_fiscais')->insert([
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FT',
                'serie'          => 'B',
                'descricao'      => 'Série padrão — Faturas',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 5,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FR',
                'serie'          => 'R',
                'descricao'      => 'Série padrão — Faturas-Recibo',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 5,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FP',
                'serie'          => 'P',
                'descricao'      => 'Série padrão — Faturas Proforma',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 5,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => false, // Proforma sem validade fiscal
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FA',
                'serie'          => 'A',
                'descricao'      => 'Série padrão — Faturas de Adiantamento',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 5,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'NC',
                'serie'          => 'C',
                'descricao'      => 'Série padrão — Notas de Crédito',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 5,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'ND',
                'serie'          => 'D',
                'descricao'      => 'Série padrão — Notas de Débito',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 5,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'RC',
                'serie'          => 'RC',
                'descricao'      => 'Série padrão — Recibos',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 5,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => false, // Recibos isentos de assinatura RSA (AGT)
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FRt',
                'serie'          => 'T',
                'descricao'      => 'Série padrão — Faturas de Retificação',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 5,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('series_fiscais');
    }
};