<?php

namespace App\Services;

use App\Models\Tenant\MovimentoStock;
use App\Models\Tenant\Produto;
use App\Models\Tenant\DocumentoFiscal;
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
 *
 * Alterações em conformidade com ProdutoService:
 *  - user_id pode ser null em operações de sistema (verificação mais robusta)
 *  - Tipos de movimento validados contra lista fixa
 *  - Documentos cancelados são revertidos com tipos específicos
 *  - Todos os métodos públicos aceitam ?string $userId como parâmetro
 */
class StockService
{
    /* =====================================================================
     | TIPOS DE MOVIMENTO VÁLIDOS
     | ================================================================== */

    private const TIPOS_MOVIMENTO_VALIDOS = [
        'compra',
        'venda',
        'ajuste',
        'nota_credito',
        'venda_cancelada',
        'nota_credito_cancelada'
    ];

    /* =====================================================================
     | MOVIMENTAÇÃO GENÉRICA
     | ================================================================== */

    /**
     * Movimentação genérica de stock (entrada / saída).
     * Retorna null e regista warning se o produto for um serviço.
     *
     * @param string $produtoId
     * @param int $quantidade Quantidade a movimentar (sempre positiva)
     * @param string $tipo 'entrada' ou 'saida'
     * @param string $tipoMovimento Tipo específico (compra, venda, ajuste, etc.)
     * @param string|null $referencia ID do documento fiscal ou compra associada
     * @param string|null $observacao Observação adicional
     * @param string|null $userId ID do utilizador que efectua o movimento (pode ser null)
     *
     * @return MovimentoStock|null
     * @throws \InvalidArgumentException Se tipoMovimento for inválido
     * @throws \Exception Se houver problemas na transacção
     */
    public function movimentar(
        string $produtoId,
        int $quantidade,
        string $tipo,
        string $tipoMovimento,
        ?string $referencia = null,
        ?string $observacao = null,
        ?string $userId = null,
    ): ?MovimentoStock {
        // ✅ Validação: Tipo de movimento
        if (!in_array($tipoMovimento, self::TIPOS_MOVIMENTO_VALIDOS)) {
            throw new \InvalidArgumentException(
                "Tipo de movimento inválido: {$tipoMovimento}. " .
                "Permitidos: " . implode(', ', self::TIPOS_MOVIMENTO_VALIDOS)
            );
        }

        Log::info('[StockService] Iniciando movimentação', [
            'produto_id'      => $produtoId,
            'quantidade'      => $quantidade,
            'tipo'            => $tipo,
            'tipo_movimento'  => $tipoMovimento,
            'user_id'         => $userId,
        ]);

        return DB::transaction(function () use (
            $produtoId,
            $quantidade,
            $tipo,
            $tipoMovimento,
            $referencia,
            $observacao,
            $userId
        ) {
            $produto = Produto::lockForUpdate()->findOrFail($produtoId);

            // ✅ Validação: Quantidade positiva
            if ($quantidade <= 0) {
                throw new \Exception('Quantidade inválida para movimentação de stock.');
            }

            // ✅ Validação: Produto não é serviço
            if ($produto->tipo === 'servico') {
                Log::warning('[StockService] Tentativa de movimentar serviço ignorada', [
                    'produto'  => $produto->nome,
                    'tipo_mov' => $tipoMovimento,
                ]);
                return null;
            }

            $estoqueAnterior = $produto->estoque_atual;

            // ✅ Actualizar estoque
            if ($tipo === 'entrada') {
                $novaQuantidade = $estoqueAnterior + $quantidade;
                Log::info('[StockService] Entrada de stock', [
                    'produto'   => $produto->nome,
                    'anterior'  => $estoqueAnterior,
                    'entrada'   => $quantidade,
                    'novo'      => $novaQuantidade,
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
                    'produto'  => $produto->nome,
                    'anterior' => $estoqueAnterior,
                    'saida'    => $quantidade,
                    'novo'     => $novaQuantidade,
                ]);
            }

            $produto->estoque_atual = $novaQuantidade;
            $produto->save();

            // ✅ Resolver user_id (pode ser null em operações de sistema)
            $finalUserId = $userId
                ?? (auth()->guard('tenant')->check() ? auth()->guard('tenant')->id() : null)
                ?? (Auth::check() ? Auth::id() : null);

            // ✅ Criar movimento com user_id potencialmente null
            $movimento = MovimentoStock::create([
                'id'                => Str::uuid(),
                'produto_id'        => $produto->id,
                'user_id'           => $finalUserId,
                'tipo'              => $tipo,
                'tipo_movimento'    => $tipoMovimento,
                'quantidade'        => $tipo === 'entrada' ? $quantidade : -$quantidade,
                'estoque_anterior'  => $estoqueAnterior,
                'estoque_novo'      => $novaQuantidade,
                'custo_medio'       => $produto->custo_medio,
                'stock_minimo'      => $produto->estoque_minimo,
                'referencia'        => $referencia,
                'observacao'        => $observacao,
            ]);

            Log::info('[StockService] Movimento registrado', [
                'movimento_id'   => $movimento->id,
                'produto'        => $produto->nome,
                'estoque_novo'   => $novaQuantidade,
                'user_id'        => $finalUserId,
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
     *
     * @param DocumentoFiscal $documento
     * @return void
     */
    public function processarDocumentoFiscal(DocumentoFiscal $documento): void
    {
        Log::info('[StockService] Processando documento fiscal', [
            'documento_id'      => $documento->id,
            'numero'            => $documento->numero_documento,
            'tipo'              => $documento->tipo_documento,
            'estado'            => $documento->estado,
        ]);

        // ✅ Não processar documentos cancelados
        if ($documento->estado === 'cancelado') {
            Log::warning('[StockService] Documento cancelado, ignorando', [
                'documento' => $documento->numero_documento,
            ]);
            return;
        }

        // ✅ Verificar se documento afeta stock
        if (!$documento->afetaStock()) {
            Log::info('[StockService] Documento não afeta stock', [
                'tipo' => $documento->tipo_documento,
            ]);
            return;
        }

        // ✅ Determinar tipo de movimento baseado no tipo de documento
        $tipo          = $documento->tipo_documento === 'NC' ? 'entrada' : 'saida';
        $tipoMovimento = $documento->tipo_documento === 'NC' ? 'nota_credito' : 'venda';

        // ✅ Obter user_id do documento (quem criou/processou)
        $userId = $documento->user_id ?? null;

        foreach ($documento->itens as $item) {
            // ✅ Ignorar itens sem produto ou serviços
            if (!$item->produto_id || $item->produto?->tipo === 'servico') {
                Log::info('[StockService] Item ignorado (serviço ou sem produto)', [
                    'descricao' => $item->descricao,
                ]);
                continue;
            }

            Log::info('[StockService] Processando item', [
                'produto'     => $item->produto?->nome,
                'quantidade'  => $item->quantidade,
                'tipo'        => $tipo,
            ]);

            $this->movimentar(
                $item->produto_id,
                abs((int) $item->quantidade),
                $tipo,
                $tipoMovimento,
                $documento->id,
                "Documento: {$documento->numero_documento} | Item: {$item->descricao}",
                $userId
            );
        }
    }

    /**
     * Reverte stock de documento fiscal cancelado.
     * A lógica é inversa:
     *  - NC (entrada) reverte para saida (venda_cancelada ❌ → nota_credito_cancelada ✅)
     *  - FT/FR (saida) reverte para entrada (venda_cancelada ✅)
     *
     * @param DocumentoFiscal $documento
     * @return void
     */
    public function reverterDocumentoFiscal(DocumentoFiscal $documento): void
    {
        Log::info('[StockService] Revertendo documento fiscal', [
            'documento_id' => $documento->id,
            'numero'       => $documento->numero_documento,
            'tipo'         => $documento->tipo_documento,
        ]);

        // ✅ Não reverter se não afeta stock
        if (!$documento->afetaStock()) {
            Log::info('[StockService] Documento não afeta stock, nada a reverter');
            return;
        }

        // ✅ Tipos correctos para cancelamento
        $tipo = $documento->tipo_documento === 'NC' ? 'saida' : 'entrada';
        $tipoMovimento = $documento->tipo_documento === 'NC'
            ? 'nota_credito_cancelada'
            : 'venda_cancelada';

        $userId = $documento->user_id ?? null;

        foreach ($documento->itens as $item) {
            if (!$item->produto_id || $item->produto?->tipo === 'servico') {
                continue;
            }

            Log::info('[StockService] Revertendo item', [
                'produto'  => $item->produto?->nome,
                'qtd'      => $item->quantidade,
                'tipo_mov' => $tipoMovimento,
            ]);

            $this->movimentar(
                $item->produto_id,
                abs((int) $item->quantidade),
                $tipo,
                $tipoMovimento,
                $documento->id,
                "Reversão por cancelamento: {$documento->numero_documento}",
                $userId
            );
        }
    }

    /* =====================================================================
     | ENTRADA DE COMPRA
     | ================================================================== */

    /**
     * Regista entrada de compra com cálculo de custo médio ponderado.
     * Apenas para produtos físicos — serviços são ignorados.
     *
     * @param string $produtoId
     * @param int $quantidade Quantidade a receber
     * @param float $precoCompra Preço unitário de compra
     * @param string|null $compraId ID da compra/PO associada (referência)
     * @param string|null $userId ID do utilizador que efectua a entrada
     *
     * @return MovimentoStock|null
     * @throws \Exception Se quantidade ou preço inválidos
     */
    public function entradaCompra(
        string $produtoId,
        int $quantidade,
        float $precoCompra,
        ?string $compraId = null,
        ?string $userId = null
    ): ?MovimentoStock {
        return DB::transaction(function () use ($produtoId, $quantidade, $precoCompra, $compraId, $userId) {
            $produto = Produto::lockForUpdate()->findOrFail($produtoId);

            // ✅ Ignorar serviços
            if ($produto->tipo === 'servico') {
                Log::warning('[StockService] Tentativa de entrada em serviço ignorada', [
                    'produto' => $produto->nome,
                ]);
                return null;
            }

            // ✅ Validar quantidade e preço
            if ($quantidade <= 0 || $precoCompra <= 0) {
                throw new \Exception('Quantidade ou preço de compra inválidos.');
            }

            $stockAnterior = $produto->estoque_atual;
            $custoAnterior = $produto->custo_medio ?? 0;

            // ✅ Cálculo do custo médio ponderado
            $novoCustoMedio = (
                ($stockAnterior * $custoAnterior) +
                ($quantidade * $precoCompra)
            ) / max($stockAnterior + $quantidade, 1);

            $produto->custo_medio = round($novoCustoMedio, 2);
            $produto->save();

            Log::info('[StockService] Custo médio actualizado', [
                'produto'          => $produto->nome,
                'custo_anterior'   => $custoAnterior,
                'custo_novo'       => $produto->custo_medio,
                'quantidade'       => $quantidade,
            ]);

            // ✅ Registar movimento
            return $this->movimentar(
                $produtoId,
                $quantidade,
                'entrada',
                'compra',
                $compraId,
                'Entrada de compra com custo médio actualizado',
                $userId
            );
        });
    }

    /* =====================================================================
     | SAÍDA DE VENDA
     | ================================================================== */

    /**
     * Regista saída de stock por venda.
     * Apenas para produtos físicos.
     *
     * @param string $produtoId
     * @param int $quantidade
     * @param string|null $vendaId ID do documento de venda (FT/FR)
     * @param string|null $userId ID do utilizador que efectua a saída
     *
     * @return MovimentoStock|null
     */
    public function saidaVenda(
        string $produtoId,
        int $quantidade,
        ?string $vendaId = null,
        ?string $userId = null
    ): ?MovimentoStock {
        // ✅ Ignorar serviços
        if (Produto::where('id', $produtoId)->where('tipo', 'servico')->exists()) {
            Log::warning('[StockService] Saída em serviço ignorada');
            return null;
        }

        // ✅ Resolver user_id se não fornecido
        $userId = $userId ?? auth()->guard('tenant')->id();

        return $this->movimentar(
            $produtoId,
            $quantidade,
            'saida',
            'venda',
            $vendaId,
            'Venda de produto',
            $userId
        );
    }

    /* =====================================================================
     | AJUSTE MANUAL
     | ================================================================== */

    /**
     * Ajuste manual de stock (inventário, correcção, etc.).
     * Apenas para produtos físicos.
     *
     * @param string $produtoId
     * @param int $quantidade
     * @param string $tipo 'entrada' ou 'saida'
     * @param string|null $referencia Referência do ajuste (OBS: não é ID de documento)
     * @param string|null $observacao Observação adicional
     * @param string|null $userId ID do utilizador que efectua o ajuste
     *
     * @return MovimentoStock|null
     */
    public function ajusteManual(
        string $produtoId,
        int $quantidade,
        string $tipo,
        ?string $referencia = null,
        ?string $observacao = null,
        ?string $userId = null
    ): ?MovimentoStock {
        // ✅ Ignorar serviços
        if (Produto::where('id', $produtoId)->where('tipo', 'servico')->exists()) {
            Log::warning('[StockService] Ajuste em serviço ignorado');
            return null;
        }

        // ✅ Validar tipo
        if (!in_array($tipo, ['entrada', 'saida'])) {
            throw new \InvalidArgumentException("Tipo deve ser 'entrada' ou 'saida'.");
        }

        // ✅ Resolver user_id
        $userId = $userId ?? auth()->guard('tenant')->id();

        return $this->movimentar(
            $produtoId,
            $quantidade,
            $tipo,
            'ajuste',
            $referencia ?? 'AJUSTE-' . Str::random(6),
            $observacao,
            $userId
        );
    }

    /* =====================================================================
     | DISPONIBILIDADE
     | ================================================================== */

    /**
     * Verifica disponibilidade de estoque.
     * Serviços são sempre considerados disponíveis.
     *
     * @param string $produtoId
     * @param int $quantidade
     *
     * @return bool
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

    /* =====================================================================
     | CONSULTAS E RELATÓRIOS
     | ================================================================== */

    /**
     * Histórico de movimentações de um produto.
     *
     * @param string $produtoId
     * @param int $limite
     *
     * @return \Illuminate\Database\Eloquent\Collection
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
     * Produtos com stock em risco (estoque_actual <= estoque_minimo).
     * Apenas produtos físicos — serviços excluídos.
     *
     * @return \Illuminate\Database\Eloquent\Collection
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
     *
     * @return \Illuminate\Support\Collection
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
                    'id'              => $produto->id,
                    'nome'            => $produto->nome,
                    'codigo'          => $produto->codigo,
                    'estoque_atual'   => $produto->estoque_atual,
                    'estoque_minimo'  => $produto->estoque_minimo,
                    'custo_medio'     => $produto->custo_medio,
                    'preco_venda'     => $produto->preco_venda,
                    'valor_total'     => $produto->estoque_atual * $produto->custo_medio,
                    'status'          => $produto->status,
                    'em_risco'        => $produto->estoque_atual <= $produto->estoque_minimo,
                ];
            });
    }

    /**
     * Dashboard de stock.
     *
     * @return array
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
                    'id'              => $p->id,
                    'nome'            => $p->nome,
                    'estoque_atual'   => $p->estoque_atual,
                    'estoque_minimo'  => $p->estoque_minimo,
                ];
            })->toArray(),
            'movimentos_hoje'   => $movimentosHoje,
            'saidas_por_venda'  => $saidasHoje,
        ];
    }
}
