<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Esta migration adiciona o tipo 'FP' (Fatura Proforma) ao ENUM
     * da tabela documentos_fiscais e corrige o tipo de produtos
     * que são serviços mas estão cadastrados como produtos.
     */
    public function up(): void
    {
        // 1. Adicionar 'FP' ao ENUM de tipo_documento na tabela documentos_fiscais
        DB::statement("ALTER TABLE documentos_fiscais MODIFY COLUMN tipo_documento ENUM(
            'FT',   -- Fatura
            'FR',   -- Fatura-Recibo
            'FP',   -- Fatura Proforma
            'FA',   -- Fatura de Adiantamento
            'NC',   -- Nota de Crédito
            'ND',   -- Nota de Débito
            'RC',   -- Recibo
            'FRt'   -- Fatura de Retificação
        ) NOT NULL");

        Log::info('✅ ENUM tipo_documento atualizado com FP (Fatura Proforma)');

        // 2. Corrigir produtos que são serviços mas estão cadastrados como produtos
        $this->corrigirTiposProdutos();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Remover 'FP' do ENUM (reverter para o estado anterior)
        DB::statement("ALTER TABLE documentos_fiscais MODIFY COLUMN tipo_documento ENUM(
            'FT',   -- Fatura
            'FR',   -- Fatura-Recibo
            'FA',   -- Fatura de Adiantamento
            'NC',   -- Nota de Crédito
            'ND',   -- Nota de Débito
            'RC',   -- Recibo
            'FRt'   -- Fatura de Retificação
        ) NOT NULL");

        Log::info('🔄 ENUM tipo_documento revertido (FP removido)');

        // 2. Reverter os produtos corrigidos (voltar para 'produto')
        $this->reverterTiposProdutos();
    }

    /**
     * Corrige produtos que são serviços mas estão cadastrados como produtos
     */
    private function corrigirTiposProdutos(): void
    {
        // Lista de produtos que são serviços
        $produtosServicos = [
            '3307add8-0442-4c5c-bab2-88811c145b1a' => 'Cibersegurança e Proteção de Dados',
            '8fb4b4ea-28f9-4e00-a536-590b24f6752c' => 'Formação e Capacitação Tecnológica',
            'f2777895-4a07-4cdb-bd53-539f7f6a7bdd' => 'Desenvolvimento de Software',
            'c6a605b7-5e7d-4b26-a427-83ca4f856a1b' => 'Manutenção e Suporte Técnico',
            '998c71e6-cc33-43bc-ab04-df7f37781bf0' => 'Consultoria em TI e Transformação Digital',
            // Adicione outros serviços aqui conforme necessário
        ];

        // Verificar se a tabela produtos existe
        if (!DB::getSchemaBuilder()->hasTable('produtos')) {
            Log::warning('⚠️ Tabela produtos não encontrada. Correção de tipos ignorada.');
            return;
        }

        $corrigidos = 0;

        foreach ($produtosServicos as $id => $nome) {
            try {
                // Buscar o produto
                $produto = DB::table('produtos')
                    ->where('id', $id)
                    ->first();

                if (!$produto) {
                    Log::warning("⚠️ Produto não encontrado: {$nome} (ID: {$id})");
                    continue;
                }

                // Verificar se está como produto e deve ser serviço
                if ($produto->tipo === 'produto') {
                    DB::table('produtos')
                        ->where('id', $id)
                        ->update([
                            'tipo' => 'servico',
                            'updated_at' => now(),
                        ]);
                    
                    $corrigidos++;
                    Log::info("✅ Produto corrigido para serviço: {$nome} (ID: {$id})");
                } else {
                    Log::info("ℹ️ Produto já está como serviço: {$nome} (ID: {$id})");
                }
            } catch (\Exception $e) {
                Log::error("❌ Erro ao corrigir produto {$nome} (ID: {$id}): " . $e->getMessage());
            }
        }

        Log::info("📊 Total de produtos corrigidos: {$corrigidos}");
    }

    /**
     * Reverte os produtos corrigidos (volta para 'produto')
     */
    private function reverterTiposProdutos(): void
    {
        // Mesma lista de produtos que foram corrigidos
        $produtosServicos = [
            '3307add8-0442-4c5c-bab2-88811c145b1a' => 'Cibersegurança e Proteção de Dados',
            '8fb4b4ea-28f9-4e00-a536-590b24f6752c' => 'Formação e Capacitação Tecnológica',
            'f2777895-4a07-4cdb-bd53-539f7f6a7bdd' => 'Desenvolvimento de Software',
            'c6a605b7-5e7d-4b26-a427-83ca4f856a1b' => 'Manutenção e Suporte Técnico',
            '998c71e6-cc33-43bc-ab04-df7f37781bf0' => 'Consultoria em TI e Transformação Digital',
        ];

        if (!DB::getSchemaBuilder()->hasTable('produtos')) {
            return;
        }

        $revertidos = 0;

        foreach ($produtosServicos as $id => $nome) {
            try {
                $produto = DB::table('produtos')
                    ->where('id', $id)
                    ->first();

                if ($produto && $produto->tipo === 'servico') {
                    DB::table('produtos')
                        ->where('id', $id)
                        ->update([
                            'tipo' => 'produto',
                            'updated_at' => now(),
                        ]);
                    
                    $revertidos++;
                    Log::info("🔄 Produto revertido para produto: {$nome} (ID: {$id})");
                }
            } catch (\Exception $e) {
                Log::error("❌ Erro ao reverter produto {$nome} (ID: {$id}): " . $e->getMessage());
            }
        }

        Log::info("📊 Total de produtos revertidos: {$revertidos}");
    }
};