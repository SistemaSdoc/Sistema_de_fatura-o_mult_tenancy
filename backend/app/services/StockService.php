<?php

namespace App\Services;

use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Models\DocumentoFiscal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class StockService
{
    /**
     * Movimentação genérica de stock (entrada / saída)
     * ATUALIZADO: Verificação de serviço e logs detalhados
     */
    public function movimentar(
        string $produtoId,
        int $quantidade,
        string $tipo, // entrada | saida
        string $tipoMovimento, // compra | venda | ajuste | nota_credito
        ?string $referencia = null,
        ?string $observacao = null
    ): ?MovimentoStock {

        Log::info('[StockService] Iniciando movimentação', [
            'produto_id' => $produtoId,
            'quantidade' => $quantidade,
            'tipo' => $tipo,
            'tipo_movimento' => $tipoMovimento
        ]);

        return DB::transaction(function () use (
            $produtoId, $quantidade, $tipo, $tipoMovimento, $referencia, $observacao
        ) {
            $produto = Produto::lockForUpdate()->findOrFail($produtoId);

            if ($quantidade <= 0) {
                throw new \Exception('Quantidade inválida para movimentação de stock.');
            }

            // ✅ VERIFICAÇÃO: Serviços não têm stock
            if ($produto->tipo === 'servico') {
                Log::warning('[StockService] Tentativa de movimentar serviço ignorada', [
                    'produto' => $produto->nome,
                    'quantidade' => $quantidade
                ]);
                return null;
            }

            $estoqueAnterior = $produto->estoque_atual;

            // Calcular nova quantidade
            if ($tipo === 'entrada') {
                $novaQuantidade = $estoqueAnterior + $quantidade;
                Log::info('[StockService] Entrada de stock', [
                    'produto' => $produto->nome,
                    'anterior' => $estoqueAnterior,
                    'entrada' => $quantidade,
                    'novo' => $novaQuantidade
                ]);
            } else {
                if ($estoqueAnterior < $quantidade) {
                    throw new \Exception(
                        "Stock insuficiente do produto {$produto->nome}. " .
                        "Disponível: {$estoqueAnterior}, Necessário: {$quantidade}"
                    );
                }
                $novaQuantidade = $estoqueAnterior - $quantidade;
                Log::info('[StockService] Saída de stock', [
                    'produto' => $produto->nome,
                    'anterior' => $estoqueAnterior,
                    'saida' => $quantidade,
                    'novo' => $novaQuantidade
                ]);
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

            Log::info('[StockService] Movimento registrado', [
                'movimento_id' => $movimento->id,
                'produto' => $produto->nome,
                'estoque_novo' => $novaQuantidade
            ]);

            return $movimento;
        });
    }

    /**
     * Processar stock de documento fiscal completo
     * ATUALIZADO: Ignora serviços e verifica estado cancelado
     */
    public function processarDocumentoFiscal(DocumentoFiscal $documento): void
    {
        Log::info('[StockService] Processando documento fiscal', [
            'documento_id' => $documento->id,
            'numero' => $documento->numero_documento,
            'tipo' => $documento->tipo_documento,
            'estado' => $documento->estado
        ]);

        // Não processar se cancelado
        if ($documento->estado === 'cancelado') {
            Log::warning('[StockService] Documento cancelado, ignorando', [
                'documento' => $documento->numero_documento
            ]);
            return;
        }

        // Apenas FT, FR, NC afetam stock
        if (!$documento->afetaStock()) {
            Log::info('[StockService] Documento não afeta stock', [
                'tipo' => $documento->tipo_documento
            ]);
            return;
        }

        $tipo = $documento->tipo_documento === 'NC' ? 'entrada' : 'saida';
        $tipoMovimento = $documento->tipo_documento === 'NC' ? 'nota_credito' : 'venda';

        foreach ($documento->itens as $item) {
            // ✅ Ignorar serviços
            if (!$item->produto_id || $item->produto?->tipo === 'servico') {
                Log::info('[StockService] Item ignorado (serviço)', [
                    'descricao' => $item->descricao
                ]);
                continue;
            }

            Log::info('[StockService] Processando item', [
                'produto' => $item->produto?->nome,
                'quantidade' => $item->quantidade,
                'tipo' => $tipo
            ]);

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
        Log::info('[StockService] Revertendo documento fiscal', [
            'documento_id' => $documento->id,
            'numero' => $documento->numero_documento
        ]);

        if (!$documento->afetaStock()) {
            return;
        }

        // Inverter o movimento (saida vira entrada, entrada vira saida)
        $tipo = $documento->tipo_documento === 'NC' ? 'saida' : 'entrada';
        $tipoMovimento = 'ajuste'; // Ajuste por cancelamento

        foreach ($documento->itens as $item) {
            // ✅ Ignorar serviços
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
     * ATUALIZADO: Verifica se é produto
     */
    public function entradaCompra(
        string $produtoId,
        int $quantidade,
        float $precoCompra,
        ?string $compraId = null
    ): void {
        DB::transaction(function () use ($produtoId, $quantidade, $precoCompra, $compraId) {
            $produto = Produto::lockForUpdate()->findOrFail($produtoId);

            // ✅ Verificar se é produto
            if ($produto->tipo === 'servico') {
                Log::warning('[StockService] Tentativa de entrada em serviço ignorada', [
                    'produto' => $produto->nome
                ]);
                return;
            }

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

            Log::info('[StockService] Entrada compra - custo médio', [
                'produto' => $produto->nome,
                'stock_anterior' => $stockAnterior,
                'custo_anterior' => $custoAnterior,
                'quantidade' => $quantidade,
                'preco_compra' => $precoCompra,
                'novo_custo' => $novoCustoMedio
            ]);

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
     * ATUALIZADO: Verifica se é produto
     */
    public function saidaVenda(
        string $produtoId,
        int $quantidade,
        ?string $vendaId = null
    ): void {
        $produto = Produto::find($produtoId);

        // ✅ Verificar se é produto
        if ($produto && $produto->tipo === 'servico') {
            Log::warning('[StockService] Tentativa de saída em serviço ignorada', [
                'produto' => $produto->nome
            ]);
            return;
        }

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
     * ATUALIZADO: Verifica se é produto
     */
    public function ajusteManual(
        string $produtoId,
        int $quantidade,
        string $tipo, // entrada | saida
        ?string $referencia = null,
        ?string $observacao = null
    ): void {
        $produto = Produto::find($produtoId);

        // ✅ Verificar se é produto
        if ($produto && $produto->tipo === 'servico') {
            Log::warning('[StockService] Tentativa de ajuste em serviço ignorada', [
                'produto' => $produto->nome
            ]);
            return;
        }

        $this->movimentar(
            $produtoId,
            $quantidade,
            $tipo,
            'ajuste',
            $referencia ?? 'AJUSTE-MANUAL-' . Str::random(6),
            $observacao
        );
    }

    /**
     * Verificar disponibilidade de estoque
     * ATUALIZADO: Serviços sempre disponíveis
     */
    public function verificarDisponibilidade(string $produtoId, int $quantidade): bool
    {
        $produto = Produto::findOrFail($produtoId);

        // ✅ Serviços sempre disponíveis
        if ($produto->tipo === 'servico') {
            return true;
        }

        return $produto->estoque_atual >= $quantidade;
    }

    /**
     * Obter histórico de movimentações de um produto
     */
    public function historico(string $produtoId, int $limite = 50)
    {
        return MovimentoStock::where('produto_id', $produtoId)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit($limite)
            ->get();
    }

    /**
     * Produtos com stock em risco (<= estoque mínimo)
     * ATUALIZADO: Exclui serviços explicitamente
     */
    public function produtosEmRisco()
    {
        return Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->where('tipo', 'produto') // ✅ Apenas produtos
            ->where('status', 'ativo')
            ->get();
    }

    /**
     * Relatório completo de stock
     * ATUALIZADO: Apenas produtos
     */
    public function relatorio()
    {
        return Produto::where('tipo', 'produto')
            ->select(
                'id',
                'nome',
                'codigo',
                'estoque_atual',
                'estoque_minimo',
                'custo_medio',
                'preco_venda',
                'status'
            )
            ->orderBy('nome')
            ->get()
            ->map(function ($produto) {
                return [
                    'id' => $produto->id,
                    'nome' => $produto->nome,
                    'codigo' => $produto->codigo,
                    'estoque_atual' => $produto->estoque_atual,
                    'estoque_minimo' => $produto->estoque_minimo,
                    'custo_medio' => $produto->custo_medio,
                    'preco_venda' => $produto->preco_venda,
                    'valor_total' => $produto->estoque_atual * $produto->custo_medio,
                    'status' => $produto->status,
                    'em_risco' => $produto->estoque_atual <= $produto->estoque_minimo,
                ];
            });
    }

    /**
     * Dashboard de stock
     * ATUALIZADO: Apenas produtos nos cálculos
     */
    public function dashboard(): array
    {
        $produtosEmRisco = $this->produtosEmRisco();

        // ✅ Valor total do estoque (apenas produtos)
        $valorStock = Produto::where('tipo', 'produto')
            ->get()
            ->sum(function ($produto) {
                return $produto->estoque_atual * ($produto->custo_medio ?? 0);
            });

        // ✅ Movimentações de hoje (apenas produtos)
        $movimentosHoje = MovimentoStock::whereDate('created_at', today())
            ->whereHas('produto', function ($q) {
                $q->where('tipo', 'produto');
            })
            ->count();

        $saidasHoje = MovimentoStock::whereDate('created_at', today())
            ->where('tipo', 'saida')
            ->whereHas('produto', function ($q) {
                $q->where('tipo', 'produto');
            })
            ->count();

        return [
            'produtos_total' => Produto::where('tipo', 'produto')->count(),
            'stock_baixo' => $produtosEmRisco->count(),
            'valor_stock' => round($valorStock, 2),
            'produtos_em_risco' => $produtosEmRisco->map(function ($p) {
                return [
                    'id' => $p->id,
                    'nome' => $p->nome,
                    'estoque_atual' => $p->estoque_atual,
                    'estoque_minimo' => $p->estoque_minimo,
                ];
            })->toArray(),
            'movimentos_hoje' => $movimentosHoje,
            'saidas_por_venda' => $saidasHoje,
        ];
    }
}
