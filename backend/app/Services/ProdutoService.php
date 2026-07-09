<?php

namespace App\Services;

use App\Models\Shared\Produto as SharedProduto;
use App\Models\Shared\Categoria as SharedCategoria;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Tenant\Categoria as TenantCategoria;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ProdutoService
 *
 * ✅ SUPORTA AMBOS OS MODOS:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 */
class ProdutoService
{
    public const TAXAS_RETENCAO_VALIDAS = [2.0, 5.0, 6.5, 10.0, 15.0];
    public const TAXA_RETENCAO_DEFAULT  = 6.5;

    protected StockService $stockService;
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
        
        // ✅ Obtém empresa e modo da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[ProdutoService] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
    }

    /* =====================================================================
     | HELPERS: Resolver Models conforme o modo
     | ================================================================== */

    protected function isColectivo(): bool
    {
        return $this->modo === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->modo === 'singular';
    }

    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
    }

    protected function categoriaModel()
    {
        return $this->isColectivo() ? new SharedCategoria() : new TenantCategoria();
    }

    protected function buscarCategoria(string $categoriaId): ?object
    {
        if ($this->isColectivo()) {
            return SharedCategoria::doTenant()->where('id', $categoriaId)->first();
        }
        return TenantCategoria::where('id', $categoriaId)->first();
    }

    protected function buscarProdutoModel(string $produtoId): ?object
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->where('id', $produtoId)->first();
        }
        return TenantProduto::where('id', $produtoId)->first();
    }

    protected function buscarProdutoOrFail(string $produtoId): object
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->where('id', $produtoId)->firstOrFail();
        }
        return TenantProduto::where('id', $produtoId)->firstOrFail();
    }

    protected function queryProdutos()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    protected function queryCategorias()
    {
        if ($this->isColectivo()) {
            return SharedCategoria::doTenant();
        }
        return TenantCategoria::query();
    }

    protected function adicionarTenantId(array $dados): array
    {
        if ($this->isColectivo() && $this->empresa) {
            $dados['tenant_id'] = $this->empresa->id;
        }
        return $dados;
    }

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO - CORRIGIDA ✅
     | ================================================================== */

    /**
     * Verifica se o usuário tem acesso ao tenant atual
     */
    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[ProdutoService] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[ProdutoService] Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        // ✅ Atualiza o modo
        $this->modo = $this->empresa->modo ?? 'colectivo';

        // 2️⃣ Obtém o landlord user (guard onde o login foi feito)
        $landlordUser = Auth::guard('landlord')->user();

        // 3️⃣ Fallback: tenta obter da sessão
        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = LandlordUser::find($landlordId);
            }
        }

        if (!$landlordUser) {
            Log::error('[ProdutoService] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[ProdutoService] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[ProdutoService] Acesso verificado com sucesso', [
            'modo' => $this->modo,
            'user_id' => $tenantUser->id,
            'email' => $tenantUser->email,
        ]);
    }

    /**
     * Busca usuário no banco correto
     */
    protected function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        }
        return SharedUser::on('shared')
            ->where('email', $email)
            ->where('tenant_id', $empresa->id)
            ->first();
    }

    /**
     * Obtém o user_id do tenantUser
     */
    protected function getUserId(array $dados = []): ?string
    {
        if (isset($dados['user_id']) && $dados['user_id']) {
            return $dados['user_id'];
        }

        if ($this->tenantUser) {
            return $this->tenantUser->id;
        }

        // Fallback
        try {
            $landlordUser = Auth::guard('landlord')->user();
            if ($landlordUser && $this->empresa) {
                $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
                if ($tenantUser) {
                    return $tenantUser->id;
                }
            }
        } catch (\Exception $e) {
            Log::warning('[ProdutoService] Fallback getUserId falhou', [
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /* =====================================================================
     | LISTAR PRODUTOS - CORRIGIDO ✅
     | ================================================================== */

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
        // ✅ Verifica acesso
        $this->verificarAcessoUsuario();

        Log::info('[ProdutoService::listarProdutos] Listando', [
            'modo' => $this->modo,
            'filtros' => $filtros,
        ]);

        $query = $this->queryProdutos()->with('categoria');

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

        $resultados = $query->get()->map(function ($produto) {
            $arr = $produto->toArray();
            $arr['taxa_iva_efectiva'] = $produto->taxa_iva_efectiva ?? $produto->taxa_iva ?? 0;
            return $arr;
        });

        Log::info('[ProdutoService::listarProdutos] Concluído', [
            'total' => $resultados->count(),
            'modo' => $this->modo,
        ]);

        return $resultados;
    }

    /* =====================================================================
     | CRIAR PRODUTO / SERVIÇO
     | ================================================================== */

    public function criarProduto(array $dados): object
    {
        $this->verificarAcessoUsuario();

        return DB::transaction(function () use ($dados) {
            $tipo = $dados['tipo'] ?? 'produto';
            $userId = $this->getUserId($dados);

            Log::info('[ProdutoService] Criando item', [
                'tipo'  => $tipo,
                'nome'  => $dados['nome'] ?? 'Sem nome',
                'modo'  => $this->modo,
            ]);

            $precoVenda = $tipo === 'produto'
                ? $this->calcularPrecoVenda($dados)
                : ($dados['preco_venda'] ?? 0);

            $dadosProduto = [
                'id'          => Str::uuid(),
                'user_id'     => $userId,
                'nome'        => $dados['nome'],
                'descricao'   => $dados['descricao'] ?? null,
                'preco_venda' => $precoVenda,
                'tipo'        => $tipo,
                'status'      => $dados['status'] ?? 'ativo',
            ];

            if ($tipo === 'produto') {
                $categoria = $this->buscarCategoria($dados['categoria_id'] ?? null);
                if (!$categoria) {
                    throw new \Exception('Categoria não encontrada para o produto');
                }

                // ✅ NOVO: normaliza e persiste a estratégia de preço realmente usada
                $tipoPreco = $dados['tipo_preco'] ?? 'fixo';

                $dadosProduto = array_merge($dadosProduto, [
                    'categoria_id'        => $dados['categoria_id'],
                    'fornecedor_id'       => $dados['fornecedor_id'] ?? null,
                    'codigo'              => $dados['codigo'] ?? null,
                    'preco_compra'        => (float) ($dados['preco_compra'] ?? 0),
                    'custo_medio'         => (float) ($dados['preco_compra'] ?? 0),
                    'estoque_atual'       => 0,
                    'estoque_minimo'      => $dados['estoque_minimo'] ?? 5,
                    'taxa_iva'            => (float) $categoria->taxa_iva,
                    'sujeito_iva'         => (bool) $categoria->sujeito_iva,
                    'codigo_isencao'      => $categoria->codigo_isencao ?? null,
                    'taxa_retencao'       => null,
                    'duracao_estimada'    => null,
                    'unidade_medida'      => null,
                    // ⬇ NOVO: sem isto, o default da coluna ('margem') sobrevivia sempre
                    'tipo_preco'          => $tipoPreco,
                    'despesas_adicionais' => (float) ($dados['despesas_adicionais'] ?? 0),
                    'margem_lucro'        => $tipoPreco === 'margem' ? (float) ($dados['margem_lucro'] ?? null) : null,
                    'markup'              => $tipoPreco === 'markup' ? (float) ($dados['markup'] ?? null) : null,
                ]);
            } else {
                $dadosProduto = array_merge($dadosProduto, [
                    'taxa_iva'         => $dados['taxa_iva'] ?? 0,
                    'sujeito_iva'      => $dados['sujeito_iva'] ?? false,
                    'taxa_retencao'    => $this->validarTaxaRetencao($dados['taxa_retencao'] ?? null, $dados['nome']),
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
                    // Serviços não usam estratégia de margem/markup
                    'tipo_preco'          => 'fixo',
                    'despesas_adicionais' => 0,
                    'margem_lucro'        => null,
                    'markup'              => null,
                ]);
            }

            // ⭐ ADICIONAR TENANT_ID (apenas para colectivo)
            $dadosProduto = $this->adicionarTenantId($dadosProduto);

            // ⭐ USAR O MODEL CORRETO
            $produto = $this->produtoModel()->create($dadosProduto);

            // ✅ Entrada de stock inicial
            if ($tipo === 'produto' && isset($dados['estoque_atual']) && (int) $dados['estoque_atual'] > 0) {
                $this->stockService->entradaCompra(
                    $produto->id,
                    (int) $dados['estoque_atual'],
                    (float) ($dados['preco_compra'] ?? 0),
                    null,
                    $userId
                );
            }

            return $produto;
        });
    }

    /* =====================================================================
     | EDITAR PRODUTO / SERVIÇO
     | ================================================================== */

    public function editarProduto(string $produtoId, array $dados): object
    {
        $this->verificarAcessoUsuario();

        return DB::transaction(function () use ($produtoId, $dados) {
            $produto = $this->buscarProdutoOrFail($produtoId);
            $tipoOriginal = $produto->tipo;
            $tipoNovo = $dados['tipo'] ?? $tipoOriginal;
            $userId = $this->getUserId($dados);

            Log::info('[ProdutoService] Editando', [
                'id' => $produtoId,
                'tipo_original' => $tipoOriginal,
                'tipo_novo' => $tipoNovo,
                'modo' => $this->modo,
            ]);

            // ✅ Não permitir converter produto com stock para serviço
            if ($tipoOriginal === 'produto' && $tipoNovo === 'servico') {
                if ($produto->movimentosStock()->exists()) {
                    throw new \Exception(
                        'Não é possível converter produto com histórico de movimentações para serviço.'
                    );
                }
            }

            // ✅ NOVO: resolve tipo_preco explicitamente antes de calcular
            // Se o payload não trouxer tipo_preco, assume 'fixo' em vez de
            // herdar o que já estava gravado (evita reviver 'margem' obsoleto
            // vindo de produtos criados antes desta correção, ou de modais
            // como o ModalEdicao que só editam preço fixo diretamente).
            $tipoPrecoResolvido = $dados['tipo_preco'] ?? 'fixo';

            if ($tipoNovo === 'produto') {
                $dadosParaCalculo = array_merge($produto->toArray(), $dados);
                $dadosParaCalculo['tipo_preco'] = $tipoPrecoResolvido;
                $precoVenda = $this->calcularPrecoVenda($dadosParaCalculo);
            } else {
                $precoVenda = $dados['preco_venda'] ?? $produto->preco_venda;
            }

            $dadosUpdate = [
                'nome' => $dados['nome'] ?? $produto->nome,
                'descricao' => $dados['descricao'] ?? $produto->descricao,
                'preco_venda' => $precoVenda,
                'tipo' => $tipoNovo,
                'status' => $dados['status'] ?? $produto->status,
            ];

            if ($tipoNovo === 'servico') {
                $dadosUpdate = array_merge($dadosUpdate, [
                    'taxa_iva' => $dados['taxa_iva'] ?? $produto->taxa_iva ?? 0,
                    'sujeito_iva' => $dados['sujeito_iva'] ?? $produto->sujeito_iva ?? false,
                    'taxa_retencao' => $this->validarTaxaRetencao(
                        $dados['taxa_retencao'] ?? $produto->taxa_retencao ?? self::TAXA_RETENCAO_DEFAULT,
                        $produto->nome
                    ),
                    'codigo_isencao' => $dados['codigo_isencao'] ?? $produto->codigo_isencao ?? null,
                    'duracao_estimada' => $dados['duracao_estimada'] ?? $produto->duracao_estimada ?? '1 hora',
                    'unidade_medida' => $dados['unidade_medida'] ?? $produto->unidade_medida ?? 'hora',
                    'categoria_id' => null,
                    'fornecedor_id' => null,
                    'codigo' => null,
                    'preco_compra' => 0,
                    'custo_medio' => 0,
                    'estoque_atual' => 0,
                    'estoque_minimo' => 0,
                    // Serviços não usam estratégia de margem/markup
                    'tipo_preco' => 'fixo',
                    'margem_lucro' => null,
                    'markup' => null,
                ]);
            } elseif ($tipoNovo === 'produto') {
                $novaCategoriaId = $dados['categoria_id'] ?? $produto->categoria_id;
                $categoria = $this->buscarCategoria($novaCategoriaId);
                if (!$categoria) {
                    throw new \Exception('Categoria não encontrada para o produto');
                }

                $dadosUpdate = array_merge($dadosUpdate, [
                    'categoria_id' => $novaCategoriaId,
                    'fornecedor_id' => $dados['fornecedor_id'] ?? $produto->fornecedor_id,
                    'codigo' => $dados['codigo'] ?? $produto->codigo,
                    'preco_compra' => $dados['preco_compra'] ?? $produto->preco_compra,
                    'estoque_minimo' => $dados['estoque_minimo'] ?? $produto->estoque_minimo,
                    'taxa_iva' => (float) $categoria->taxa_iva,
                    'sujeito_iva' => (bool) $categoria->sujeito_iva,
                    'codigo_isencao' => $categoria->codigo_isencao ?? null,
                    'taxa_retencao' => null,
                    'duracao_estimada' => null,
                    'unidade_medida' => null,
                    // ⬇ NOVO: grava a estratégia resolvida, corrigindo produtos antigos automaticamente
                    'tipo_preco' => $tipoPrecoResolvido,
                    'despesas_adicionais' => $dados['despesas_adicionais'] ?? $produto->despesas_adicionais ?? 0,
                    'margem_lucro' => $tipoPrecoResolvido === 'margem' ? (float) ($dados['margem_lucro'] ?? $produto->margem_lucro ?? null) : null,
                    'markup' => $tipoPrecoResolvido === 'markup' ? (float) ($dados['markup'] ?? $produto->markup ?? null) : null,
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
            return $produto->fresh();
        });
    }

    /* =====================================================================
     | OUTRAS OPERAÇÕES
     | ================================================================== */

    public function alterarStatus(string $produtoId, string $status): object
    {
        $this->verificarAcessoUsuario();
        $produto = $this->buscarProdutoOrFail($produtoId);
        $produto->status = $status;
        $produto->save();

        Log::info('[ProdutoService] Status alterado', [
            'produto_id' => $produtoId,
            'status' => $status,
        ]);

        return $produto;
    }

    public function buscarProduto(string $produtoId): object
    {
        $this->verificarAcessoUsuario();

        if ($this->isColectivo()) {
            $produto = SharedProduto::doTenant()
                ->with(['categoria', 'fornecedor'])
                ->where('id', $produtoId)
                ->firstOrFail();
        } else {
            $produto = TenantProduto::with(['categoria', 'fornecedor'])
                ->where('id', $produtoId)
                ->firstOrFail();
        }

        if ($produto->tipo === 'produto') {
            $produto->margem_lucro = $this->calcularMargem($produto);
        }

        return $produto;
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS
     | ================================================================== */

    private function calcularPrecoVenda(array $dados): float
    {
        $precoCompra = (float) ($dados['preco_compra'] ?? 0);
        $tipoPreco = $dados['tipo_preco'] ?? 'fixo';

        if ($tipoPreco === 'fixo') {
            return (float) ($dados['preco_venda'] ?? 0);
        }

        if ($tipoPreco === 'margem') {
            $margem = (float) ($dados['margem_lucro'] ?? 0);
            if ($margem <= 0 || $margem >= 100) {
                throw new \Exception('Margem inválida — deve ser entre 0% e 99,99%');
            }
            if ($precoCompra <= 0) {
                return (float) ($dados['preco_venda'] ?? 0);
            }
            return $precoCompra / (1 - ($margem / 100));
        }

        return (float) ($dados['preco_venda'] ?? 0);
    }

    private function calcularMargem(object $produto): float
    {
        if ((float) $produto->preco_compra === 0.0) {
            return 0.0;
        }
        return (($produto->preco_venda - $produto->preco_compra) / $produto->preco_venda) * 100;
    }

    private function validarTaxaRetencao(?float $taxa, string $nomeProduto): float
    {
        if ($taxa === null) {
            return self::TAXA_RETENCAO_DEFAULT;
        }

        if (in_array($taxa, self::TAXAS_RETENCAO_VALIDAS, true)) {
            return $taxa;
        }

        Log::warning('[ProdutoService] Taxa de retenção fora das taxas legais — usando 6,5%', [
            'taxa_informada' => $taxa,
            'produto' => $nomeProduto,
        ]);

        return self::TAXA_RETENCAO_DEFAULT;
    }
}