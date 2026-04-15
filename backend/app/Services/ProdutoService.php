<?php

namespace App\Services;

use App\Models\Produto;
use App\Models\Categoria;
use App\Models\MovimentoStock;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ProdutoService
 *
 * Alterações:
 *  - Para PRODUTOS FÍSICOS: taxa_iva e sujeito_iva são puxados da Categoria e salvos no produto.
 *    O IVA é herdado da categoria no momento da criação/atualização.
 *  - Para SERVIÇOS: taxa_iva e sujeito_iva mantêm-se no serviço (sem categoria).
 *  - Método obterTaxaIvaCategoria() adicionado para buscar o IVA da categoria.
 *  - Cálculos fiscais (DocumentoFiscalService, VendaService) devem usar
 *    $produto->taxa_iva_efectiva em vez de $produto->taxa_iva directamente.
 *
 * Taxas de retenção válidas em Angola: 2%, 5%, 6,5%, 10%, 15%
 */
class ProdutoService
{
    public const TAXAS_RETENCAO_VALIDAS = [2.0, 5.0, 6.5, 10.0, 15.0];
    public const TAXA_RETENCAO_DEFAULT  = 6.5;

    protected StockService $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    /* =====================================================================
     | CRIAR PRODUTO / SERVIÇO
     | ================================================================== */

    public function criarProduto(array $dados): Produto
    {
        return DB::transaction(function () use ($dados) {
            $tipo = $dados['tipo'] ?? 'produto';

            Log::info('[ProdutoService] Criando item', [
                'tipo' => $tipo,
                'nome' => $dados['nome'],
            ]);

            $dadosProduto = [
                'id'      => Str::uuid(),
                'user_id' => Auth::id(),
                'nome'    => $dados['nome'],
                'descricao'   => $dados['descricao'] ?? null,
                'preco_venda' => $tipo === 'produto'
                    ? $this->calcularPrecoVenda($dados)
                    : ($dados['preco_venda'] ?? 0),
                'tipo'   => $tipo,
                'status' => $dados['status'] ?? 'ativo',
            ];

            if ($tipo === 'produto') {
                // ✅ Para produtos: puxar IVA da categoria e salvar no produto
                $categoria = Categoria::find($dados['categoria_id'] ?? null);
                
                if (!$categoria) {
                    throw new \Exception('Categoria não encontrada para o produto');
                }

                $taxaIva = (float) $categoria->taxa_iva;
                $sujeitoIva = (bool) $categoria->sujeito_iva;
                $codigoIsencao = $categoria->codigo_isencao;

                $estoqueSolicitado = (int) ($dados['estoque_atual'] ?? 0);
                $precoCompra       = (float) ($dados['preco_compra'] ?? 0);

                $dadosProduto = array_merge($dadosProduto, [
                    'categoria_id'     => $dados['categoria_id'],
                    'fornecedor_id'    => $dados['fornecedor_id'] ?? null,
                    'codigo'           => $dados['codigo'] ?? null,
                    'preco_compra'     => $precoCompra,
                    'custo_medio'      => $precoCompra,
                    'estoque_atual'    => 0, // sempre zero; stock é adicionado via stockService
                    'estoque_minimo'   => $dados['estoque_minimo'] ?? 5,
                    // ✅ IVA: puxado da categoria (não null!)
                    'taxa_iva'         => $taxaIva,
                    'sujeito_iva'      => $sujeitoIva,
                    'codigo_isencao'   => $codigoIsencao,
                    'taxa_retencao'    => null,
                    'duracao_estimada' => null,
                    'unidade_medida'   => null,
                ]);

                Log::info('[ProdutoService] Criando PRODUTO', [
                    'nome'                => $dados['nome'],
                    'estoque_solicitado'  => $estoqueSolicitado,
                    'preco_compra'        => $precoCompra,
                    'taxa_iva_categoria'  => $taxaIva,
                    'sujeito_iva'         => $sujeitoIva,
                ]);

            } else {
                // SERVIÇO: mantém o seu próprio IVA
                $dadosProduto = array_merge($dadosProduto, [
                    'taxa_iva'         => $dados['taxa_iva'] ?? 0,
                    'sujeito_iva'      => $dados['sujeito_iva'] ?? false,
                    'taxa_retencao'    => $dados['taxa_retencao'] ?? null,
                    'codigo_isencao'   => $dados['codigo_isencao'] ?? null,
                    'duracao_estimada' => $dados['duracao_estimada'] ?? null,
                    'unidade_medida'   => $dados['unidade_medida'] ?? null,
                    'categoria_id'     => null,
                    'fornecedor_id'    => null,
                    'codigo'           => null,
                    'preco_compra'     => 0,
                    'custo_medio'      => 0,
                    'estoque_atual'    => 0,
                    'estoque_minimo'   => 0,
                ]);
            }

            $produto = Produto::create($dadosProduto);

            $this->validarPreco($produto, $produto->preco_venda);

            // Registar stock inicial se > 0
            if ($tipo === 'produto' && isset($dados['estoque_atual']) && (int) $dados['estoque_atual'] > 0) {
                $this->stockService->entradaCompra(
                    $produto->id,
                    (int) $dados['estoque_atual'],
                    (float) $dados['preco_compra']
                );
            }

            return $produto;
        });
    }

    /* =====================================================================
     | EDITAR PRODUTO / SERVIÇO
     | ================================================================== */

    public function editarProduto(string $produtoId, array $dados): Produto
    {
        return DB::transaction(function () use ($produtoId, $dados) {
            $produto      = Produto::findOrFail($produtoId);
            $tipoOriginal = $produto->tipo;
            $tipoNovo     = $dados['tipo'] ?? $tipoOriginal;

            Log::info('[ProdutoService] Editando', [
                'id'            => $produtoId,
                'tipo_original' => $tipoOriginal,
                'tipo_novo'     => $tipoNovo,
            ]);

            if ($tipoOriginal === 'produto' && $tipoNovo === 'servico') {
                if ($produto->movimentosStock()->exists()) {
                    throw new \Exception(
                        'Não é possível converter produto com histórico de movimentações para serviço. ' .
                        'Altere o status para "inativo" se deseja descontinuar.'
                    );
                }
            }

            $dadosUpdate = [
                'nome'        => $dados['nome'] ?? $produto->nome,
                'descricao'   => $dados['descricao'] ?? $produto->descricao,
                'preco_venda' => $tipoNovo === 'produto'
                    ? $this->calcularPrecoVenda(array_merge($produto->toArray(), $dados))
                    : ($dados['preco_venda'] ?? $produto->preco_venda),
                'tipo'   => $tipoNovo,
                'status' => $dados['status'] ?? $produto->status,
            ];

            // Registar histórico de preço se alterado
            if ($produto->preco_venda != $dadosUpdate['preco_venda']) {
                DB::table('historico_precos')->insert([
                    'id'          => Str::uuid(),
                    'produto_id'  => $produto->id,
                    'preco_antigo' => $produto->preco_venda,
                    'preco_novo'   => $dadosUpdate['preco_venda'],
                    'user_id'     => Auth::id(),
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }

            if ($tipoNovo === 'servico') {
                // Serviço: mantém o seu próprio IVA
                $taxaIva    = $dados['taxa_iva'] ?? $produto->taxa_iva ?? 0;
                $sujeitoIva = $dados['sujeito_iva'] ?? $produto->sujeito_iva ?? false;

                $taxaRetencao = isset($dados['taxa_retencao'])
                    ? (float) $dados['taxa_retencao']
                    : (float) ($produto->taxa_retencao ?? self::TAXA_RETENCAO_DEFAULT);

                $taxaRetencao = $this->validarTaxaRetencao($taxaRetencao, $produto->nome);

                $dadosUpdate = array_merge($dadosUpdate, [
                    'taxa_iva'         => $taxaIva,
                    'sujeito_iva'      => $sujeitoIva,
                    'taxa_retencao'    => $taxaRetencao,
                    'codigo_isencao'   => $dados['codigo_isencao'] ?? $produto->codigo_isencao ?? null,
                    'duracao_estimada' => $dados['duracao_estimada'] ?? $produto->duracao_estimada ?? '1 hora',
                    'unidade_medida'   => $dados['unidade_medida'] ?? $produto->unidade_medida ?? 'hora',
                    // Limpar campos de produto
                    'categoria_id'     => null,
                    'fornecedor_id'    => null,
                    'codigo'           => null,
                    'preco_compra'     => 0,
                    'custo_medio'      => 0,
                    'estoque_atual'    => 0,
                    'estoque_minimo'   => 0,
                ]);

            } elseif ($tipoNovo === 'produto') {
                // Produto físico: puxar IVA da categoria
                $novaCategoriaId = $dados['categoria_id'] ?? $produto->categoria_id;
                
                $categoria = Categoria::find($novaCategoriaId);
                if (!$categoria) {
                    throw new \Exception('Categoria não encontrada para o produto');
                }

                // Se mudou de categoria, atualizar IVA
                if (isset($dados['categoria_id']) && $dados['categoria_id'] !== $produto->categoria_id) {
                    Log::info('[ProdutoService] Categoria alterada - atualizando IVA', [
                        'produto'          => $produto->nome,
                        'categoria_antiga' => $produto->categoria_id,
                        'categoria_nova'   => $novaCategoriaId,
                        'taxa_iva_nova'    => $categoria->taxa_iva,
                    ]);
                }

                $dadosUpdate = array_merge($dadosUpdate, [
                    'categoria_id'     => $novaCategoriaId,
                    'fornecedor_id'    => $dados['fornecedor_id'] ?? $produto->fornecedor_id,
                    'codigo'           => $dados['codigo'] ?? $produto->codigo,
                    'preco_compra'     => $dados['preco_compra'] ?? $produto->preco_compra,
                    'estoque_minimo'   => $dados['estoque_minimo'] ?? $produto->estoque_minimo,
                    // ✅ IVA: sempre da categoria atual (não null!)
                    'taxa_iva'         => (float) $categoria->taxa_iva,
                    'sujeito_iva'      => (bool) $categoria->sujeito_iva,
                    'codigo_isencao'   => $categoria->codigo_isencao,
                    // Limpar campos de serviço
                    'taxa_retencao'    => null,
                    'duracao_estimada' => null,
                    'unidade_medida'   => null,
                ]);

                // Actualizar stock se informado
                if (isset($dados['estoque_atual']) && $dados['estoque_atual'] != $produto->estoque_atual) {
                    $diferenca = (int) $dados['estoque_atual'] - (int) $produto->estoque_atual;

                    if ($diferenca > 0) {
                        $this->stockService->entradaCompra(
                            $produto->id,
                            $diferenca,
                            (float) $produto->preco_compra
                        );
                    } elseif ($diferenca < 0) {
                        $this->stockService->saidaVenda(
                            $produto->id,
                            abs($diferenca)
                        );
                    }

                    $dadosUpdate['estoque_atual'] = $dados['estoque_atual'];
                }
            }

            $produto->update($dadosUpdate);

            Log::info('[ProdutoService] Editado com sucesso', [
                'id'         => $produtoId,
                'tipo_final' => $produto->tipo,
            ]);

            return $produto->fresh();
        });
    }

    /* =====================================================================
     | OUTRAS OPERAÇÕES
     | ================================================================== */

    public function alterarStatus(string $produtoId, string $status): Produto
    {
        $produto = Produto::findOrFail($produtoId);
        $produto->status = $status;
        $produto->save();

        return $produto;
    }

    public function listarProdutos(array $filtros = [])
    {
        $query = Produto::with('categoria'); // eager load para taxa_iva_efectiva

        if (isset($filtros['tipo'])) {
            $query->where('tipo', $filtros['tipo']);
        }

        $query->where('status', $filtros['status'] ?? 'ativo');

        if (isset($filtros['categoria_id'])) {
            $query->where('categoria_id', $filtros['categoria_id']);
        }

        if (isset($filtros['busca'])) {
            $busca = $filtros['busca'];
            $query->where(fn ($q) => $q
                ->where('nome', 'like', "%{$busca}%")
                ->orWhere('codigo', 'like', "%{$busca}%")
            );
        }

        if (isset($filtros['com_deletados']) && $filtros['com_deletados']) {
            $query->withTrashed();
        }

        return $query->get()->map(function ($produto) {
            $arr = $produto->toArray();
            // Adicionar taxa_iva_efectiva na listagem
            $arr['taxa_iva_efectiva'] = $produto->taxa_iva_efectiva;
            return $arr;
        });
    }

    public function buscarProduto(string $produtoId): Produto
    {
        $produto = Produto::with(['categoria', 'fornecedor'])->findOrFail($produtoId);

        if ($produto->tipo === 'produto') {
            $produto->margem_lucro = $this->calcularMargem($produto);
        } else {
            $produto->margem_lucro = null;
        }

        // ✅ Usar taxa_iva_efectiva (para produtos: da categoria; para serviços: própria)
        $produto->valor_iva = $produto->preco_venda * ($produto->taxa_iva_efectiva / 100);

        if ($produto->tipo === 'servico' && $produto->taxa_retencao > 0) {
            $produto->valor_retencao = $produto->preco_venda * ($produto->taxa_retencao / 100);
            $produto->valor_liquido  = $produto->preco_venda - $produto->valor_retencao;
        }

        return $produto;
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS
     | ================================================================== */

    /**
     * Obtém a taxa de IVA da categoria associada ao produto.
     * Retorna 0.0 se a categoria não existir ou não tiver IVA configurado.
     */
    private function obterTaxaIvaCategoria(?string $categoriaId): float
    {
        if (! $categoriaId) {
            Log::warning('[ProdutoService] Produto sem categoria — taxa IVA será 0%');
            return 0.0;
        }

        $categoria = Categoria::withTrashed()->find($categoriaId);

        if (! $categoria) {
            Log::warning('[ProdutoService] Categoria não encontrada', ['categoria_id' => $categoriaId]);
            return 0.0;
        }

        return (float) $categoria->taxa_iva;
    }

    private function calcularPrecoVenda(array $dados): float
    {
        $precoCompra = (float) ($dados['preco_compra'] ?? 0);
        $despesas    = (float) ($dados['despesas_adicionais'] ?? 0);
        $tipoPreco   = $dados['tipo_preco'] ?? 'fixo';

        $base = $precoCompra + $despesas;

        if ($tipoPreco === 'margem') {
            $margem = (float) ($dados['margem_lucro'] ?? 0);
            if ($margem <= 0 || $margem >= 100) {
                throw new \Exception('Margem inválida — deve ser entre 0% e 99,99%');
            }
            return $base / (1 - ($margem / 100));
        }

        if ($tipoPreco === 'markup') {
            $markup = (float) ($dados['markup'] ?? 0);
            return $base + ($base * $markup / 100);
        }

        // FIXO
        return (float) ($dados['preco_venda'] ?? 0);
    }

    private function calcularMargem(Produto $produto): float
    {
        if ((float) $produto->preco_compra === 0.0) {
            return 0.0;
        }
        return (($produto->preco_venda - $produto->preco_compra) / $produto->preco_venda) * 100;
    }

    private function validarPreco(Produto $produto, float $preco): void
    {
        if (isset($produto->preco_controlado) && $produto->preco_controlado
            && isset($produto->preco_maximo) && $produto->preco_maximo
            && $preco > $produto->preco_maximo) {
            throw new \Exception('Preço acima do permitido');
        }

        if (isset($produto->preco_minimo) && $produto->preco_minimo && $preco < $produto->preco_minimo) {
            throw new \Exception('Preço abaixo do mínimo');
        }
    }

    private function validarTaxaRetencao(float $taxa, string $nomeProduto): float
    {
        if (in_array($taxa, self::TAXAS_RETENCAO_VALIDAS, true)) {
            return $taxa;
        }

        Log::warning('[ProdutoService] Taxa de retenção fora das taxas legais — usando 6,5%', [
            'taxa_informada' => $taxa,
            'produto'        => $nomeProduto,
            'taxas_validas'  => self::TAXAS_RETENCAO_VALIDAS,
        ]);

        return self::TAXA_RETENCAO_DEFAULT;
    }
}