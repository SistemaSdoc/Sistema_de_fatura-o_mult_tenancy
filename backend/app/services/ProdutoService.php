<?php

namespace App\Services;

use App\Models\Produto;
use App\Models\MovimentoStock;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProdutoService
{
    protected $stockService;

    public function __construct()
    {
        $this->stockService = app(StockService::class);
    }

    /**
     * Criar um novo produto ou serviço
     */
    public function criarProduto(array $dados)
    {
        DB::beginTransaction();

        try {
            // Determinar se é produto ou serviço
            $tipo = $dados['tipo'] ?? 'produto';

            Log::info('[ProdutoService] Criando item', [
                'tipo' => $tipo,
                'nome' => $dados['nome']
            ]);

            // ✅ Preparar dados base
            $dadosProduto = [
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'nome' => $dados['nome'],
                'descricao' => $dados['descricao'] ?? null,
                'preco_venda' => $dados['preco_venda'],
                'taxa_iva' => $dados['taxa_iva'] ?? 14,
                'sujeito_iva' => $dados['sujeito_iva'] ?? true,
                'tipo' => $tipo,
                'status' => $dados['status'] ?? 'ativo',
            ];

            // ✅ Campos específicos para PRODUTO
            if ($tipo === 'produto') {
                $dadosProduto = array_merge($dadosProduto, [
                    'categoria_id' => $dados['categoria_id'] ?? null,
                    'fornecedor_id' => $dados['fornecedor_id'] ?? null,
                    'codigo' => $dados['codigo'] ?? null,
                    'preco_compra' => $dados['preco_compra'] ?? 0,
                    'custo_medio' => $dados['custo_medio'] ?? ($dados['preco_compra'] ?? 0),
                    'estoque_atual' => $dados['estoque_atual'] ?? 0,
                    'estoque_minimo' => $dados['estoque_minimo'] ?? 5,

                    // ✅ Limpar campos de serviço
                    'retencao' => null,
                    'duracao_estimada' => null,
                    'unidade_medida' => null,
                ]);

                Log::info('[ProdutoService] Criando PRODUTO físico', [
                    'estoque_inicial' => $dadosProduto['estoque_atual'],
                    'custo_medio' => $dadosProduto['custo_medio']
                ]);
            }
            // ✅ Campos específicos para SERVIÇO
            else {
                $dadosProduto = array_merge($dadosProduto, [
                    'retencao' => $dados['retencao'] ?? 6.5, // Padrão Angola
                    'duracao_estimada' => $dados['duracao_estimada'] ?? '1 hora',
                    'unidade_medida' => $dados['unidade_medida'] ?? 'hora',

                    // ✅ Limpar campos de produto
                    'categoria_id' => null,
                    'fornecedor_id' => null,
                    'codigo' => null,
                    'preco_compra' => 0,
                    'custo_medio' => 0,
                    'estoque_atual' => 0,
                    'estoque_minimo' => 0,
                ]);

                Log::info('[ProdutoService] Criando SERVIÇO', [
                    'retencao' => $dadosProduto['retencao'],
                    'unidade_medida' => $dadosProduto['unidade_medida']
                ]);
            }

            $produto = Produto::create($dadosProduto);

            // ✅ Apenas produtos têm movimentação de stock
            if ($tipo === 'produto' && ($dados['estoque_atual'] ?? 0) > 0) {
                Log::info('[ProdutoService] Registrando estoque inicial', [
                    'produto' => $produto->nome,
                    'quantidade' => $dados['estoque_atual']
                ]);

                $this->stockService->entradaCompra(
                    $produto->id,
                    $produto->estoque_atual,
                    $produto->custo_medio
                );
            }

            DB::commit();

            return $produto;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[ProdutoService] Erro ao criar', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Editar um produto ou serviço existente
     */
    public function editarProduto(string $produtoId, array $dados)
    {
        DB::beginTransaction();

        try {
            $produto = Produto::findOrFail($produtoId);
            $tipoOriginal = $produto->tipo;
            $tipoNovo = $dados['tipo'] ?? $tipoOriginal;

            Log::info('[ProdutoService] Editando', [
                'id' => $produtoId,
                'tipo_original' => $tipoOriginal,
                'tipo_novo' => $tipoNovo
            ]);

            // ✅ IMPEDIR conversão de produto com movimentações para serviço
            if ($tipoOriginal === 'produto' && $tipoNovo === 'servico') {
                if ($produto->movimentosStock()->exists()) {
                    throw new \Exception(
                        'Não é possível converter produto com histórico de movimentações para serviço. ' .
                        'Altere o status para "inativo" se deseja descontinuar.'
                    );
                }
            }

            // ✅ Preparar dados para atualização
            $dadosUpdate = [
                'nome' => $dados['nome'] ?? $produto->nome,
                'descricao' => $dados['descricao'] ?? $produto->descricao,
                'preco_venda' => $dados['preco_venda'] ?? $produto->preco_venda,
                'taxa_iva' => $dados['taxa_iva'] ?? $produto->taxa_iva,
                'sujeito_iva' => $dados['sujeito_iva'] ?? $produto->sujeito_iva,
                'tipo' => $tipoNovo,
                'status' => $dados['status'] ?? $produto->status,
            ];

            // ✅ Se está mudando para SERVIÇO
            if ($tipoNovo === 'servico') {
                $dadosUpdate = array_merge($dadosUpdate, [
                    'retencao' => $dados['retencao'] ?? $produto->retencao ?? 6.5,
                    'duracao_estimada' => $dados['duracao_estimada'] ?? $produto->duracao_estimada ?? '1 hora',
                    'unidade_medida' => $dados['unidade_medida'] ?? $produto->unidade_medida ?? 'hora',

                    // ✅ Limpar campos de produto
                    'categoria_id' => null,
                    'fornecedor_id' => null,
                    'codigo' => null,
                    'preco_compra' => 0,
                    'custo_medio' => 0,
                    'estoque_atual' => 0,
                    'estoque_minimo' => 0,
                ]);
            }
            // ✅ Se continua sendo PRODUTO
            elseif ($tipoNovo === 'produto') {
                $dadosUpdate = array_merge($dadosUpdate, [
                    'categoria_id' => $dados['categoria_id'] ?? $produto->categoria_id,
                    'fornecedor_id' => $dados['fornecedor_id'] ?? $produto->fornecedor_id,
                    'codigo' => $dados['codigo'] ?? $produto->codigo,
                    'preco_compra' => $dados['preco_compra'] ?? $produto->preco_compra,
                    'estoque_minimo' => $dados['estoque_minimo'] ?? $produto->estoque_minimo,

                    // ✅ Limpar campos de serviço
                    'retencao' => null,
                    'duracao_estimada' => null,
                    'unidade_medida' => null,
                ]);

                // ✅ Atualizar estoque se informado (apenas para produtos)
                if (isset($dados['estoque_atual']) && $dados['estoque_atual'] != $produto->estoque_atual) {
                    $diferenca = $dados['estoque_atual'] - $produto->estoque_atual;

                    if ($diferenca > 0) {
                        Log::info('[ProdutoService] Aumentando estoque', [
                            'produto' => $produto->nome,
                            'diferenca' => $diferenca
                        ]);
                        $this->stockService->entradaCompra(
                            $produto->id,
                            $diferenca,
                            (float) $produto->preco_compra
                        );
                    } elseif ($diferenca < 0) {
                        Log::info('[ProdutoService] Reduzindo estoque', [
                            'produto' => $produto->nome,
                            'diferenca' => abs($diferenca)
                        ]);
                        $this->stockService->saidaVenda(
                            $produto->id,
                            abs($diferenca)
                        );
                    }

                    $dadosUpdate['estoque_atual'] = $dados['estoque_atual'];
                }
            }

            $produto->update($dadosUpdate);

            DB::commit();

            Log::info('[ProdutoService] Editado com sucesso', [
                'id' => $produtoId,
                'tipo_final' => $produto->tipo
            ]);

            return $produto->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[ProdutoService] Erro ao editar', [
                'id' => $produtoId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Ativar/Inativar produto ou serviço
     */
    public function alterarStatus(string $produtoId, string $status)
    {
        $produto = Produto::findOrFail($produtoId);

        Log::info('[ProdutoService] Alterando status', [
            'id' => $produtoId,
            'tipo' => $produto->tipo,
            'status_antigo' => $produto->status,
            'status_novo' => $status
        ]);

        $produto->status = $status;
        $produto->save();

        return $produto;
    }

    /**
     * Listar produtos ou serviços com filtros
     */
    public function listarProdutos(array $filtros = [])
    {
        $query = Produto::query();

        // ✅ Filtrar por tipo
        if (isset($filtros['tipo'])) {
            if ($filtros['tipo'] === 'produto') {
                $query->where('tipo', 'produto');
            } elseif ($filtros['tipo'] === 'servico') {
                $query->where('tipo', 'servico');
            }
        }

        // ✅ Filtrar por status
        if (isset($filtros['status'])) {
            $query->where('status', $filtros['status']);
        } else {
            $query->where('status', 'ativo');
        }

        // ✅ Filtrar por categoria (apenas produtos)
        if (isset($filtros['categoria_id'])) {
            $query->where('categoria_id', $filtros['categoria_id']);
        }

        // ✅ Busca por nome/código
        if (isset($filtros['busca'])) {
            $busca = $filtros['busca'];
            $query->where(function ($q) use ($busca) {
                $q->where('nome', 'like', "%{$busca}%")
                  ->orWhere('codigo', 'like', "%{$busca}%");
            });
        }

        // ✅ Incluir deletados?
        if (isset($filtros['com_deletados']) && $filtros['com_deletados']) {
            $query->withTrashed();
        }

        return $query->get();
    }

    /**
     * Buscar produto com dados calculados
     */
    public function buscarProduto(string $produtoId)
    {
        $produto = Produto::with(['categoria', 'fornecedor'])->findOrFail($produtoId);

        // ✅ Calcular margem (só para produtos)
        if ($produto->isProduto()) {
            $produto->margem_lucro = $this->calcularMargem($produto);
        } else {
            $produto->margem_lucro = null;
        }

        // ✅ Calcular valor do IVA
        $produto->valor_iva = $produto->preco_venda * ($produto->taxa_iva / 100);

        // ✅ Valor após retenção (para serviços)
        if ($produto->isServico() && $produto->retencao > 0) {
            $produto->valor_retencao = $produto->preco_venda * ($produto->retencao / 100);
            $produto->valor_liquido = $produto->preco_venda - $produto->valor_retencao;
        }

        return $produto;
    }

    /**
     * Calcular margem de lucro
     */
    private function calcularMargem(Produto $produto)
    {
        if ($produto->preco_compra == 0) return 0;
        return (($produto->preco_venda - $produto->preco_compra) / $produto->preco_compra) * 100;
    }
}

class StockService
{
    /**
     * Movimentação genérica (entrada ou saída)
     */
    public function movimentar(
        string $produtoId,
        int $quantidade,
        string $tipo,
        string $tipoMovimento,
        ?string $referencia = null,
        ?float $custoUnitario = null
    ) {
        $produto = Produto::findOrFail($produtoId);

        // ✅ Impedir movimentação de serviços
        if ($produto->isServico()) {
            Log::warning('[StockService] Tentativa de movimentar serviço ignorada', [
                'produto' => $produto->nome,
                'quantidade' => $quantidade
            ]);
            return null;
        }

        Log::info('[StockService] Movimentando', [
            'produto' => $produto->nome,
            'tipo' => $tipo,
            'quantidade' => $quantidade,
            'estoque_atual_antes' => $produto->estoque_atual
        ]);

        if ($tipo === 'entrada') {
            $produto->estoque_atual += $quantidade;
        } else {
            if ($produto->estoque_atual < $quantidade) {
                throw new \Exception(
                    "Stock insuficiente do produto {$produto->nome}. " .
                    "Disponível: {$produto->estoque_atual}, Solicitado: {$quantidade}"
                );
            }
            $produto->estoque_atual -= $quantidade;
        }

        $produto->save();

        $movimento = MovimentoStock::create([
            'id' => Str::uuid(),
            'produto_id' => $produtoId,
            'user_id' => Auth::id(),
            'tipo' => $tipo,
            'tipo_movimento' => $tipoMovimento,
            'quantidade' => $quantidade,
            'referencia' => $referencia,
            'custo_unitario' => $custoUnitario ?? $produto->custo_medio,
            'estoque_anterior' => $produto->estoque_atual - ($tipo === 'entrada' ? $quantidade : -$quantidade),
            'estoque_novo' => $produto->estoque_atual,
        ]);

        Log::info('[StockService] Movimento registrado', [
            'movimento_id' => $movimento->id,
            'estoque_novo' => $produto->estoque_atual
        ]);

        return $movimento;
    }

    /**
     * Entrada de compra com custo médio ponderado
     */
    public function entradaCompra(string $produtoId, int $quantidade, float $preco, ?string $compraId = null)
    {
        $produto = Produto::findOrFail($produtoId);

        // ✅ Impedir entrada em serviços
        if ($produto->isServico()) {
            Log::warning('[StockService] Tentativa de entrada em serviço ignorada', [
                'produto' => $produto->nome
            ]);
            return null;
        }

        $estoqueAntes = $produto->estoque_atual;
        $custoAntes = $produto->custo_medio ?? 0;

        // Calcular novo custo médio ponderado
        $novoEstoque = $estoqueAntes + $quantidade;
        $novoCusto = (($estoqueAntes * $custoAntes) + ($quantidade * $preco)) / max($novoEstoque, 1);

        Log::info('[StockService] Calculando custo médio', [
            'produto' => $produto->nome,
            'estoque_antes' => $estoqueAntes,
            'custo_antes' => $custoAntes,
            'quantidade_comprada' => $quantidade,
            'preco_compra' => $preco,
            'novo_custo' => $novoCusto
        ]);

        $produto->estoque_atual = $novoEstoque;
        $produto->custo_medio = $novoCusto;
        $produto->save();

        return $this->movimentar(
            $produtoId,
            $quantidade,
            'entrada',
            'compra',
            $compraId,
            $preco
        );
    }

    /**
     * Saída de venda (apenas para produtos)
     */
    public function saidaVenda(string $produtoId, int $quantidade, ?string $vendaId = null)
    {
        $produto = Produto::findOrFail($produtoId);

        // ✅ Impedir saída em serviços
        if ($produto->isServico()) {
            Log::warning('[StockService] Tentativa de saída em serviço ignorada', [
                'produto' => $produto->nome
            ]);
            return null;
        }

        return $this->movimentar(
            $produtoId,
            $quantidade,
            'saida',
            'venda',
            $vendaId,
            $produto->custo_medio
        );
    }

    /**
     * Ajuste manual de stock (apenas para produtos)
     */
    public function ajusteManual(string $produtoId, int $quantidade, string $tipo, ?string $referencia = null)
    {
        $produto = Produto::findOrFail($produtoId);

        // ✅ Impedir ajuste em serviços
        if ($produto->isServico()) {
            Log::warning('[StockService] Tentativa de ajuste em serviço ignorada', [
                'produto' => $produto->nome
            ]);
            return null;
        }

        if (!in_array($tipo, ['entrada', 'saida'])) {
            throw new \InvalidArgumentException("Tipo deve ser 'entrada' ou 'saida'");
        }

        Log::info('[StockService] Ajuste manual', [
            'produto' => $produto->nome,
            'tipo' => $tipo,
            'quantidade' => $quantidade
        ]);

        return $this->movimentar(
            $produtoId,
            $quantidade,
            $tipo,
            'ajuste',
            $referencia ?? 'AJUSTE-MANUAL-' . Str::random(6),
            $produto->custo_medio
        );
    }

    /**
     * Verificar disponibilidade de estoque
     */
    public function verificarDisponibilidade(string $produtoId, int $quantidade): bool
    {
        $produto = Produto::findOrFail($produtoId);

        // ✅ Serviços sempre disponíveis
        if ($produto->isServico()) {
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
}
