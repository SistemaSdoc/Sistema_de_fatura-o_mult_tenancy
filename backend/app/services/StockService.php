<?php

namespace App\Services;

use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Models\DocumentoFiscal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockService
{
    /**
     * Movimentação genérica de stock (entrada / saída)
     */
    public function movimentar(
        string $produtoId,
        int $quantidade,
        string $tipo, // entrada | saida
        string $tipoMovimento, // compra | venda | ajuste | nota_credito
        ?string $referencia = null,
        ?string $observacao = null
    ): MovimentoStock {

        return DB::transaction(function () use (
            $produtoId, $quantidade, $tipo, $tipoMovimento, $referencia, $observacao
        ) {
            $produto = Produto::lockForUpdate()->findOrFail($produtoId);

            if ($quantidade <= 0) {
                throw new \Exception('Quantidade inválida para movimentação de stock.');
            }

            // Validar se é produto físico
            if ($produto->tipo === 'servico') {
                throw new \Exception('Serviços não possuem controle de stock.');
            }

            $estoqueAnterior = $produto->estoque_atual;

            // Calcular nova quantidade
            if ($tipo === 'entrada') {
                $novaQuantidade = $estoqueAnterior + $quantidade;
            } else {
                if ($estoqueAnterior < $quantidade) {
                    throw new \Exception(
                        "Stock insuficiente do produto {$produto->nome}. " .
                        "Disponível: {$estoqueAnterior}, Necessário: {$quantidade}"
                    );
                }
                $novaQuantidade = $estoqueAnterior - $quantidade;
            }

            // Atualizar produto
            $produto->estoque_atual = $novaQuantidade;
            $produto->save();

            // Criar movimento
            $movimento = MovimentoStock::create([
                'id' => Str::uuid(),
                'produto_id' => $produto->id,
                'user_id' => Auth::id(),
                'tipo' => $tipo,
                'tipo_movimento' => $tipoMovimento,
                'quantidade' => $tipo === 'entrada' ? $quantidade : -$quantidade,
                'estoque_anterior' => $estoqueAnterior,
                'estoque_novo' => $novaQuantidade,
                'custo_medio' => $produto->custo_medio,
                'stock_minimo' => $produto->estoque_minimo,
                'referencia' => $referencia,
                'observacao' => $observacao,
            ]);

            return $movimento;
        });
    }

    /**
     * Processar stock de documento fiscal completo
     * ATUALIZADO: Verifica estado cancelado e tipo de documento
     */
    public function processarDocumentoFiscal(DocumentoFiscal $documento): void
    {
        // Não processar se cancelado
        if ($documento->estado === 'cancelado') {
            return;
        }

        // Apenas FT, FR, NC afetam stock
        if (!$documento->afetaStock()) {
            return;
        }

        $tipo = $documento->tipo_documento === 'NC' ? 'entrada' : 'saida';
        $tipoMovimento = $documento->tipo_documento === 'NC' ? 'nota_credito' : 'venda';

        foreach ($documento->itens as $item) {
            if (!$item->produto_id || $item->produto?->tipo === 'servico') {
                continue;
            }

            $this->movimentar(
                $item->produto_id,
                abs($item->quantidade),
                $tipo,
                $tipoMovimento,
                $documento->id,
                "Documento: {$documento->numero_documento} | Item: {$item->descricao}"
            );
        }
    }

    /**
     * Reverter stock de documento fiscal cancelado
     */
    public function reverterDocumentoFiscal(DocumentoFiscal $documento): void
    {
        if (!$documento->afetaStock()) {
            return;
        }

        // Inverter o movimento (saida vira entrada, entrada vira saida)
        $tipo = $documento->tipo_documento === 'NC' ? 'saida' : 'entrada';
        $tipoMovimento = 'ajuste'; // Ajuste por cancelamento

        foreach ($documento->itens as $item) {
            if (!$item->produto_id || $item->produto?->tipo === 'servico') {
                continue;
            }

            $this->movimentar(
                $item->produto_id,
                abs($item->quantidade),
                $tipo,
                $tipoMovimento,
                $documento->id,
                "Reversão por cancelamento: {$documento->numero_documento}"
            );
        }
    }

    /**
     * Entrada de compra com cálculo de custo médio ponderado
     */
    public function entradaCompra(
        string $produtoId,
        int $quantidade,
        float $precoCompra,
        ?string $compraId = null
    ): void {
        DB::transaction(function () use ($produtoId, $quantidade, $precoCompra, $compraId) {
            $produto = Produto::lockForUpdate()->findOrFail($produtoId);

            if ($quantidade <= 0 || $precoCompra <= 0) {
                throw new \Exception('Quantidade ou preço de compra inválidos.');
            }

            $stockAnterior = $produto->estoque_atual;
            $novoStock = $stockAnterior + $quantidade;

            // Custo médio ponderado
            $custoAnterior = $produto->custo_medio ?? 0;
            $novoCustoMedio = (
                ($stockAnterior * $custoAnterior) +
                ($quantidade * $precoCompra)
            ) / max($novoStock, 1);

            $produto->estoque_atual = $novoStock;
            $produto->custo_medio = round($novoCustoMedio, 2);
            $produto->save();

            $this->movimentar(
                $produtoId,
                $quantidade,
                'entrada',
                'compra',
                $compraId,
                'Entrada de compra com custo médio atualizado'
            );
        });
    }

    /**
     * Saída de stock por venda
     */
    public function saidaVenda(
        string $produtoId,
        int $quantidade,
        ?string $vendaId = null
    ): void {
        $this->movimentar(
            $produtoId,
            $quantidade,
            'saida',
            'venda',
            $vendaId,
            'Saída de stock por venda'
        );
    }

    /**
     * Ajuste manual de stock
     */
    public function ajusteManual(
        string $produtoId,
        int $quantidade,
        string $tipo, // entrada | saida
        ?string $referencia = null,
        ?string $observacao = null
    ): void {
        $this->movimentar(
            $produtoId,
            $quantidade,
            $tipo,
            'ajuste',
            $referencia ?? 'AJUSTE-MANUAL',
            $observacao
        );
    }

    /**
     * Produtos com stock em risco (<= estoque mínimo)
     */
    public function produtosEmRisco()
    {
        return Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->where('tipo', '!=', 'servico')
            ->where('status', 'ativo')
            ->get();
    }

    /**
     * Relatório completo de stock
     */
    public function relatorio()
    {
        return Produto::where('tipo', '!=', 'servico')
            ->select(
                'id',
                'nome',
                'estoque_atual',
                'estoque_minimo',
                'custo_medio',
                'preco_venda',
                'status'
            )
            ->get();
    }

    /**
     * Dashboard de stock
     */
    public function dashboard(): array
    {
        $produtosEmRisco = $this->produtosEmRisco();

        return [
            'produtos_total' => Produto::where('tipo', '!=', 'servico')->count(),
            'stock_baixo' => $produtosEmRisco->count(),
            'valor_stock' => Produto::where('tipo', '!=', 'servico')->sum(
                DB::raw('estoque_atual * IFNULL(custo_medio, 0)')
            ),
            'produtos_em_risco' => $produtosEmRisco->pluck('nome')->toArray(),
            'movimentos_hoje' => MovimentoStock::whereDate('created_at', today())->count(),
            'saidas_por_venda' => MovimentoStock::whereDate('created_at', today())
                ->where('tipo_movimento', 'venda')
                ->count(),
        ];
    }
}
