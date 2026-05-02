<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\Tenant\Produto;
use App\Models\Tenant\Categoria;
use App\Models\Tenant\Fornecedor;
use App\Services\ProdutoService;
use Carbon\Carbon;
use Throwable;

/**
 * ProdutoController
 *
 * Alterações:
 *  - Para PRODUTOS FÍSICOS: taxa_iva e sujeito_iva removidos da validação.
 *    O IVA é herdado automaticamente da Categoria.
 *  - Para SERVIÇOS: taxa_iva e sujeito_iva mantêm-se (serviços não têm categoria).
 *  - show() retorna agora taxa_iva_efectiva calculada (para produtos, vem da categoria).
 *
 * Taxas de retenção válidas (Angola): 2%, 5%, 6,5%, 10%, 15%
 */
class ProdutoController extends Controller
{
    public function __construct(protected ProdutoService $produtoService) {}

    /* =====================================================================
     | LISTAGEM
     | ================================================================== */

    public function index(Request $request)
    {


     DB::connection('tenant')->getPdo();
        Log::info('[ProdutoController] user tenant check', [
    'user' => auth()->guard('tenant')->user(),
    'role' => auth()->guard('tenant')->user()?->role,
]);

    Log::info('[ProdutoController] Verificação de autenticação', [
        'tenant_check' => Auth::guard('tenant')->check(),
        'landlord_check' => Auth::guard('landlord')->check(),
        'tenant_user_id' => Auth::guard('tenant')->id(),
        'landlord_user_id' => Auth::guard('landlord')->id(),
        'session_id' => session()->getId(),
        'session_tenant_id' => session('tenant_id'),
    ]);

        $user = Auth::guard('tenant')->user();
    
    // 🔍 LOG 2: Dados do utilizador do tenant (se existir)
    Log::info('[ProdutoController] Utilizador autenticado (tenant)', [
        'user_id' => $user?->id ?? 'null',
        'user_email' => $user?->email ?? 'null',
        'user_role' => $user?->role ?? 'indefinido',
        'user_nome' => $user?->nome ?? $user?->name ?? 'null',
        'tenant_db' => config('database.connections.tenant.database'),
    ]);
    

        $filtros  = $this->extrairFiltros($request);
        $produtos = $this->produtoService->listarProdutos($filtros);

        return response()->json([
            'message'  => 'Lista de produtos carregada com sucesso',
            'produtos' => $produtos,
        ]);
    }

    public function indexWithTrashed(Request $request)
    {
      

        $filtros  = array_merge($this->extrairFiltros($request), ['com_deletados' => true]);
        $produtos = $this->produtoService->listarProdutos($filtros);

        return response()->json([
            'message'          => 'Lista completa de produtos',
            'produtos'         => $produtos,
            'total'            => $produtos->count(),
            'ativos'           => $produtos->whereNull('deleted_at')->count(),
            'deletados'        => $produtos->whereNotNull('deleted_at')->count(),
            'produtos_fisicos' => $produtos->where('tipo', 'produto')->count(),
            'servicos'         => $produtos->where('tipo', 'servico')->count(),
        ]);
    }

    public function indexOnlyTrashed(Request $request)
    {

        $query = Produto::onlyTrashed();

        if ($request->filled('busca')) {
            $busca = $request->busca;
            $query->where(fn ($q) => $q->where('nome', 'like', "%{$busca}%")->orWhere('codigo', 'like', "%{$busca}%"));
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->filled('data_inicio')) {
            $query->whereDate('deleted_at', '>=', Carbon::parse($request->data_inicio));
        }
        if ($request->filled('data_fim')) {
            $query->whereDate('deleted_at', '<=', Carbon::parse($request->data_fim));
        }

        $produtos = $request->boolean('paginar')
            ? $query->paginate($request->get('per_page', 15))
            : $query->get();

        return response()->json([
            'message'         => 'Produtos na lixeira',
            'produtos'        => $produtos,
            'total_deletados' => $produtos instanceof \Illuminate\Pagination\LengthAwarePaginator
                ? $produtos->total()
                : $produtos->count(),
        ]);
    }

    /* =====================================================================
     | DETALHE
     | ================================================================== */

    public function show(string $id)
    {
        $produto = Produto::withTrashed()
            ->with(['categoria', 'fornecedor', 'movimentosStock' => fn ($q) => $q->limit(10)])
            ->findOrFail($id);

       

        // Adicionar informação de IVA efectivo na resposta
        $produtoArray = $produto->toArray();
        $produtoArray['taxa_iva_efectiva']   = $produto->taxa_iva_efectiva;
        $produtoArray['sujeito_iva_efetivo'] = $produto->sujeito_iva_efetivo;
        $produtoArray['codigo_isencao_efetivo'] = $produto->codigo_isencao_efetivo;
        $produtoArray['valor_iva']           = $produto->valor_iva;

        // Para produtos, mostrar de onde vem o IVA
        if ($produto->tipo === 'produto' && $produto->categoria) {
            $produtoArray['iva_origem'] = 'categoria';
            $produtoArray['iva_categoria'] = [
                'id'             => $produto->categoria->id,
                'nome'           => $produto->categoria->nome,
                'taxa_iva'       => $produto->categoria->taxa_iva,
                'sujeito_iva'    => $produto->categoria->sujeito_iva,
                'codigo_isencao' => $produto->categoria->codigo_isencao,
            ];
        } else {
            $produtoArray['iva_origem'] = 'servico';
        }

        return response()->json([
            'message' => 'Produto carregado com sucesso',
            'produto' => $produtoArray,
        ]);
    }

    /* =====================================================================
     | CRIAR
     | ================================================================== */

    public function store(Request $request)
    {

        Log::info('[ProdutoController] Dados recebidos para validação:', $request->all());

        try {
            $dados = $request->validate($this->regrasValidacao($request->tipo ?? 'produto'));
            $dados['user_id'] = Auth::guard('tenant')->id();
            Log::info('[ProdutoController] Dados validados com sucesso:', $dados);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('[ProdutoController] ERRO DE VALIDAÇÃO:', [
                'errors' => $e->errors(),
                'data'   => $request->all(),
            ]);
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $e->errors(),
            ], 422);
        }

        try {
            $dados['user_id'] = Auth::guard('tenant')->id();
            $produto = $this->produtoService->criarProduto($dados);

            // Carregar categoria para retornar IVA efectivo na resposta
            $produto->load('categoria');

            $resposta = $produto->fresh(['categoria', 'fornecedor'])->toArray();
            $resposta['taxa_iva_efectiva'] = $produto->taxa_iva_efectiva;

            return response()->json([
                'message' => $dados['tipo'] === 'servico' ? 'Serviço criado com sucesso' : 'Produto criado com sucesso',
                'produto' => $resposta,
            ], 201);

        } catch (\Exception $e) {
            Log::error('[PRODUTO STORE ERROR]', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Erro ao criar produto', 'error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | ACTUALIZAR
     | ================================================================== */

    public function update(Request $request, string $id)
    {
        Log::info('[ProdutoController] UPDATE - Dados recebidos:', [
            'id'           => $id,
            'all_data'     => $request->all(),
            'method'       => $request->method(),
            'content_type' => $request->header('Content-Type'),
        ]);

        try {
            $produto = Produto::findOrFail($id);

            $tipo = $request->input('tipo', $produto->tipo);
            if (! in_array($tipo, ['produto', 'servico'])) {
                $tipo = $produto->tipo;
            }

            $regras = $this->regrasValidacaoUpdate($tipo, $id);

            try {
                $dados = $request->validate($regras);
            } catch (\Illuminate\Validation\ValidationException $e) {
                Log::error('[ProdutoController] UPDATE - Erro de validação:', [
                    'errors'       => $e->errors(),
                    'data'         => $request->all(),
                    'regras_usadas' => $regras,
                ]);
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors'  => $e->errors(),
                ], 422);
            }

            $produto = $this->produtoService->editarProduto($id, $dados);
            $produto->load('categoria');

            $resposta = $produto->toArray();
            $resposta['taxa_iva_efectiva'] = $produto->taxa_iva_efectiva;

            return response()->json([
                'message' => 'Produto actualizado com sucesso',
                'produto' => $resposta,
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Produto não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[PRODUTO UPDATE ERROR]', [
                'produto_id' => $id,
                'error'      => $e->getMessage(),
                'trace'      => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Erro ao actualizar produto',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | ESTADO
     | ================================================================== */

    public function alterarStatus(string $id, Request $request)
    {
        $produto = Produto::findOrFail($id);

        $status  = $request->validate(['status' => 'required|in:ativo,inativo'])['status'];
        $produto = $this->produtoService->alterarStatus($id, $status);

        return response()->json([
            'message' => 'Status actualizado',
            'produto' => $produto,
        ]);
    }

    /* =====================================================================
     | APAGAR (SOFT DELETE)
     | ================================================================== */

    public function destroy(string $id)
    {
        try {
            $produto = Produto::withTrashed()->findOrFail($id);

            if ($produto->trashed()) {
                return response()->json(['message' => 'Produto já está na lixeira'], 400);
            }

            $vendasPendentes = $produto->itensVenda()
                ->whereHas('venda', fn ($q) => $q->where('status', 'pendente'))
                ->exists();

            if ($vendasPendentes) {
                return response()->json(['message' => 'Não é possível apagar produto com vendas pendentes'], 409);
            }

            $produto->delete();

            return response()->json([
                'message'      => 'Produto removido com sucesso',
                'soft_deleted' => true,
                'id'           => $produto->id,
                'deleted_at'   => $produto->deleted_at,
            ]);

        } catch (QueryException $e) {
            if ($e->getCode() == 23000 || str_contains($e->getMessage(), 'foreign key constraint')) {
                return response()->json([
                    'message' => 'Não é possível remover — existem registos vinculados. Considere inactivar o produto.',
                    'error'   => 'constraint_violation',
                ], 409);
            }
            return response()->json(['message' => 'Erro de base de dados', 'error' => $e->getMessage()], 500);

        } catch (Throwable $e) {
            Log::error('[PRODUTO DELETE ERROR]', ['produto_id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Erro ao remover produto', 'error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | RESTAURAR
     | ================================================================== */

    public function restore(string $id)
    {
        try {
            $produto = Produto::withTrashed()->findOrFail($id);

            if (! $produto->trashed()) {
                return response()->json(['message' => 'Produto não está na lixeira'], 400);
            }

            if ($produto->categoria_id && ! Categoria::withTrashed()->where('id', $produto->categoria_id)->exists()) {
                return response()->json([
                    'message' => 'Não é possível restaurar: a categoria foi removida permanentemente.',
                ], 422);
            }

            if ($produto->fornecedor_id && ! Fornecedor::withTrashed()->where('id', $produto->fornecedor_id)->exists()) {
                return response()->json([
                    'message' => 'Não é possível restaurar: o fornecedor foi removido permanentemente.',
                ], 422);
            }

            $produto->restore();

            return response()->json([
                'message' => 'Produto restaurado com sucesso',
                'produto' => $produto->fresh(['categoria', 'fornecedor']),
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Produto não encontrado'], 404);
        } catch (Throwable $e) {
            Log::error('[PRODUTO RESTORE ERROR]', ['produto_id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Erro ao restaurar produto', 'error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | REMOVER PERMANENTEMENTE
     | ================================================================== */

    public function forceDelete(string $id)
    {
        try {
            $produto = Produto::withTrashed()->findOrFail($id);

            if ($produto->itensVenda()->exists() || $produto->itensCompra()->exists()) {
                return response()->json([
                    'message' => 'Não é possível remover permanentemente um produto com vendas/compras associadas.',
                ], 409);
            }

            if ($produto->movimentosStock()->exists()) {
                return response()->json([
                    'message' => 'Não é possível remover permanentemente um produto com movimentações de stock.',
                ], 409);
            }

            $nome = $produto->nome;
            $produto->forceDelete();

            Log::info('[PRODUTO FORCE DELETE]', ['id' => $id, 'nome' => $nome]);

            return response()->json([
                'message' => "Produto \"{$nome}\" removido permanentemente",
                'id'      => $id,
            ]);

        } catch (Throwable $e) {
            Log::error('[PRODUTO FORCE DELETE ERROR]', ['produto_id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Erro ao remover produto', 'error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | ESTATÍSTICAS
     | ================================================================== */

    public function estatisticas(Request $request)
    {

        try {
            $dataInicio = $request->data_inicio;
            $dataFim    = $request->data_fim;

            $queryBase = fn ($q) => $q
                ->join('produtos', 'itens_venda.produto_id', '=', 'produtos.id')
                ->join('vendas', 'itens_venda.venda_id', '=', 'vendas.id')
                ->where('vendas.status', '!=', 'cancelada')
                ->when($dataInicio, fn ($q) => $q->whereDate('vendas.data_venda', '>=', $dataInicio))
                ->when($dataFim,    fn ($q) => $q->whereDate('vendas.data_venda', '<=', $dataFim));

            $maisVendidos = DB::table('itens_venda')->tap($queryBase)
                ->select(
                    'produtos.id', 'produtos.nome', 'produtos.codigo', 'produtos.tipo',
                    DB::raw('SUM(itens_venda.quantidade) as total_quantidade'),
                    DB::raw('SUM(itens_venda.subtotal) as total_vendas')
                )
                ->groupBy('produtos.id', 'produtos.nome', 'produtos.codigo', 'produtos.tipo')
                ->orderByDesc('total_vendas')
                ->limit(10)
                ->get()
                ->map(fn ($i) => [
                    'id'          => $i->id,
                    'produto'     => $i->nome,
                    'codigo'      => $i->codigo,
                    'tipo'        => $i->tipo,
                    'quantidade'  => (int) $i->total_quantidade,
                    'valor_total' => round($i->total_vendas, 2),
                ]);

            $servicosMaisVendidos = DB::table('itens_venda')->tap($queryBase)
                ->where('produtos.tipo', 'servico')
                ->select(
                    'produtos.id', 'produtos.nome', 'produtos.codigo',
                    DB::raw('SUM(itens_venda.quantidade) as total_quantidade'),
                    DB::raw('SUM(itens_venda.subtotal) as total_receita'),
                    DB::raw('SUM(itens_venda.valor_retencao) as total_retencao')
                )
                ->groupBy('produtos.id', 'produtos.nome', 'produtos.codigo')
                ->orderByDesc('total_receita')
                ->limit(10)
                ->get()
                ->map(fn ($i) => [
                    'id'         => $i->id,
                    'nome'       => $i->nome,
                    'codigo'     => $i->codigo,
                    'quantidade' => (int) $i->total_quantidade,
                    'receita'    => round($i->total_receita, 2),
                    'retencao'   => round($i->total_retencao, 2),
                ]);

            return response()->json([
                'success' => true,
                'data'    => [
                    'produtos_mais_vendidos'      => $maisVendidos,
                    'servicos_mais_vendidos'      => $servicosMaisVendidos,
                    'total_produtos_ativos'       => Produto::where('tipo', 'produto')->where('status', 'ativo')->count(),
                    'total_servicos_ativos'       => Produto::where('tipo', 'servico')->where('status', 'ativo')->count(),
                    'total_servicos_com_retencao' => Produto::where('tipo', 'servico')->where('taxa_retencao', '>', 0)->count(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('[PRODUTO ESTATISTICAS ERROR]', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar estatísticas',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | HELPERS PRIVADOS
     | ================================================================== */

    /**
     * Regras de validação para CRIAR.
     *
     * PRODUTO FÍSICO: sem taxa_iva — herdada da categoria.
     * SERVIÇO: mantém taxa_iva próprio (sem categoria).
     */
    private function regrasValidacao(string $tipo): array
    {
        $base = [
            'tipo'   => 'required|in:produto,servico',
            'nome'   => 'required|string|max:255',
            'descricao'   => 'nullable|string',
            'preco_venda' => 'required|numeric|min:0',
            'status'      => 'nullable|in:ativo,inativo',
            // Campos de cálculo de preço
            'tipo_preco'          => 'nullable|in:fixo,margem,markup',
            'despesas_adicionais' => 'nullable|numeric|min:0',
            'margem_lucro'        => 'nullable|numeric|min:0|max:99.99',
            'markup'              => 'nullable|numeric|min:0',
        ];

        if ($tipo === 'produto') {
            // ✅ SEM taxa_iva — vem da categoria
            return array_merge($base, [
                'categoria_id'   => 'required|uuid|exists:categorias,id', // ✅ REQUIRED para produtos
                'fornecedor_id'  => 'nullable|uuid|exists:fornecedores,id',
                'codigo'         => 'nullable|string|max:50|unique:produtos,codigo',
                'preco_compra'   => 'required|numeric|min:0',
                'custo_medio'    => 'nullable|numeric|min:0',
                'estoque_atual'  => 'nullable|integer|min:0',
                'estoque_minimo' => 'nullable|integer|min:0',
            ]);
        }

        // SERVIÇO: mantém taxa_iva próprio
        return array_merge($base, [
            'taxa_iva'         => 'nullable|numeric|min:0|max:100',
            'sujeito_iva'      => 'nullable|boolean',
            'taxa_retencao'    => 'nullable|numeric|in:0,2,5,6.5,10,15',
            'codigo_isencao'   => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
            'duracao_estimada' => 'required|string|max:50',
            'unidade_medida'   => 'required|in:hora,dia,semana,mes',
        ]);
    }

    /**
     * Regras de validação para ACTUALIZAR.
     */
    private function regrasValidacaoUpdate(string $tipo, string $id): array
    {
        $base = [
            'tipo'        => 'sometimes|in:produto,servico',
            'nome'        => 'sometimes|string|max:255',
            'descricao'   => 'nullable|string',
            'preco_venda' => 'sometimes|numeric|min:0',
            'status'      => 'nullable|in:ativo,inativo',
            'tipo_preco'          => 'nullable|in:fixo,margem,markup',
            'despesas_adicionais' => 'nullable|numeric|min:0',
            'margem_lucro'        => 'nullable|numeric|min:0|max:99.99',
            'markup'              => 'nullable|numeric|min:0',
        ];

        if ($tipo === 'produto') {
            // ✅ SEM taxa_iva — vem da categoria
            return array_merge($base, [
                'categoria_id'   => 'sometimes|uuid|exists:categorias,id', // sometimes na atualização
                'fornecedor_id'  => 'nullable|uuid|exists:fornecedores,id',
                'codigo'         => 'nullable|string|max:50|unique:produtos,codigo,' . $id,
                'preco_compra'   => 'sometimes|numeric|min:0',
                'custo_medio'    => 'nullable|numeric|min:0',
                'estoque_atual'  => 'nullable|integer|min:0',
                'estoque_minimo' => 'nullable|integer|min:0',
            ]);
        }

        // SERVIÇO: mantém taxa_iva próprio
        return array_merge($base, [
            'taxa_iva'         => 'nullable|numeric|min:0|max:100',
            'sujeito_iva'      => 'nullable|boolean',
            'taxa_retencao'    => 'nullable|numeric|in:0,2,5,6.5,10,15',
            'codigo_isencao'   => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
            'duracao_estimada' => 'sometimes|string|max:50',
            'unidade_medida'   => 'sometimes|in:hora,dia,semana,mes',
        ]);
    }

    /** Extrai filtros de listagem do request */
    private function extrairFiltros(Request $request): array
    {
        return array_filter([
            'tipo'         => $request->tipo,
            'status'       => $request->status,
            'categoria_id' => $request->categoria_id,
            'busca'        => $request->busca,
        ], fn ($v) => ! is_null($v) && $v !== '');
    }
}