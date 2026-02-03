<?php

namespace App\Services;

use App\Models\Produto;
use App\Models\MovimentoStock;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ProdutoService
{
    protected $stockService;

    public function __construct()
    {
        $this->stockService = app(StockService::class);
    }

    /**
     * Criar um novo produto
     */
    public function criarProduto(array $dados)
    {
        $produto = Produto::create([
            'id' => Str::uuid(),
            'categoria_id' => $dados['categoria_id'],
            'user_id' => Auth::id(),
            'codigo' => $dados['codigo'] ?? null,
            'nome' => $dados['nome'],
            'descricao' => $dados['descricao'] ?? null,
            'preco_compra' => $dados['preco_compra'],
            'preco_venda' => $dados['preco_venda'],
            'taxa_iva' => $dados['taxa_iva'] ?? 14,
            'sujeito_iva' => $dados['sujeito_iva'] ?? true,
            'estoque_atual' => $dados['estoque_atual'] ?? 0,
            'estoque_minimo' => $dados['estoque_minimo'] ?? 0,
            'custo_medio' => $dados['custo_medio'] ?? $dados['preco_compra'],
            'tipo' => $dados['tipo'] ?? 'produto',
            'status' => $dados['status'] ?? 'ativo',
        ]);

        // se existir stock inicial, registrar movimentação
        if (($dados['estoque_atual'] ?? 0) > 0) {
            $this->stockService->entradaCompra(
                $produto->id,
                $produto->estoque_atual,
                $produto->custo_medio
            );
        }

        return $produto;
    }

    /**
     * Editar um produto existente
     */
    public function editarProduto(string $produtoId, array $dados)
    {
        $produto = Produto::findOrFail($produtoId);

        $produto->update([
            'categoria_id' => $dados['categoria_id'] ?? $produto->categoria_id,
            'codigo' => $dados['codigo'] ?? $produto->codigo,
            'nome' => $dados['nome'] ?? $produto->nome,
            'descricao' => $dados['descricao'] ?? $produto->descricao,
            'preco_compra' => $dados['preco_compra'] ?? $produto->preco_compra,
            'preco_venda' => $dados['preco_venda'] ?? $produto->preco_venda,
            'taxa_iva' => $dados['taxa_iva'] ?? $produto->taxa_iva,
            'sujeito_iva' => $dados['sujeito_iva'] ?? $produto->sujeito_iva,
            'estoque_minimo' => $dados['estoque_minimo'] ?? $produto->estoque_minimo,
            'tipo' => $dados['tipo'] ?? $produto->tipo,
            'status' => $dados['status'] ?? $produto->status,
        ]);

        // Atualizar stock se estoque atual for informado
        if (isset($dados['estoque_atual']) && $dados['estoque_atual'] != $produto->estoque_atual) {
            $diferenca = $dados['estoque_atual'] - $produto->estoque_atual;
            if ($diferenca > 0) {
                $this->stockService->entradaCompra($produto->id, $diferenca, (float) $produto->preco_compra);
            } elseif ($diferenca < 0) {
                $this->stockService->saidaVenda($produto->id, abs($diferenca));
            }
            $produto->estoque_atual = $dados['estoque_atual'];
            $produto->save();
        }

        return $produto;
    }

    /**
     * Ativar/Inativar produto
     */
    public function alterarStatus(string $produtoId, string $status)
    {
        $produto = Produto::findOrFail($produtoId);
        $produto->status = $status;
        $produto->save();
        return $produto;
    }

    /**
     * Listar produtos
     */
    public function listarProdutos(bool $somenteAtivos = true)
    {
        $query = Produto::query();
        if ($somenteAtivos) $query->where('status', 'ativo');
        return $query->get();
    }

    /**
     * Buscar produto com margem e IVA
     */
    public function buscarProduto(string $produtoId)
    {
        $produto = Produto::findOrFail($produtoId);
        $produto->margem_lucro = $this->calcularMargem($produto);
        $produto->valor_iva = $produto->preco_venda * ($produto->taxa_iva / 100);
        return $produto;
    }

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
        ?string $referencia = null
    ) {
        $produto = Produto::findOrFail($produtoId);

        if ($tipo === 'entrada') {
            $produto->estoque_atual += $quantidade;
        } else {
            if ($produto->estoque_atual < $quantidade) {
                throw new \Exception("Stock insuficiente do produto {$produto->nome}");
            }
            $produto->estoque_atual -= $quantidade;
        }

        $produto->save();

        MovimentoStock::create([
            'id' => Str::uuid(),
            'produto_id' => $produtoId,
            'user_id' => Auth::id(),
            'tipo' => $tipo,
            'tipo_movimento' => $tipoMovimento,
            'quantidade' => $quantidade,
            'referencia' => $referencia
        ]);
    }

    /**
     * Entrada de compra com custo médio ponderado
     */
    public function entradaCompra(string $produtoId, int $quantidade, float $preco, ?string $compraId = null)
    {
        $produto = Produto::findOrFail($produtoId);

        $novoStock = $produto->estoque_atual + $quantidade;
        $novoCusto = (($produto->estoque_atual * ($produto->custo_medio ?? 0)) + ($quantidade * $preco)) / max($novoStock, 1);

        $produto->estoque_atual = $novoStock;
        $produto->custo_medio = $novoCusto;
        $produto->save();

        $this->movimentar($produtoId, $quantidade, 'entrada', 'compra', $compraId);
    }

    /**
     * Saída de venda
     */
    public function saidaVenda(string $produtoId, int $quantidade, ?string $vendaId = null)
    {
        $this->movimentar($produtoId, $quantidade, 'saida', 'venda', $vendaId);
    }

    /**
     * Ajuste manual de stock
     */
    public function ajusteManual(string $produtoId, int $quantidade, string $tipo, ?string $referencia = null)
    {
        $this->movimentar($produtoId, $quantidade, $tipo, 'ajuste', $referencia ?? 'AJUSTE-MANUAL');
    }
}
