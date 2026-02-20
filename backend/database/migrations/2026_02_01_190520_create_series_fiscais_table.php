<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('series_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Relacionamento opcional com usuário que criou a série
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            // Tipo de documento - ATUALIZADO: Adicionado FP
            $table->enum('tipo_documento', [
                'FT',   // Fatura - VENDA
                'FR',   // Fatura-Recibo - VENDA
                'FP',   // Fatura Proforma - NÃO VENDA (NOVO)
                'FA',   // Fatura de Adiantamento - NÃO VENDA
                'NC',   // Nota de Crédito - NÃO VENDA
                'ND',   // Nota de Débito - NÃO VENDA
                'RC',   // Recibo - VENDA
                'FRt'   // Fatura de Retificação - NÃO VENDA
            ]);

            $table->string('serie', 10);       // Série: A, B, C, P (Proforma), R (Recibo), etc.
            $table->string('descricao', 255)->nullable(); // Descrição da série
            $table->year('ano')->nullable();   // Ano da série, opcional
            $table->integer('ultimo_numero')->default(0); // último número usado
            $table->boolean('ativa')->default(true);      // se a série está ativa

            // Configurações adicionais
            $table->boolean('padrao')->default(false);    // se é série padrão para o tipo
            $table->integer('digitos')->default(5);       // número de dígitos (ex: 00001)
            $table->string('prefixo')->nullable();        // prefixo opcional
            $table->string('sufixo')->nullable();         // sufixo opcional

            // Validação fiscal
            $table->boolean('valida_aft')->default(true); // se valida na AFT (Autoridade Tributária)

            // Observações
            $table->text('observacoes')->nullable();

            $table->timestamps();

            // Índices para performance
            $table->index(['tipo_documento', 'ano', 'ativa']);
            $table->index('serie');
            $table->index('padrao');
            $table->index(['tipo_documento', 'padrao', 'ativa']); // para buscar série padrão

            // Garante unicidade de série por tipo e ano
            $table->unique(['tipo_documento', 'serie', 'ano'], 'uk_serie_tipo_ano');
        });

        // Inserir séries padrão para todos os tipos
        DB::table('series_fiscais')->insert([
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'tipo_documento' => 'FT',
                'serie' => 'B',
                'descricao' => 'Série padrão para Faturas',
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'digitos' => 5,
                'ano' => date('Y'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'tipo_documento' => 'FR',
                'serie' => 'R',
                'descricao' => 'Série padrão para Faturas-Recibo',
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'digitos' => 5,
                'ano' => date('Y'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'tipo_documento' => 'FP',
                'serie' => 'P',
                'descricao' => 'Série padrão para Faturas Proforma',
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'digitos' => 5,
                'ano' => date('Y'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'tipo_documento' => 'FA',
                'serie' => 'A',
                'descricao' => 'Série padrão para Faturas de Adiantamento',
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'digitos' => 5,
                'ano' => date('Y'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'tipo_documento' => 'NC',
                'serie' => 'C',
                'descricao' => 'Série padrão para Notas de Crédito',
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'digitos' => 5,
                'ano' => date('Y'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'tipo_documento' => 'ND',
                'serie' => 'D',
                'descricao' => 'Série padrão para Notas de Débito',
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'digitos' => 5,
                'ano' => date('Y'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'tipo_documento' => 'RC',
                'serie' => 'R',
                'descricao' => 'Série padrão para Recibos',
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'digitos' => 5,
                'ano' => date('Y'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => \Illuminate\Support\Str::uuid(),
                'tipo_documento' => 'FRt',
                'serie' => 'T',
                'descricao' => 'Série padrão para Faturas de Retificação',
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'digitos' => 5,
                'ano' => date('Y'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('series_fiscais');
    }
};
