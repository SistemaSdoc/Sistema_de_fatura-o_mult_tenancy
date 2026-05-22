<?php

namespace App\Services;

use App\Models\Tenant\Produto;
use App\Models\Tenant\Categoria;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ProdutoService
 *
 * Gestão completa de produtos e serviços com suporte a:
 *  - Produtos físicos (com stock, categoria, IVA herdado da categoria)
 *  - Serviços (sem stock, com taxa de IVA e retenção próprias)
 *
 * Alterações-chave:
 *  - Para PRODUTOS FÍSICOS: taxa_iva e sujeito_iva são puxados da Categoria e salvos no produto.
 *    O IVA é herdado da categoria no momento da criação/atualização.
 *  - Para SERVIÇOS: taxa_iva e sujeito_iva mantêm-se no serviço (sem categoria).
 *  - Método obterTaxaIvaCategoria() adicionado para buscar o IVA da categoria.
 *  - Cálculos fiscais (DocumentoFiscalService, VendaService) devem usar
 *    $produto->taxa_iva_efectiva em vez de $produto->taxa_iva directamente.
 *  - user_id é sempre resolvido usando auth()->guard('tenant')->id() como fallback primário.
 *  - Todos os métodos públicos que afectam stock passam user_id correcto ao StockService.
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

    /**
     * Cria um novo produto ou serviço.
     *
     * Dados esperados para PRODUTO:
     *  - nome, tipo='produto'
     *  - categoria_id (obrigatório)
     *  - preco_compra, preco_venda (ou calcular via margem/markup)
     *  - estoque_atual, estoque_minimo
     *  - fornecedor_id, codigo (opcionais)
     *
     * Dados esperados para SERVIÇO:
     *  - nome, tipo='servico'
     *  - preco_venda (obrigatório)
     *  - taxa_iva, sujeito_iva, taxa_retencao (opcionais)
     *  - duracao_estimada, unidade_medida (opcionais)
     *
     * @param array $dados
     * @return Produto
     * @throws \Exception Se categoria não encontrada para produto
     */
    public function criarProduto(array $dados): Produto
    {
        return DB::transaction(function () use ($dados) {
            $tipo = $dados['tipo'] ?? 'produto';

            Log::info('[ProdutoService] Criando item', [
                'tipo'  => $tipo,
                'nome'  => $dados['nome'],
            ]);

            // ✅ Calcular preço de venda ANTES de usar
            $precoVenda = $tipo === 'produto'
                ? $this->calcularPrecoVenda($dados)
                : ($dados['preco_venda'] ?? 0);

            $dadosProduto = [
                'id'          => Str::uuid(),
                'user_id'     => $dados['user_id'] ?? auth()->guard('tenant')->id(),
                'nome'        => $dados['nome'],
                'descricao'   => $dados['descricao'] ?? null,
                'preco_venda' => $precoVenda,
                'tipo'        => $tipo,
                'status'      => $dados['status'] ?? 'ativo',
            ];

            if ($tipo === 'produto') {
                // ✅ PRODUTO: IVA vem da categoria
                $categoria = Categoria::find($dados['categoria_id'] ?? null);
                if (!$categoria) {
                    throw new \Exception('Categoria não encontrada para o produto');
                }

                $taxaIva      = (float) $categoria->taxa_iva;
                $sujeitoIva   = (bool) $categoria->sujeito_iva;
                $codigoIsencao = $categoria->codigo_isencao;

                $estoqueSolicitado = (int) ($dados['estoque_atual'] ?? 0);
                $precoCompra       = (float) ($dados['preco_compra'] ?? 0);

                $dadosProduto = array_merge($dadosProduto, [
                    'categoria_id'     => $dados['categoria_id'],
                    'fornecedor_id'    => $dados['fornecedor_id'] ?? null,
                    'codigo'           => $dados['codigo'] ?? null,
                    'preco_compra'     => $precoCompra,
                    'custo_medio'      => $precoCompra,
                    'estoque_atual'    => 0,
                    'estoque_minimo'   => $dados['estoque_minimo'] ?? 5,
                    'taxa_iva'         => $taxaIva,
                    'sujeito_iva'      => $sujeitoIva,
                    'codigo_isencao'   => $codigoIsencao,
                    'taxa_retencao'    => null,
                    'duracao_estimada' => null,
                    'unidade_medida'   => null,
                ]);

                Log::info('[ProdutoService] Criando PRODUTO', [
                    'nome'               => $dados['nome'],
                    'estoque_solicitado' => $estoqueSolicitado,
                    'preco_compra'       => $precoCompra,
                    'taxa_iva_categoria' => $taxaIva,
                    'sujeito_iva'        => $sujeitoIva,
                ]);
            } else {
                // ✅ SERVIÇO: IVA é próprio (sem categoria)
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

            // ✅ CORREÇÃO: passar user_id correcto ao StockService
            if ($tipo === 'produto' && isset($dados['estoque_atual']) && (int) $dados['estoque_atual'] > 0) {
                $this->stockService->entradaCompra(
                    $produto->id,
                    (int) $dados['estoque_atual'],
                    (float) $dados['preco_compra'],
                    null,  // sem compraId
                    $dados['user_id'] ?? auth()->guard('tenant')->id()
                );
            }

            return $produto;
        });
    }

    /* =====================================================================
     | EDITAR PRODUTO / SERVIÇO
     | ================================================================== */

    /**
     * Edita um produto ou serviço existente.
     * Permite conversão entre tipo, com validações apropriadas.
     *
     * @param string $produtoId
     * @param array $dados
     * @return Produto
     * @throws \Exception Se conversão inválida ou categoria não encontrada
     */
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

            // ✅ Não permitir converter produto com stock para serviço
            if ($tipoOriginal === 'produto' && $tipoNovo === 'servico') {
                if ($produto->movimentosStock()->exists()) {
                    throw new \Exception(
                        'Não é possível converter produto com histórico de movimentações para serviço. ' .
                        'Altere o status para "inativo" se deseja descontinuar.'
                    );
                }
            }

            // ✅ Calcular preço de venda ANTES de usar
            $precoVenda = $tipoNovo === 'produto'
                ? $this->calcularPrecoVenda(array_merge($produto->toArray(), $dados))
                : ($dados['preco_venda'] ?? $produto->preco_venda);

            $dadosUpdate = [
                'nome'        => $dados['nome'] ?? $produto->nome,
                'descricao'   => $dados['descricao'] ?? $produto->descricao,
                'preco_venda' => $precoVenda,
                'tipo'        => $tipoNovo,
                'status'      => $dados['status'] ?? $produto->status,
            ];

            // ✅ Registar histórico de preços
            if ($produto->preco_venda != $dadosUpdate['preco_venda']) {
                DB::table('historico_precos')->insert([
                    'id'             => Str::uuid(),
                    'produto_id'     => $produto->id,
                    'preco_antigo'   => $produto->preco_venda,
                    'preco_novo'     => $dadosUpdate['preco_venda'],
                    'user_id'        => $dados['user_id'] ?? auth()->guard('tenant')->id(),
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            $userId = $dados['user_id'] ?? auth()->guard('tenant')->id();

            if ($tipoNovo === 'servico') {
                // ✅ Conversão para SERVIÇO
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
                    'categoria_id'     => null,
                    'fornecedor_id'    => null,
                    'codigo'           => null,
                    'preco_compra'     => 0,
                    'custo_medio'      => 0,
                    'estoque_atual'    => 0,
                    'estoque_minimo'   => 0,
                ]);
            } elseif ($tipoNovo === 'produto') {
                // ✅ Conversão para PRODUTO (ou permanece produto)
                $novaCategoriaId = $dados['categoria_id'] ?? $produto->categoria_id;
                $categoria = Categoria::find($novaCategoriaId);
                if (!$categoria) {
                    throw new \Exception('Categoria não encontrada para o produto');
                }

                $dadosUpdate = array_merge($dadosUpdate, [
                    'categoria_id'     => $novaCategoriaId,
                    'fornecedor_id'    => $dados['fornecedor_id'] ?? $produto->fornecedor_id,
                    'codigo'           => $dados['codigo'] ?? $produto->codigo,
                    'preco_compra'     => $dados['preco_compra'] ?? $produto->preco_compra,
                    'estoque_minimo'   => $dados['estoque_minimo'] ?? $produto->estoque_minimo,
                    'taxa_iva'         => (float) $categoria->taxa_iva,
                    'sujeito_iva'      => (bool) $categoria->sujeito_iva,
                    'codigo_isencao'   => $categoria->codigo_isencao,
                    'taxa_retencao'    => null,
                    'duracao_estimada' => null,
                    'unidade_medida'   => null,
                ]);

                // ✅ Ajustar stock se alterado
                if (isset($dados['estoque_atual']) && $dados['estoque_atual'] != $produto->estoque_atual) {
                    $diferenca = (int) $dados['estoque_atual'] - (int) $produto->estoque_atual;

                    if ($diferenca > 0) {
                        $this->stockService->entradaCompra(
                            $produto->id,
                            $diferenca,
                            (float) ($dados['preco_compra'] ?? $produto->preco_compra),
                            null,
                            $userId
                        );
                    } elseif ($diferenca < 0) {
                        $this->stockService->saidaVenda(
                            $produto->id,
                            abs($diferenca),
                            null,
                            $userId
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

    /**
     * Altera o status de um produto (ativo/inativo/descontinuado).
     *
     * @param string $produtoId
     * @param string $status
     * @return Produto
     */
    public function alterarStatus(string $produtoId, string $status): Produto
    {
        $produto = Produto::findOrFail($produtoId);
        $produto->status = $status;
        $produto->save();

        return $produto;
    }

    /**
     * Lista produtos com filtros opcionais.
     *
     * Filtros suportados:
     *  - tipo: 'produto' ou 'servico'
     *  - status: 'ativo' (default), 'inativo', etc.
     *  - categoria_id: ID da categoria
     *  - busca: busca por nome ou código
     *  - com_deletados: incluir soft-deleted
     *
     * @param array $filtros
     * @return \Illuminate\Support\Collection
     */
    public function listarProdutos(array $filtros = [])
    {
        $query = Produto::with('categoria');

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
            $arr['taxa_iva_efectiva'] = $produto->taxa_iva_efectiva;
            return $arr;
        });
    }

    /**
     * Busca um produto por ID com relações carregadas.
     * Calcula margem de lucro e valores de IVA/retenção.
     *
     * @param string $produtoId
     * @return Produto
     */
    public function buscarProduto(string $produtoId): Produto
    {
        $produto = Produto::with(['categoria', 'fornecedor'])->findOrFail($produtoId);

        // ✅ Margem de lucro (apenas para produtos físicos)
        if ($produto->tipo === 'produto') {
            $produto->margem_lucro = $this->calcularMargem($produto);
        } else {
            $produto->margem_lucro = null;
        }

        // ✅ Usar taxa_iva_efectiva (para produtos: da categoria; para serviços: própria)
        $produto->valor_iva = $produto->preco_venda * ($produto->taxa_iva_efectiva / 100);

        // ✅ Valor de retenção (apenas para serviços)
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
     *
     * @param string|null $categoriaId
     * @return float
     */
    private function obterTaxaIvaCategoria(?string $categoriaId): float
    {
        if (!$categoriaId) {
            Log::warning('[ProdutoService] Produto sem categoria — taxa IVA será 0%');
            return 0.0;
        }

        $categoria = Categoria::withTrashed()->find($categoriaId);

        if (!$categoria) {
            Log::warning('[ProdutoService] Categoria não encontrada', ['categoria_id' => $categoriaId]);
            return 0.0;
        }

        return (float) $categoria->taxa_iva;
    }

    /**
     * Calcula o preço de venda baseado na estratégia escolhida.
     *
     * Estratégias:
     *  - 'fixo': preco_venda fornecido directamente
     *  - 'margem': calcula preço para margem de lucro desejada
     *  - 'markup': calcula preço com markup sobre custo
     *
     * @param array $dados
     * @return float
     * @throws \Exception Se margem inválida
     */
    private function calcularPrecoVenda(array $dados): float
    {
        $precoCompra = (float) ($dados['preco_compra'] ?? 0);
        $despesas    = (float) ($dados['despesas_adicionais'] ?? 0);
        $tipoPreco   = $dados['tipo_preco'] ?? 'fixo';

        $base = $precoCompra + $despesas;

        // ✅ Se não tem tipo_preco definido ou é fixo, retorna o preco_venda informado
        if ($tipoPreco === 'fixo') {
            return (float) ($dados['preco_venda'] ?? 0);
        }

        if ($tipoPreco === 'margem') {
            // ✅ Verificar se margem_lucro existe
            if (!isset($dados['margem_lucro']) && !isset($dados['margem_lucro'])) {
                Log::warning('[ProdutoService] Margem não informada para cálculo', [
                    'tipo_preco' => $tipoPreco,
                    'dados' => array_keys($dados)
                ]);
                return (float) ($dados['preco_venda'] ?? 0);
            }

            $margem = (float) ($dados['margem_lucro'] ?? 0);

            // ✅ Validação da margem
            if ($margem <= 0 || $margem >= 100) {
                throw new \Exception('Margem inválida — deve ser entre 0% e 99,99%');
            }

            if ($base <= 0) {
                Log::warning('[ProdutoService] Base de cálculo zero para margem', [
                    'preco_compra' => $precoCompra,
                    'despesas' => $despesas
                ]);
                return (float) ($dados['preco_venda'] ?? 0);
            }

            return $base / (1 - ($margem / 100));
        }

        if ($tipoPreco === 'markup') {
            $markup = (float) ($dados['markup'] ?? 0);
            return $base + ($base * $markup / 100);
        }

        // FIXO (fallback)
        return (float) ($dados['preco_venda'] ?? 0);
    }

    /**
     * Calcula a margem de lucro (%).
     * Margem = ((Preço Venda - Preço Compra) / Preço Venda) × 100
     *
     * @param Produto $produto
     * @return float
     */
    private function calcularMargem(Produto $produto): float
    {
        if ((float) $produto->preco_compra === 0.0) {
            return 0.0;
        }
        return (($produto->preco_venda - $produto->preco_compra) / $produto->preco_venda) * 100;
    }

    /**
     * Valida se o preço está dentro dos limites configurados.
     *
     * @param Produto $produto
     * @param float $preco
     * @throws \Exception Se preço excede limites
     */
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

    /**
     * Valida taxa de retenção contra taxas legais em Angola.
     * Se inválida, registra warning e retorna 6.5% (default).
     *
     * Taxas válidas: 2%, 5%, 6.5%, 10%, 15%
     *
     * @param float $taxa
     * @param string $nomeProduto
     * @return float
     */
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
