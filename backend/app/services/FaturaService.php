<?php

namespace App\Services;

use App\Models\Fatura;
use App\Models\ItemFatura;
use App\Models\Venda;
use App\Models\Empresa;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class FaturaService
{
    /**
     * Gerar fatura a partir de uma venda
     */
    public function gerarFatura(string $vendaId, string $tipo = 'FT')
    {
        return DB::transaction(function () use ($vendaId, $tipo) {

            $venda = Venda::with('itens.produto', 'cliente')->findOrFail($vendaId);
            $empresa = Empresa::firstOrFail();

            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            // =================== NUMERO SEQUENCIAL SEGURO ===================
            $ano = now()->year;

            $ultimoSequencial = Fatura::where('tipo_documento', $tipo)
                ->whereYear('created_at', $ano)
                ->lockForUpdate()
                ->max('sequencial') ?? 0;

            $sequencial = $ultimoSequencial + 1;
            $serie = 'A';

            $numero = sprintf(
                '%s/%s/%05d',
                $tipo,
                $ano,
                $sequencial
            );

            $dataVencimento = now()->addDays(30)->toDateString();

            $totalBase = 0;
            $totalIva = 0;
            $totalRetencao = 0;

            // =================== CRIAR FATURA ===================
            $fatura = Fatura::create([
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'venda_id' => $venda->id,
                'cliente_id' => $venda->cliente_id,
                'serie' => $serie,
                'sequencial' => $sequencial,
                'numero' => $numero,
                'tipo_documento' => $tipo,
                'data_emissao' => now()->toDateString(),
                'hora_emissao' => now()->toTimeString(),
                'data_vencimento' => $dataVencimento,
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_retencao' => 0,
                'total_liquido' => 0,
                'estado' => 'emitido',
                'hash_fiscal' => null,
            ]);

            // =================== ITENS ===================
            foreach ($venda->itens as $item) {

                $desconto = 0;

                $baseTributavel = $item->quantidade * $item->preco_venda - $desconto;

                // IVA
                $taxaIva = ($aplicaIva && $regime === 'geral')
                    ? $item->produto->taxa_iva
                    : 0;

                $valorIva = round(($baseTributavel * $taxaIva) / 100, 2);

                // Retenção (serviços)
                $valorRetencao = ($item->produto->tipo === 'serviço')
                    ? round(($baseTributavel * 10) / 100, 2)
                    : 0;

                $totalLinha = $baseTributavel + $valorIva - $valorRetencao - $desconto;

                ItemFatura::create([
                    'id' => Str::uuid(),
                    'fatura_id' => $fatura->id,
                    'produto_id' => $item->produto_id,
                    'descricao' => $item->produto->nome,
                    'quantidade' => $item->quantidade,
                    'preco_unitario' => $item->preco_venda,
                    'base_tributavel' => $baseTributavel,
                    'taxa_iva' => $taxaIva,
                    'valor_iva' => $valorIva,
                    'valor_retencao' => $valorRetencao,
                    'desconto' => $desconto,
                    'total_linha' => $totalLinha,
                ]);

                $totalBase += $baseTributavel;
                $totalIva += $valorIva;
                $totalRetencao += $valorRetencao;
            }

            $totalLiquido = $totalBase + $totalIva - $totalRetencao;

            // =================== HASH FISCAL ===================
            $hash = sha1(
                $fatura->numero .
                $fatura->data_emissao .
                number_format($totalLiquido, 2, '.', '')
            );

            $fatura->update([
                'base_tributavel' => $totalBase,
                'total_iva' => $totalIva,
                'total_retencao' => $totalRetencao,
                'total_liquido' => $totalLiquido,
                'hash_fiscal' => $hash,
            ]);

            return $fatura->load('itens.produto', 'cliente');
        });
    }

    // =================== CONSULTAS ===================

    public function listarFaturas()
    {
        return Fatura::with('cliente', 'venda', 'itens.produto')
            ->orderBy('data_emissao', 'desc')
            ->get();
    }

    public function buscarFatura(string $faturaId)
    {
        return Fatura::with('cliente', 'venda', 'itens.produto')
            ->findOrFail($faturaId);
    }
}
