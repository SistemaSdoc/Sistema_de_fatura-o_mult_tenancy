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
use Illuminate\Support\Facades\Log;

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
     * Criar venda com itens, IVA, retenção, logs fiscais e apuramento
     */
public function criarVenda(array $dados, bool $faturar = false)
{
    return DB::transaction(function () use ($dados, $faturar) {

        Log::info('=== Iniciando criação de venda ===', ['dados_recebidos' => $dados]);

        $empresa = Empresa::firstOrFail();
        $aplicaIva = $empresa->sujeito_iva;
        $regime = $empresa->regime_fiscal;

        $serieFiscal = SerieFiscal::where('tipo_documento', 'FT')
            ->where('ativa', true)
            ->where('ano', date('Y'))
            ->lockForUpdate()
            ->first();

        if (!$serieFiscal) {
            throw new \Exception("Nenhuma série fiscal ativa encontrada.");
        }

        $numero = $serieFiscal->ultimo_numero + 1;
        $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, 5, '0', STR_PAD_LEFT);
        $serieFiscal->update(['ultimo_numero' => $numero]);

        $venda = Venda::create([
            'id' => Str::uuid(),
            'cliente_id' => $dados['cliente_id'] ?? null,
            'user_id' => Auth::id(),
            'tipo_documento' => 'fatura',
            'serie' => $serieFiscal->serie,
            'numero' => $numero,
            'base_tributavel' => 0,
            'total_iva' => 0,
            'total_retencao' => 0,
            'total_pagar' => 0,
            'data_venda' => $dados['data'] ?? now()->toDateString(),
            'hora_venda' => now()->toTimeString(),
            'total' => 0,
            'status' => 'aberta',
        ]);

        Log::info('Venda criada', ['venda_id' => $venda->id, 'numero_documento' => $numeroDocumento]);

        $totalBase = 0;
        $totalIva = 0;
        $totalRetencao = 0;

        foreach ($dados['itens'] as $item) {
            $produto = Produto::findOrFail($item['produto_id']);

            $quantidade = (int) $item['quantidade'];
            $preco = (float) $item['preco_venda'];
            $desconto = (float) ($item['desconto'] ?? 0);

            $subtotal = ($preco * $quantidade) - $desconto;
            $taxaIva = ($aplicaIva && $regime === 'geral') ? ($produto->taxa_iva ?? 14) : 0;
            $valorIva = round(($subtotal * $taxaIva) / 100, 2);
            $valorRetencao = ($produto->tipo === 'servico') ? round($subtotal * 0.10, 2) : 0;
            $baseTributavel = round($subtotal, 2);
            $subtotalFinal = $baseTributavel + $valorIva - $valorRetencao;

            Log::info('Criando ItemVenda', [
                'produto_id' => $produto->id,
                'nome' => $produto->nome,
                'quantidade' => $quantidade,
                'preco_venda' => $preco,
                'desconto' => $desconto,
                'base_tributavel' => $baseTributavel,
                'valor_iva' => $valorIva,
                'valor_retencao' => $valorRetencao,
                'subtotal' => $subtotalFinal
            ]);

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
                'valor_retencao' => $valorRetencao,
                'subtotal' => $subtotalFinal,
            ]);

            if ($produto->tipo !== 'servico') {
                $this->stockService->saidaVenda($produto->id, $quantidade, $venda->id);
            }

            $totalBase += $baseTributavel;
            $totalIva += $valorIva;
            $totalRetencao += $valorRetencao;
        }

        $totalPagar = $totalBase + $totalIva - $totalRetencao;

        $venda->update([
            'base_tributavel' => $totalBase,
            'total_iva' => $totalIva,
            'total_retencao' => $totalRetencao,
            'total_pagar' => $totalPagar,
            'total' => $totalPagar,
        ]);

        Log::info('Venda atualizada com totais', [
            'venda_id' => $venda->id,
            'total_base' => $totalBase,
            'total_iva' => $totalIva,
            'total_retencao' => $totalRetencao,
            'total_pagar' => $totalPagar,
        ]);

        // Faturar
        if ($faturar) {
            Log::info('Iniciando faturamento da venda', ['venda_id' => $venda->id]);

            $this->faturaService->gerarFatura([
                'venda_id' => $venda->id,
                'cliente_id' => $venda->cliente_id,
                'tipo_documento' => 'FT',
                'itens' => $venda->itens->map(function ($item) {
                    return [
                        'produto_id' => $item->produto_id,
                        'quantidade' => $item->quantidade,
                        'preco_venda' => $item->preco_venda,
                        'desconto' => $item->desconto,
                        'base_tributavel' => $item->base_tributavel ?? 0,
                        'valor_iva' => $item->valor_iva,
                        'valor_retencao' => $item->valor_retencao,
                        'subtotal' => $item->subtotal,
                    ];
                })->toArray(),
            ]);

            $venda->update(['status' => 'faturada']);
            Log::info('Venda faturada com sucesso', ['venda_id' => $venda->id]);
        }

        Log::info('=== Finalizando criação de venda ===', ['venda_id' => $venda->id]);

        return $venda->load('itens.produto', 'cliente', 'user');
    });
}

    public function cancelarVenda(string $vendaId)
    {
        return DB::transaction(function () use ($vendaId) {

            $venda = Venda::with('itens.produto')->findOrFail($vendaId);

            if ($venda->status === 'cancelada') {
                throw new \Exception("Venda já cancelada.");
            }

            foreach ($venda->itens as $item) {
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

    public function relatorioVendas()
    {
        return Venda::with('cliente', 'itens.produto')->get();
    }
}

