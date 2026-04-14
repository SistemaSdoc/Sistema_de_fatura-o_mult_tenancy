<?php

namespace App\Services;

use App\Models\Produto;
use App\Models\MovimentoStock;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ProdutoService
 *
 * Gestão de produtos e serviços.
 *
 * Correcções AGT:
 *  - Classe StockService removida deste ficheiro (estava duplicada)
 *  - Taxa de retenção configurável por serviço (não hardcoded a 6,5%)
 *  - Taxas de retenção válidas em Angola: 2%, 5%, 6,5%, 10%, 15%
 *  - Campo codigo_isencao adicionado para serviços isentos de IVA
 *  - Compatível com os campos taxa_retencao e codigo_isencao do SAF-T (AO)
 *
 * ATENÇÃO: StockService deve ser injectado via IoC — não instanciado directamente.
 */
class ProdutoService
{
    /**
     * Taxas de retenção válidas em Angola (IRPS / IRPC sobre serviços).
     *
     *  2%   — serviços de construção civil (Art. 67.º IRPC)
     *  5%   — rendimentos de trabalho independente (prestações pontuais)
     *  6,5% — serviços técnicos e de gestão (taxa geral — Art. 67.º IRPC)
     * 10%   — royalties e direitos de autor
     * 15%   — dividendos e juros (entidades não residentes)
     */
    public const TAXAS_RETENCAO_VALIDAS = [2.0, 5.0, 6.5, 10.0, 15.0];

    /** Taxa de retenção default para serviços gerais */
    public const TAXA_RETENCAO_DEFAULT = 6.5;

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
     * Para serviços, os campos taxa_retencao e codigo_isencao são usados
     * pelo DocumentoFiscalService no cálculo de IVA e retenção na fonte,
     * e exportados no SAF-T (AO).
     */
public function criarProduto(array $dados): Produto
{
    return DB::transaction(function () use ($dados) {
        $tipo = $dados['tipo'] ?? 'produto';

        Log::info('[ProdutoService] Criando item', [
            'tipo' => $tipo,
            'nome' => $dados['nome'],
            'estoque_atual_recebido' => $dados['estoque_atual'] ?? 0,
        ]);

        $dadosProduto = [
            'id'          => Str::uuid(),
            'user_id'     => Auth::id(),
            'nome'        => $dados['nome'],
            'descricao'   => $dados['descricao'] ?? null,
            'preco_venda' => $tipo === 'produto'
    ? $this->calcularPrecoVenda($dados)
    : ($dados['preco_venda'] ?? 0),
            'taxa_iva'    => $dados['taxa_iva'], // O IVA pode variar por produto/serviço
            'sujeito_iva' => $dados['sujeito_iva'] ?? true,
            'tipo'        => $tipo,
            'status'      => $dados['status'] ?? 'ativo',
        ];

        if ($tipo === 'produto') {
            // ✅ IMPORTANTE: Guardar o estoque solicitado para usar depois
            $estoqueSolicitado = (int) ($dados['estoque_atual'] ?? 0);
            $precoCompra = (float) ($dados['preco_compra'] ?? 0);
            
            $dadosProduto = array_merge($dadosProduto, [
                'categoria_id'     => $dados['categoria_id'] ?? null,
                'fornecedor_id'    => $dados['fornecedor_id'] ?? null,
                'codigo'           => $dados['codigo'] ?? null,
                'preco_compra'     => $precoCompra,
                'custo_medio'      => $precoCompra, // Custo médio inicial = preço de compra
                'estoque_atual'    => 0, // ✅ SEMPRE ZERO para evitar duplicação
                'estoque_minimo'   => $dados['estoque_minimo'] ?? 5,
                'taxa_retencao'    => null,
                'codigo_isencao'   => null,
                'duracao_estimada' => null,
                'unidade_medida'   => null,
            ]);

            Log::info('[ProdutoService] Criando PRODUTO', [
                'nome' => $dados['nome'],
                'estoque_solicitado' => $estoqueSolicitado,
                'preco_compra' => $precoCompra,
                'estoque_inicial_produto' => 0, // Produto criado com estoque zero
            ]);

        } else {
            $dadosProduto = array_merge($dadosProduto, [
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
        // ✅ Só registrar a compra se tiver estoque solicitado > 0
        if ($tipo === 'produto' && isset($dados['estoque_atual']) && (int) $dados['estoque_atual'] > 0) {
            Log::info('[ProdutoService] Registrando compra inicial', [
                'produto_id' => $produto->id,
                'quantidade' => (int) $dados['estoque_atual'],
                'preco_compra' => (float) $dados['preco_compra'],
            ]);

            // Isso vai adicionar o estoque corretamente (0 + quantidade)
            $this->stockService->entradaCompra(
                $produto->id,
                (int) $dados['estoque_atual'],
                (float) $dados['preco_compra']
            );
        }

        return $produto;
    });
}

private function validarPreco(Produto $produto, float $preco): void
{
    if ($produto->preco_controlado && $produto->preco_maximo && $preco > $produto->preco_maximo) {
        throw new \Exception("Preço acima do permitido");
    }

    if ($produto->preco_minimo && $preco < $produto->preco_minimo) {
        throw new \Exception("Preço abaixo do mínimo");
    }
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
                'id'           => $produtoId,
                'tipo_original' => $tipoOriginal,
                'tipo_novo'    => $tipoNovo,
            ]);

            // Impedir conversão de produto com movimentações para serviço
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
                'taxa_iva'    => $dados['taxa_iva'] ?? $produto->taxa_iva,
                'sujeito_iva' => $dados['sujeito_iva'] ?? $produto->sujeito_iva,
                'tipo'        => $tipoNovo,
                'status'      => $dados['status'] ?? $produto->status,
            ];

            if ($produto->preco_venda != $dadosUpdate['preco_venda']) {
    DB::table('historico_precos')->insert([
        'id' => Str::uuid(),
        'produto_id' => $produto->id,
        'preco_antigo' => $produto->preco_venda,
        'preco_novo' => $dadosUpdate['preco_venda'],
        'user_id' => Auth::id(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}
            if ($tipoNovo === 'servico') {
                // Taxa de retenção: configurável por serviço
                $taxaRetencao = isset($dados['taxa_retencao'])
                    ? (float) $dados['taxa_retencao']
                    : (float) ($produto->taxa_retencao ?? self::TAXA_RETENCAO_DEFAULT);

                $taxaRetencao = $this->validarTaxaRetencao($taxaRetencao, $produto->nome);

                // Código de isenção
                $codigoIsencao = $dados['codigo_isencao'] ?? $produto->codigo_isencao ?? null;

                $dadosUpdate = array_merge($dadosUpdate, [
                    'taxa_retencao'    => $taxaRetencao,
                    'codigo_isencao'   => $codigoIsencao,
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
                $dadosUpdate = array_merge($dadosUpdate, [
                    'categoria_id'     => $dados['categoria_id'] ?? $produto->categoria_id,
                    'fornecedor_id'    => $dados['fornecedor_id'] ?? $produto->fornecedor_id,
                    'codigo'           => $dados['codigo'] ?? $produto->codigo,
                    'preco_compra'     => $dados['preco_compra'] ?? $produto->preco_compra,
                    'estoque_minimo'   => $dados['estoque_minimo'] ?? $produto->estoque_minimo,
                    // Limpar campos de serviço
                    'taxa_retencao'    => null,
                    'codigo_isencao'   => null,
                    'duracao_estimada' => null,
                    'unidade_medida'   => null,
                ]);

                // Actualizar estoque se informado
                if (isset($dados['estoque_atual']) && $dados['estoque_atual'] != $produto->estoque_atual) {
                    $diferenca = (int) $dados['estoque_atual'] - (int) $produto->estoque_atual;

                    if ($diferenca > 0) {
                        Log::info('[ProdutoService] Aumentando estoque', [
                            'produto'   => $produto->nome,
                            'diferenca' => $diferenca,
                        ]);
                        $this->stockService->entradaCompra(
                            $produto->id,
                            $diferenca,
                            (float) $produto->preco_compra
                        );
                    } elseif ($diferenca < 0) {
                        Log::info('[ProdutoService] Reduzindo estoque', [
                            'produto'   => $produto->nome,
                            'diferenca' => abs($diferenca),
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

            Log::info('[ProdutoService] Editado com sucesso', [
                'id'        => $produtoId,
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

        Log::info('[ProdutoService] Alterando status', [
            'id'          => $produtoId,
            'tipo'        => $produto->tipo,
            'status_novo' => $status,
        ]);

        $produto->status = $status;
        $produto->save();

        return $produto;
    }

    public function listarProdutos(array $filtros = [])
    {
        $query = Produto::query();

        if (isset($filtros['tipo'])) {
            $query->where('tipo', $filtros['tipo']);
        }

        if (isset($filtros['status'])) {
            $query->where('status', $filtros['status']);
        } else {
            $query->where('status', 'ativo');
        }

        if (isset($filtros['categoria_id'])) {
            $query->where('categoria_id', $filtros['categoria_id']);
        }

        if (isset($filtros['busca'])) {
            $busca = $filtros['busca'];
            $query->where(function ($q) use ($busca) {
                $q->where('nome', 'like', "%{$busca}%")
                  ->orWhere('codigo', 'like', "%{$busca}%");
            });
        }

        if (isset($filtros['com_deletados']) && $filtros['com_deletados']) {
            $query->withTrashed();
        }

        return $query->get();
    }

    public function buscarProduto(string $produtoId): Produto
    {
        $produto = Produto::with(['categoria', 'fornecedor'])->findOrFail($produtoId);

        if ($produto->tipo === 'produto') {
            $produto->margem_lucro = $this->calcularMargem($produto);
        } else {
            $produto->margem_lucro = null;
        }

        $produto->valor_iva = $produto->preco_venda * ($produto->taxa_iva / 100);

        if ($produto->tipo === 'servico' && $produto->taxa_retencao > 0) {
            $produto->valor_retencao = $produto->preco_venda * ($produto->taxa_retencao / 100);
            $produto->valor_liquido  = $produto->preco_venda - $produto->valor_retencao;
        }

        return $produto;
    }

    private function calcularPrecoVenda(array $dados): float
{
    $precoCompra = (float) ($dados['preco_compra'] ?? 0);
    $despesas    = (float) ($dados['despesas_adicionais'] ?? 0);
    $tipoPreco   = $dados['tipo_preco'] ?? 'margem';

    $base = $precoCompra + $despesas;

    if ($tipoPreco === 'margem') {
        $margem = (float) ($dados['margem_lucro'] ?? 0);

        if ($margem <= 0 || $margem >= 100) {
            throw new \Exception("Margem inválida");
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
    /* =====================================================================
     | MÉTODOS PRIVADOS
     | ================================================================== */

    private function calcularMargem(Produto $produto): float
    {
        if ((float) $produto->preco_compra === 0.0) {
            return 0.0;
        }

        return  (($produto->preco_venda - $produto->preco_compra) / $produto->preco_venda) * 100;
    }

    /**
     * Valida e retorna a taxa de retenção.
     * Se a taxa não for uma das taxas legais angolanas, usa o default 6,5%
     * e regista um aviso no log.
     */
    private function validarTaxaRetencao(float $taxa, string $nomeProduto): float
    {
        if (in_array($taxa, self::TAXAS_RETENCAO_VALIDAS, true)) {
            return $taxa;
        }

        Log::warning('[ProdutoService] Taxa de retenção fora das taxas legais angolanas — usando 6,5%', [
            'taxa_informada'   => $taxa,
            'produto'          => $nomeProduto,
            'taxas_validas'    => self::TAXAS_RETENCAO_VALIDAS,
        ]);

        return self::TAXA_RETENCAO_DEFAULT;
    }
}
