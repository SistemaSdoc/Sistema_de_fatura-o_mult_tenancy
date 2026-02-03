<?php

namespace App\Services;

use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\Produto;
use App\Models\Empresa;
use App\Models\SerieFiscal;
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
    protected $stockService;
    protected $faturaService;

    public function __construct(StockService $stockService, FaturaService $faturaService)
    {
        $this->stockService = $stockService;
        $this->faturaService = $faturaService;
    }

    /**
     * Criar venda com itens, aplicando IVA, retenção, logs fiscais e apuramento de IVA
     */
    public function criarVenda(array $dados, bool $faturar = false)
    {
        return DB::transaction(function () use ($dados, $faturar) {

            $empresa = Empresa::first();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            // Série fiscal ativa
            $serieFiscal = SerieFiscal::where('tipo_documento', 'fatura')
                                       ->where('ativo', 1)
                                       ->first();
            if (!$serieFiscal) {
                throw new \Exception("Nenhuma série fiscal ativa encontrada.");
            }

            $numero = $serieFiscal->numero_atual + 1;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, 4, '0', STR_PAD_LEFT);

            $serieFiscal->update(['numero_atual' => $numero]);

            // Criar venda
            $venda = Venda::create([
                'id' => Str::uuid(),
                'cliente_id' => $dados['cliente_id'] ?? null,
                'user_id' => Auth::id(),
                'tipo_documento' => $dados['tipo_documento'] ?? 'fatura',
                'serie' => $serieFiscal->serie,
                'numero' => $numero,
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_retenção' => 0,
                'total_pagar' => 0,
                'data_venda' => $dados['data'] ?? now()->toDateString(),
                'hora_venda' => now()->toTimeString(),
                'total' => 0,
                'status' => 'aberta',
            ]);

            $totalBruto = 0;
            $totalIva = 0;
            $totalBase = 0;
            $totalRetencao = 0;

            foreach ($dados['itens'] as $item) {
                $produto = $item['produto']; // objeto Produto
                $quantidade = $item['quantidade'];
                $preco = $item['preco_venda'];
                $desconto = $item['desconto'] ?? 0;

                $subtotal = ($preco * $quantidade) - $desconto;

                // IVA
                $taxaIva = ($aplicaIva && $regime === 'geral') ? ($produto->taxa_iva ?? 14) : 0;
                $valorIva = round(($subtotal * $taxaIva) / 100, 2);

                // Retenção apenas se for serviço
                $valorRetencao = ($produto->tipo === 'servico') ? round($subtotal * 0.1, 2) : 0; // 10% retenção como exemplo

                $baseTributavel = round($subtotal, 2);

                // Criar item da venda
                ItemVenda::create([
                    'id' => Str::uuid(),
                    'venda_id' => $venda->id,
                    'produto_id' => $produto->id,
                    'quantidade' => $quantidade,
                    'descricao' => $produto->nome,
                    'preco_venda' => $preco,
                    'desconto' => $desconto,
                    'base_tributavel' => $baseTributavel,
                    'valor_iva' => $valorIva,
                    'valor_retenção' => $valorRetencao,
                    'subtotal' => $subtotal + $valorIva - $valorRetencao,
                ]);

                // Atualizar stock apenas para produtos físicos
                if ($produto->tipo !== 'servico') {
                    $this->stockService->saidaVenda($produto->id, $quantidade, $venda->id);
                }

                $totalBruto += $subtotal;
                $totalIva += $valorIva;
                $totalBase += $baseTributavel;
                $totalRetencao += $valorRetencao;
            }

            $totalPagar = $totalBruto + $totalIva - $totalRetencao;

            $venda->update([
                'base_tributavel' => $totalBase,
                'total_iva' => $totalIva,
                'total_retenção' => $totalRetencao,
                'total_pagar' => $totalPagar,
                'total' => $totalPagar,
            ]);

            // Registrar log fiscal
            LogFiscal::create([
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'fatura_id' => $venda->id,
                'acao' => 'criação',
                'status' => 'sucesso',
                'descricao' => "Venda criada com valor total {$totalPagar} e número {$numeroDocumento}",
            ]);

            // Atualizar apuramento de IVA
            $periodo = Carbon::parse($venda->data_venda)->startOfMonth()->toDateString();
            $apuramento = ApuramentoIva::firstOrCreate(
                ['periodo_inicio' => $periodo],
                ['total_base_tributavel' => 0, 'total_iva' => 0, 'total_faturas' => 0]
            );
            $apuramento->increment('total_base_tributavel', $totalBase);
            $apuramento->increment('total_iva', $totalIva);
            $apuramento->increment('total_faturas', 1);

            // Faturar automaticamente se necessário
            if ($faturar) {
                $this->faturaService->gerarFatura($venda->id);
                $venda->update(['status' => 'faturada']);
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
