<?php

namespace App\Services;

use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Models\DocumentoFiscal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

/**
 * StockService
 *
 * Gestão de movimentações de stock.
 * Serviços são sempre ignorados — não têm stock físico.
 * Custo médio ponderado actualizado em cada entrada de compra.
 */
class StockService
{
    /* =====================================================================
     | MOVIMENTAÇÃO GENÉRICA
     | ================================================================== */
    // Tipos de movimento válidos
    private const TIPOS_MOVIMENTO_VALIDOS = [
        'compra', 'venda', 'ajuste', 
        'nota_credito', 'venda_cancelada', 
        'nota_credito_cancelada'
    ];
    /**
     * Movimentação genérica de stock (entrada / saída).
     * Retorna null e regista warning se o produto for um serviço.
     */
    public function movimentar(
        string $produtoId,
        int $quantidade,
        string $tipo,
        string $tipoMovimento,
        ?string $referencia = null,
        ?string $observacao = null
    ): ?MovimentoStock {
        // ✅ Validação 1: Tipo de movimento
        if (!in_array($tipoMovimento, self::TIPOS_MOVIMENTO_VALIDOS)) {
            throw new \InvalidArgumentException(
                "Tipo de movimento inválido: {$tipoMovimento}. " .
                "Permitidos: " . implode(', ', self::TIPOS_MOVIMENTO_VALIDOS)
            );
        }

        Log::info('[StockService] Iniciando movimentação', [
            'produto_id' => $produtoId,
            'quantidade' => $quantidade,
            'tipo' => $tipo,
            'tipo_movimento' => $tipoMovimento,
        ]);

        return DB::transaction(function () use (
            $produtoId, $quantidade, $tipo, $tipoMovimento, $referencia, $observacao
        ) {
            $produto = Produto::lockForUpdate()->findOrFail($produtoId);

            if ($quantidade <= 0) {
                throw new \Exception('Quantidade inválida para movimentação de stock.');
            }

            if ($produto->tipo === 'servico') {
                Log::warning('[StockService] Tentativa de movimentar serviço ignorada', [
                    'produto' => $produto->nome,
                ]);
                return null;
            }

            $estoqueAnterior = $produto->estoque_atual;

            if ($tipo === 'entrada') {
                $novaQuantidade = $estoqueAnterior + $quantidade;
                Log::info('[StockService] Entrada de stock', [
                    'produto' => $produto->nome,
                    'anterior' => $estoqueAnterior,
                    'entrada' => $quantidade,
                    'novo' => $novaQuantidade,
                ]);
            } else {
                if ($estoqueAnterior < $quantidade) {
                    throw new \Exception(
                        "Stock insuficiente. Produto: {$produto->nome}, " .
                        "Disponível: {$estoqueAnterior}, Necessário: {$quantidade}"
                    );
                }
                $novaQuantidade = $estoqueAnterior - $quantidade;
                Log::info('[StockService] Saída de stock', [
                    'produto' => $produto->nome,
                    'anterior' => $estoqueAnterior,
                    'saida' => $quantidade,
                    'novo' => $novaQuantidade,
                ]);
            }

            $produto->estoque_atual = $novaQuantidade;
            $produto->save();

            // ✅ Correção: user_id pode ser null em operações de sistema
            $movimento = MovimentoStock::create([
                'id' => Str::uuid(),
                'produto_id' => $produto->id,
                'user_id' => Auth::check() ? Auth::id() : null,
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
                'estoque_novo' => $novaQuantidade,
            ]);

            return $movimento;
        });
    }

    /* =====================================================================
     | PROCESSAMENTO DE DOCUMENTO FISCAL
     | ================================================================== */

    /**
     * Processa stock de documento fiscal completo (FT, FR, NC).
     * Ignora serviços e documentos cancelados.
     */
    public function processarDocumentoFiscal(DocumentoFiscal $documento): void
    {
        Log::info('[StockService] Processando documento fiscal', [
            'documento_id' => $documento->id,
            'numero'       => $documento->numero_documento,
            'tipo'         => $documento->tipo_documento,
            'estado'       => $documento->estado,
        ]);

        if ($documento->estado === 'cancelado') {
            Log::warning('[StockService] Documento cancelado, ignorando', [
                'documento' => $documento->numero_documento,
            ]);
            return;
        }

        if (! $documento->afetaStock()) {
            Log::info('[StockService] Documento não afeta stock', [
                'tipo' => $documento->tipo_documento,
            ]);
            return;
        }

        $tipo          = $documento->tipo_documento === 'NC' ? 'entrada' : 'saida';
        $tipoMovimento = $documento->tipo_documento === 'NC' ? 'nota_credito' : 'venda';

        foreach ($documento->itens as $item) {
            if (! $item->produto_id || $item->produto?->tipo === 'servico') {
                Log::info('[StockService] Item ignorado (serviço ou sem produto)', [
                    'descricao' => $item->descricao,
                ]);
                continue;
            }

            Log::info('[StockService] Processando item', [
                'produto'    => $item->produto?->nome,
                'quantidade' => $item->quantidade,
                'tipo'       => $tipo,
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
     * Reverte stock de documento fiscal cancelado.
     * A lógica é inversa: NC (entrada) reverte para saída, outros revertem para entrada.
     */
   public function reverterDocumentoFiscal(DocumentoFiscal $documento): void
    {
        Log::info('[StockService] Revertendo documento fiscal', [
            'documento_id' => $documento->id,
            'numero' => $documento->numero_documento,
        ]);

        if (!$documento->afetaStock()) {
            return;
        }

        // ✅ Correção: Tipos específicos para cancelamento
        $tipo = $documento->tipo_documento === 'NC' ? 'saida' : 'entrada';
        $tipoMovimento = $documento->tipo_documento === 'NC' 
            ? 'nota_credito_cancelada' 
            : 'venda_cancelada';

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

    /* =====================================================================
     | ENTRADA DE COMPRA
     | ================================================================== */

    /**
     * Regista entrada de compra com cálculo de custo médio ponderado.
     * Apenas para produtos físicos — serviços são ignorados.
     */
public function entradaCompra(
    string $produtoId,
    int $quantidade,
    float $precoCompra,
    ?string $compraId = null
): ?MovimentoStock {
    return DB::transaction(function () use ($produtoId, $quantidade, $precoCompra, $compraId) {
        $produto = Produto::lockForUpdate()->findOrFail($produtoId);

        if ($produto->tipo === 'servico') {
            Log::warning('[StockService] Tentativa de entrada em serviço ignorada');
            return null;
        }

        if ($quantidade <= 0 || $precoCompra <= 0) {
            throw new \Exception('Quantidade ou preço de compra inválidos.');
        }

        $stockAnterior = $produto->estoque_atual;
        
        $custoAnterior = $produto->custo_medio ?? 0;
        $novoCustoMedio = (
            ($stockAnterior * $custoAnterior) +
            ($quantidade * $precoCompra)
        ) / max($stockAnterior + $quantidade, 1);

        $produto->custo_medio = round($novoCustoMedio, 2);
        $produto->save();

        return $this->movimentar(
            $produtoId,
            $quantidade,
            'entrada',
            'compra',
            $compraId,
            'Entrada de compra com custo médio actualizado'
        );
    });
}


    /* =====================================================================
     | SAÍDA DE VENDA
     | ================================================================== */

    /**
     * Regista saída de stock por venda.
     * Apenas para produtos físicos.
     */
 public function saidaVenda(string $produtoId, int $quantidade, ?string $vendaId = null): ?MovimentoStock
    {
        if (Produto::where('id', $produtoId)->where('tipo', 'servico')->exists()) {
            Log::warning('[StockService] Saída em serviço ignorada');
            return null;
        }

        return $this->movimentar($produtoId, $quantidade, 'saida', 'venda', $vendaId, 'Venda de produto');
    }

    /* =====================================================================
     | AJUSTE MANUAL
     | ================================================================== */

    /**
     * Ajuste manual de stock (inventário, correcção, etc.).
     * Apenas para produtos físicos.
     */
  public function ajusteManual(string $produtoId, int $quantidade, string $tipo, ?string $referencia = null, ?string $observacao = null): ?MovimentoStock
    {
        if (Produto::where('id', $produtoId)->where('tipo', 'servico')->exists()) {
            Log::warning('[StockService] Ajuste em serviço ignorado');
            return null;
        }

        if (!in_array($tipo, ['entrada', 'saida'])) {
            throw new \InvalidArgumentException("Tipo deve ser 'entrada' ou 'saida'.");
        }

        return $this->movimentar(
            $produtoId,
            $quantidade,
            $tipo,
            'ajuste',
            $referencia ?? 'AJUSTE-MANUAL-' . Str::random(6),
            $observacao
        );
    }

    /* =====================================================================
     | DISPONIBILIDADE
     | ================================================================== */

    /**
     * Verifica disponibilidade de estoque.
     * Serviços são sempre considerados disponíveis.
     */
    public function verificarDisponibilidade(string $produtoId, int $quantidade): bool
    {
        $produto = Produto::findOrFail($produtoId);

        if ($produto->tipo === 'servico') {
            return true;
        }

        return $produto->estoque_atual >= $quantidade;
    }

    /* =====================================================================
     | CONSULTAS E RELATÓRIOS
     | ================================================================== */

    /**
     * Histórico de movimentações de um produto.
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
     * Produtos com stock em risco (estoque_atual <= estoque_minimo).
     * Apenas produtos físicos — serviços excluídos.
     */
    public function produtosEmRisco()
    {
        return Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->where('tipo', 'produto')
            ->where('status', 'ativo')
            ->get();
    }

    /**
     * Relatório completo de stock (apenas produtos físicos).
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
                    'id'             => $produto->id,
                    'nome'           => $produto->nome,
                    'codigo'         => $produto->codigo,
                    'estoque_atual'  => $produto->estoque_atual,
                    'estoque_minimo' => $produto->estoque_minimo,
                    'custo_medio'    => $produto->custo_medio,
                    'preco_venda'    => $produto->preco_venda,
                    'valor_total'    => $produto->estoque_atual * $produto->custo_medio,
                    'status'         => $produto->status,
                    'em_risco'       => $produto->estoque_atual <= $produto->estoque_minimo,
                ];
            });
    }

    /**
     * Dashboard de stock.
     */
    public function dashboard(): array
    {
        $produtosEmRisco = $this->produtosEmRisco();

        $valorStock = Produto::where('tipo', 'produto')
            ->get()
            ->sum(function ($produto) {
                return $produto->estoque_atual * ($produto->custo_medio ?? 0);
            });

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
            'produtos_total'    => Produto::where('tipo', 'produto')->count(),
            'stock_baixo'       => $produtosEmRisco->count(),
            'valor_stock'       => round($valorStock, 2),
            'produtos_em_risco' => $produtosEmRisco->map(function ($p) {
                return [
                    'id'             => $p->id,
                    'nome'           => $p->nome,
                    'estoque_atual'  => $p->estoque_atual,
                    'estoque_minimo' => $p->estoque_minimo,
                ];
            })->toArray(),
            'movimentos_hoje'    => $movimentosHoje,
            'saidas_por_venda'   => $saidasHoje,
        ];
    }
}