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
            $empresa = Empresa::first(); 

            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            $numero = $this->gerarNumero($tipo);
            $serie = 'A';
            $dataVencimento = now()->addDays(30)->toDateString(); // opcional 30 dias

            $totalBase = 0;
            $totalIva = 0;
            $totalRetencao = 0;

            // Criar fatura
            $fatura = Fatura::create([
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'venda_id' => $venda->id,
                'cliente_id' => $venda->cliente_id,
                'serie' => $serie,
                'numero' => $numero,
                'tipo_documento' => $tipo,
                'data_emissao' => now()->toDateString(),
                'hora_emissao' => now()->toTimeString(),
                'data_vencimento' => $dataVencimento,
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_retenção' => 0,
                'total_liquido' => 0,
                'estado' => 'emitido',
                'hash_fiscal' => null,
            ]);

            foreach ($venda->itens as $item) {

                $desconto = 0;
                $baseTributavel = $item->quantidade * $item->preco_venda - $desconto;

                // IVA
                $taxaIva = ($aplicaIva && $regime === 'geral') ? $item->produto->taxa_iva : 0;
                $valorIva = round(($baseTributavel * $taxaIva) / 100, 2);

                // Retenção somente para serviços
                $valorRetencao = ($item->produto->tipo === 'serviço') ? round(($baseTributavel * 10) / 100, 2) : 0;

                $totalLinha = $baseTributavel + $valorIva - $valorRetencao - $desconto;

                // Criar item da fatura
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
                    'valor_retenção' => $valorRetencao,
                    'desconto' => $desconto,
                    'total_linha' => $totalLinha,
                ]);

                $totalBase += $baseTributavel;
                $totalIva += $valorIva;
                $totalRetencao += $valorRetencao;
            }

            $totalLiquido = $totalBase + $totalIva - $totalRetencao;

            // Gerar hash fiscal
            $hash = sha1($fatura->numero . $totalLiquido . now());

            $fatura->update([
                'base_tributavel' => $totalBase,
                'total_iva' => $totalIva,
                'total_retenção' => $totalRetencao,
                'total_liquido' => $totalLiquido,
                'hash_fiscal' => $hash,
            ]);

            return $fatura->load('itens');
        });
    }

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

    private function gerarNumero(string $tipo)
    {
        $ano = date('Y');
        $ultima = Fatura::where('tipo_documento', $tipo)
                        ->whereYear('created_at', $ano)
                        ->count() + 1;

        return "{$tipo}/{$ano}/" . str_pad($ultima, 5, '0', STR_PAD_LEFT);
    }
}
