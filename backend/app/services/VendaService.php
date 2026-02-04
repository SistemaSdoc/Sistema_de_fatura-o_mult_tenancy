<?php

namespace App\Services;

use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\Empresa;
use App\Models\LogFiscal;
use App\Models\ApuramentoIva;
use App\Services\StockService;
use App\Services\FaturaService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class VendaService
{
    protected StockService $stockService;
    protected FaturaService $faturaService;

    public function __construct(
        StockService $stockService,
        FaturaService $faturaService
    ) {
        $this->stockService = $stockService;
        $this->faturaService = $faturaService;
    }

    /**
     * Criar venda (movimento comercial)
     */
    public function criarVenda(array $dados, bool $faturar = false)
    {
        return DB::transaction(function () use ($dados, $faturar) {

            $empresa = Empresa::firstOrFail();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            // ================== CRIAR VENDA ==================
            $venda = Venda::create([
                'id' => Str::uuid(),
                'cliente_id' => $dados['cliente_id'] ?? null,
                'user_id' => Auth::id(),
                'tipo_documento' => 'FT',
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_retenção' => 0,
                'total_pagar' => 0,
                'data_venda' => $dados['data'] ?? now()->toDateString(),
                'hora_venda' => now()->toTimeString(),
                'total' => 0,
                'status' => 'aberta',
            ]);

            $totalBase = 0;
            $totalIva = 0;
            $totalRetencao = 0;

            // ================== ITENS ==================
            foreach ($dados['itens'] as $item) {

                $produto = $item['produto'];
                $quantidade = $item['quantidade'];
                $preco = $item['preco_venda'];
                $desconto = $item['desconto'] ?? 0;

                $subtotal = ($preco * $quantidade) - $desconto;

                // IVA
                $taxaIva = ($aplicaIva && $regime === 'geral')
                    ? ($produto->taxa_iva ?? 14)
                    : 0;

                $valorIva = round(($subtotal * $taxaIva) / 100, 2);

                // Retenção (ex: serviços)
                $valorRetencao = ($produto->tipo === 'servico')
                    ? round($subtotal * 0.1, 2)
                    : 0;

                $baseTributavel = round($subtotal, 2);

                ItemVenda::create([
                    'id' => Str::uuid(),
                    'venda_id' => $venda->id,
                    'produto_id' => $produto->id,
                    'descricao' => $produto->nome,
                    'quantidade' => $quantidade,
                    'preco_venda' => $preco,
                    'desconto' => $desconto,
                    'base_tributavel' => $baseTributavel,
                    'valor_iva' => $valorIva,
                    'valor_retenção' => $valorRetencao,
                    'subtotal' => $baseTributavel + $valorIva - $valorRetencao,
                ]);

                // Stock (só produtos físicos)
                if ($produto->tipo !== 'servico') {
                    $this->stockService->saidaVenda(
                        $produto->id,
                        $quantidade,
                        $venda->id
                    );
                }

                $totalBase += $baseTributavel;
                $totalIva += $valorIva;
                $totalRetencao += $valorRetencao;
            }

            $totalPagar = $totalBase + $totalIva - $totalRetencao;

            // ================== ATUALIZAR TOTAIS ==================
            $venda->update([
                'base_tributavel' => $totalBase,
                'total_iva' => $totalIva,
                'total_retenção' => $totalRetencao,
                'total_pagar' => $totalPagar,
                'total' => $totalPagar,
            ]);

            // ================== LOG ==================
            LogFiscal::create([
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'fatura_id' => null, // ainda não é fatura
                'acao' => 'criação_venda',
                'status' => 'sucesso',
                'descricao' => "Venda criada no valor {$totalPagar}",
            ]);

            // ================== APURAMENTO IVA ==================
            $periodo = Carbon::parse($venda->data_venda)
                ->startOfMonth()
                ->toDateString();

            $apuramento = ApuramentoIva::firstOrCreate(
                ['periodo_inicio' => $periodo],
                [
                    'total_base_tributavel' => 0,
                    'total_iva' => 0,
                    'total_faturas' => 0
                ]
            );

            $apuramento->increment('total_base_tributavel', $totalBase);
            $apuramento->increment('total_iva', $totalIva);

            // ================== FATURAR ==================
            if ($faturar) {
                $this->faturaService->gerarFatura($venda->id);
                $venda->update(['status' => 'faturada']);
                $apuramento->increment('total_faturas', 1);
            }

            return $venda->load('itens.produto', 'cliente', 'user');
        });
    }

    
    /**
     * Cancelar venda e devolver stock
     */
    public function cancelarVenda(string $vendaId)
    {
        return DB::transaction(function () use ($vendaId) {
            $venda = Venda::with('itens.produto')->findOrFail($vendaId);

            if ($venda->status === 'cancelada') {
                throw new \Exception("Venda já está cancelada");
            }

            foreach ($venda->itens as $item) {
                // Devolver stock apenas para produtos físicos
                if ($item->produto->tipo !== 'servico') {
                    $this->stockService->movimentar(
                        $item->produto_id,
                        $item->quantidade,
                        'entrada',
                        'venda_cancelada',
                        $venda->id
                    );
                }
            }

            $venda->update(['status' => 'cancelada']);
            return $venda;
        });
    }

    /**
     * Relatório de vendas
     */
    public function relatorioVendas()
    {
        return Venda::with('cliente', 'itens.produto')->get();
    }

}
