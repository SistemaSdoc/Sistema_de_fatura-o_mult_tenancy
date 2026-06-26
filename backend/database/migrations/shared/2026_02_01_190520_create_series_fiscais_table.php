<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Migration: criar tabela series_fiscais e inserir séries padrão
 *
 * Formato ANGOLANO: {TIPO} {SERIE}/{ANO}/{NUMERO}
 * Exemplo: FR A/2026/0542
 *
 * A tabela é usada pelo DocumentoFiscalService::gerarNumeroDocumento()
 * com lockForUpdate() dentro de transacção para garantir numeração
 * sequencial sem gaps nem duplicados.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('series_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();


            // Auditoria — utilizador que criou a série
            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Tipo de documento — alinhado com DocumentoFiscal::TIPO_*
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

            // Código da série (ex: 'A', 'LOJA2', 'P', etc.)
            // Agora suporta até 20 caracteres para nomes descritivos
            $table->string('serie', 20);
            $table->string('descricao', 255)->nullable();

            // Ano fiscal — OBRIGATÓRIO para o formato angolano
            $table->year('ano')->nullable(false); // ✅ AGORA OBRIGATÓRIO

            // Último número emitido — actualizado com lockForUpdate()
            $table->unsignedInteger('ultimo_numero')->default(0);

            // Número de dígitos no sufixo numérico
            // Padrão angolano: 4 dígitos (0001, 0542, etc.)
            $table->unsignedTinyInteger('digitos')->default(4); // ✅ ALTERADO PARA 4

            // Controlo
            $table->boolean('ativa')->default(true);
            $table->boolean('padrao')->default(false);

            // Valida AGT (Administração Geral Tributária Angola)
            $table->boolean('valida_agt')->default(true);

            $table->text('observacoes')->nullable();
            $table->timestamps();

            // ── Índices ──────────────────────────────────────────────────
            $table->index(['tipo_documento', 'ativa']);
            $table->index(['tipo_documento', 'ano', 'ativa']);
            $table->index(['tipo_documento', 'padrao', 'ativa']);

            // Uma série é única por tipo + código + ano
            $table->unique(['tipo_documento', 'serie', 'ano'], 'uk_serie_tipo_ano');
        });

        // ── Séries padrão com formato angolano ────────────────────────
        $ano = (int) date('Y');
        $now = now();

        DB::table('series_fiscais')->insert([
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FT',
                'serie'          => 'A',      // ← NOME DESCRITIVO
                'descricao'      => 'Série padrão — Faturas (Loja Principal)',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 4,            // ← 4 DÍGITOS
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FR',
                'serie'          => 'A',      // ← MESMA SÉRIE PARA FR
                'descricao'      => 'Série padrão — Faturas-Recibo (Loja Principal)',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 4,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FP',
                'serie'          => 'PROFORMA',
                'descricao'      => 'Série padrão — Faturas Proforma',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 4,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => false,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FA',
                'serie'          => 'ADTO',
                'descricao'      => 'Série padrão — Faturas de Adiantamento',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 4,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'NC',
                'serie'          => 'CREDITO',
                'descricao'      => 'Série padrão — Notas de Crédito',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 4,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'ND',
                'serie'          => 'DEBITO',
                'descricao'      => 'Série padrão — Notas de Débito',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 4,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'RC',
                'serie'          => 'RECIBO',
                'descricao'      => 'Série padrão — Recibos',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 4,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => false,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'id'             => (string) Str::uuid(),
                'tipo_documento' => 'FRt',
                'serie'          => 'RETIF',
                'descricao'      => 'Série padrão — Faturas de Retificação',
                'ano'            => $ano,
                'ultimo_numero'  => 0,
                'digitos'        => 4,
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