<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Shared\Categoria as SharedCategoria;
use App\Models\Shared\Fornecedor as SharedFornecedor;
use App\Models\Shared\Venda as SharedVenda;
use App\Models\Shared\ItemVenda as SharedItemVenda;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Tenant\Categoria as TenantCategoria;
use App\Models\Tenant\Fornecedor as TenantFornecedor;
use App\Models\Tenant\Venda as TenantVenda;
use App\Models\Tenant\ItemVenda as TenantItemVenda;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use App\Services\ProdutoService;
use Carbon\Carbon;
use Throwable;

class ProdutoController extends Controller
{
    protected ProdutoService $produtoService;
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct(ProdutoService $produtoService)
    {
        $this->produtoService = $produtoService;
        
        // ✅ Obtém da sessão (prioridade máxima)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[ProdutoController] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
    }

    /* =====================================================================
     | HELPERS DE MODO
     | ================================================================== */

    protected function getModo(): string
    {
        // ✅ Atualiza da sessão a cada chamada
        $this->modo = session('tenant_modo', 'colectivo');
        return $this->modo;
    }

    protected function isColectivo(): bool
    {
        return $this->getModo() === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->getModo() === 'singular';
    }

    /* =====================================================================
     | HELPERS DE MODEL (com suporte a ambos os modos)
     | ================================================================== */

    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
    }

    protected function categoriaModel()
    {
        return $this->isColectivo() ? new SharedCategoria() : new TenantCategoria();
    }

    protected function fornecedorModel()
    {
        return $this->isColectivo() ? new SharedFornecedor() : new TenantFornecedor();
    }

    protected function vendaModel()
    {
        return $this->isColectivo() ? new SharedVenda() : new TenantVenda();
    }

    protected function itemVendaModel()
    {
        return $this->isColectivo() ? new SharedItemVenda() : new TenantItemVenda();
    }

    /* =====================================================================
     | HELPERS DE QUERY (com scope do tenant)
     | ================================================================== */

    protected function queryProdutos(bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedProduto::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query;
        }

        if ($comTrashed) {
            return TenantProduto::withTrashed();
        }
        return TenantProduto::query();
    }

    protected function queryProdutosDeletados()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->onlyTrashed();
        }
        return TenantProduto::onlyTrashed();
    }

    protected function queryCategorias(bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedCategoria::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query;
        }

        if ($comTrashed) {
            return TenantCategoria::withTrashed();
        }
        return TenantCategoria::query();
    }

    protected function queryFornecedores(bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedFornecedor::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query;
        }

        if ($comTrashed) {
            return TenantFornecedor::withTrashed();
        }
        return TenantFornecedor::query();
    }

    /* =====================================================================
     | HELPERS DE BUSCA (com scope do tenant)
     | ================================================================== */

    protected function buscarProduto(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedProduto::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->first();
        }

        if ($comTrashed) {
            return TenantProduto::withTrashed()->where('id', $id)->first();
        }
        return TenantProduto::where('id', $id)->first();
    }

    protected function buscarProdutoOrFail(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedProduto::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->firstOrFail();
        }

        if ($comTrashed) {
            return TenantProduto::withTrashed()->where('id', $id)->firstOrFail();
        }
        return TenantProduto::where('id', $id)->firstOrFail();
    }

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO - CORRIGIDA ✅
     | ================================================================== */

    /**
     * Verifica se o usuário tem acesso ao tenant atual
     */
    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[ProdutoController] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[ProdutoController] Empresa não identificada.');
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
            Log::error('[ProdutoController] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[ProdutoController] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[ProdutoController] Acesso verificado com sucesso', [
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
     * Verifica se o usuário tem role permitida
     */
    protected function hasRole(array $roles): bool
    {
        if (!$this->tenantUser) {
            return false;
        }

        $userRole = $this->tenantUser->role ?? 'operador';
        return in_array($userRole, $roles);
    }

    /**
     * Obtém o user_id do tenantUser
     */
    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    /**
     * Adiciona tenant_id (apenas para colectivo)
     */
    protected function adicionarTenantId(array $dados): array
    {
        if ($this->isColectivo() && $this->empresa) {
            $dados['tenant_id'] = $this->empresa->id;
        }
        return $dados;
    }

    /* =====================================================================
     | VERIFICAÇÕES DE EXISTÊNCIA
     | ================================================================== */

    protected function categoriaExiste(string $id, bool $comTrashed = false): bool
    {
        return $this->queryCategorias($comTrashed)->where('id', $id)->exists();
    }

    protected function fornecedorExiste(string $id, bool $comTrashed = false): bool
    {
        return $this->queryFornecedores($comTrashed)->where('id', $id)->exists();
    }

    protected function codigoExisteNoTenant(string $codigo, ?string $excluirId = null): bool
    {
        $query = $this->queryProdutos()->where('codigo', $codigo);
        if ($excluirId) {
            $query->where('id', '!=', $excluirId);
        }
        return $query->exists();
    }

    /* =====================================================================
     | LISTAGEM
     | ================================================================== */

    public function index(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::index] Listando produtos', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $filtros = $this->extrairFiltros($request);
            $produtos = $this->produtoService->listarProdutos($filtros);

            return response()->json([
                'message'  => 'Lista de produtos carregada com sucesso',
                'produtos' => $produtos,
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ProdutoController::index] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao listar produtos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function todos(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::todos] Listando todos os produtos', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            if (!$this->hasRole(['admin', 'operador', 'gestor', 'contabilista'])) {
                return response()->json(['error' => 'Não autorizado'], 403);
            }

            $query = $this->queryProdutos()->with(['categoria', 'fornecedor']);

            if ($request->filled('busca')) {
                $busca = $request->busca;
                $query->where(function($q) use ($busca) {
                    $q->where('nome', 'like', "%{$busca}%")
                      ->orWhere('codigo', 'like', "%{$busca}%");
                });
            }

            if ($request->filled('categoria_id')) {
                $query->where('categoria_id', $request->categoria_id);
            }

            if ($request->filled('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $produtos = $query->get();

            return response()->json([
                'message'   => 'Lista de todos os produtos carregada com sucesso',
                'produtos'  => $produtos,
                'total'     => $produtos->count(),
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ProdutoController::todos] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function trashed(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::trashed] Listando produtos deletados', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            if (!$this->hasRole(['admin', 'operador', 'gestor', 'contabilista'])) {
                return response()->json(['error' => 'Não autorizado'], 403);
            }

            $query = $this->queryProdutosDeletados()->with(['categoria', 'fornecedor']);

            if ($request->filled('busca')) {
                $busca = $request->busca;
                $query->where(function($q) use ($busca) {
                    $q->where('nome', 'like', "%{$busca}%")
                      ->orWhere('codigo', 'like', "%{$busca}%");
                });
            }

            if ($request->filled('categoria_id')) {
                $query->where('categoria_id', $request->categoria_id);
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
                'message'         => 'Produtos na lixeira carregados com sucesso',
                'produtos'        => $produtos,
                'total_deletados' => $produtos instanceof \Illuminate\Pagination\LengthAwarePaginator
                    ? $produtos->total()
                    : $produtos->count(),
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ProdutoController::trashed] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function indexWithTrashed(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::indexWithTrashed] Listando com deletados', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $filtros = array_merge($this->extrairFiltros($request), ['com_deletados' => true]);
            $produtos = $this->produtoService->listarProdutos($filtros);

            return response()->json([
                'message'          => 'Lista completa de produtos',
                'produtos'         => $produtos,
                'total'            => $produtos->count(),
                'ativos'           => $produtos->whereNull('deleted_at')->count(),
                'deletados'        => $produtos->whereNotNull('deleted_at')->count(),
                'produtos_fisicos' => $produtos->where('tipo', 'produto')->count(),
                'servicos'         => $produtos->where('tipo', 'servico')->count(),
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ProdutoController::indexWithTrashed] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function indexOnlyTrashed(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::indexOnlyTrashed] Listando apenas deletados', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $query = $this->queryProdutosDeletados();

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
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ProdutoController::indexOnlyTrashed] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | DETALHE
     | ================================================================== */

    public function show(string $id)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::show] Buscando produto', [
            'produto_id' => $id,
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $produto = $this->buscarProdutoOrFail($id, true);
            $produto->load(['categoria', 'fornecedor', 'movimentosStock' => fn ($q) => $q->limit(10)]);

            $produtoArray = $produto->toArray();
            $produtoArray['taxa_iva_efectiva'] = $produto->taxa_iva_efectiva ?? $produto->taxa_iva ?? 0;

            return response()->json([
                'message' => 'Produto carregado com sucesso',
                'produto' => $produtoArray,
                'modo' => $modo,
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Produto não encontrado',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[ProdutoController::show] Erro', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | CRIAR
     | ================================================================== */

    public function store(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::store] Criando produto', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $tipo = $request->input('tipo', 'produto');
            $dados = $request->validate($this->regrasValidacao($tipo));

            $dados['user_id'] = $this->getUserId();

            // ⭐ ADICIONAR TENANT_ID (apenas para colectivo)
            if ($this->isColectivo()) {
                $dados['tenant_id'] = $this->empresa->id;
            }

            $produto = $this->produtoService->criarProduto($dados);
            $produto->load('categoria');

            $resposta = $produto->toArray();
            $resposta['taxa_iva_efectiva'] = $produto->taxa_iva_efectiva ?? $produto->taxa_iva ?? 0;

            return response()->json([
                'message' => $tipo === 'servico' ? 'Serviço criado com sucesso' : 'Produto criado com sucesso',
                'produto' => $resposta,
                'modo' => $modo,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('[ProdutoController::store] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao criar produto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /* =====================================================================
     | ACTUALIZAR
     | ================================================================== */

    public function update(Request $request, string $id)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::update] Atualizando produto', [
            'produto_id' => $id,
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $produto = $this->buscarProdutoOrFail($id);

            $tipo = $request->input('tipo', $produto->tipo);
            if (!in_array($tipo, ['produto', 'servico'])) {
                $tipo = $produto->tipo;
            }

            $regras = $this->regrasValidacaoUpdate($tipo, $id);
            $dados = $request->validate($regras);

            $produto = $this->produtoService->editarProduto($id, $dados);
            $produto->load('categoria');

            $resposta = $produto->toArray();
            $resposta['taxa_iva_efectiva'] = $produto->taxa_iva_efectiva ?? $produto->taxa_iva ?? 0;

            return response()->json([
                'message' => 'Produto actualizado com sucesso',
                'produto' => $resposta,
                'modo' => $modo,
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Produto não encontrado'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('[ProdutoController::update] Erro', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
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
        $modo = $this->getModo();
        Log::info('[ProdutoController::alterarStatus] Alterando status', [
            'produto_id' => $id,
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $this->buscarProdutoOrFail($id);

            $status = $request->validate(['status' => 'required|in:ativo,inativo'])['status'];
            $produto = $this->produtoService->alterarStatus($id, $status);

            return response()->json([
                'message' => 'Status actualizado',
                'produto' => $produto,
                'modo' => $modo,
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Produto não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[ProdutoController::alterarStatus] Erro', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | APAGAR (SOFT DELETE)
     | ================================================================== */

    public function destroy(string $id)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::destroy] Deletando produto', [
            'produto_id' => $id,
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $produto = $this->buscarProdutoOrFail($id, true);

            if ($produto->trashed()) {
                return response()->json(['message' => 'Produto já está na lixeira'], 400);
            }

            // Verificar vendas pendentes
            if ($this->isColectivo()) {
                $vendasPendentes = SharedItemVenda::doTenant()
                    ->where('produto_id', $id)
                    ->whereHas('venda', fn ($q) => $q->where('status', 'pendente'))
                    ->exists();
            } else {
                $vendasPendentes = TenantItemVenda::where('produto_id', $id)
                    ->whereHas('venda', fn ($q) => $q->where('status', 'pendente'))
                    ->exists();
            }

            if ($vendasPendentes) {
                return response()->json(['message' => 'Não é possível apagar produto com vendas pendentes'], 409);
            }

            $produto->delete();

            return response()->json([
                'message'      => 'Produto removido com sucesso',
                'soft_deleted' => true,
                'id'           => $produto->id,
                'deleted_at'   => $produto->deleted_at,
                'modo' => $modo,
            ]);

        } catch (QueryException $e) {
            if ($e->getCode() == 23000 || str_contains($e->getMessage(), 'foreign key constraint')) {
                return response()->json([
                    'message' => 'Não é possível remover — existem registos vinculados.',
                    'error'   => 'constraint_violation',
                ], 409);
            }
            return response()->json(['message' => 'Erro de base de dados', 'error' => $e->getMessage()], 500);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Produto não encontrado'], 404);
        } catch (Throwable $e) {
            Log::error('[ProdutoController::destroy] Erro', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['message' => 'Erro ao remover produto', 'error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | RESTAURAR
     | ================================================================== */

    public function restore(string $id)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::restore] Restaurando produto', [
            'produto_id' => $id,
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            if ($this->isColectivo()) {
                $produto = SharedProduto::doTenant()->onlyTrashed()->where('id', $id)->firstOrFail();
            } else {
                $produto = TenantProduto::onlyTrashed()->where('id', $id)->firstOrFail();
            }

            if (!$produto->trashed()) {
                return response()->json(['message' => 'Produto não está na lixeira'], 400);
            }

            // Verificar se categoria existe
            if ($produto->categoria_id && !$this->categoriaExiste($produto->categoria_id, true)) {
                return response()->json([
                    'message' => 'Não é possível restaurar: a categoria foi removida permanentemente.',
                ], 422);
            }

            // Verificar se fornecedor existe
            if ($produto->fornecedor_id && !$this->fornecedorExiste($produto->fornecedor_id, true)) {
                return response()->json([
                    'message' => 'Não é possível restaurar: o fornecedor foi removido permanentemente.',
                ], 422);
            }

            $produto->restore();

            return response()->json([
                'message' => 'Produto restaurado com sucesso',
                'produto' => $produto->fresh(['categoria', 'fornecedor']),
                'modo' => $modo,
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Produto não encontrado na lixeira'], 404);
        } catch (Throwable $e) {
            Log::error('[ProdutoController::restore] Erro', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['message' => 'Erro ao restaurar produto', 'error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | REMOVER PERMANENTEMENTE
     | ================================================================== */

    public function forceDelete(string $id)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::forceDelete] Removendo permanentemente', [
            'produto_id' => $id,
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ BUSCAR COM SCOPE
            if ($this->isColectivo()) {
                $produto = SharedProduto::doTenant()->onlyTrashed()->where('id', $id)->firstOrFail();
            } else {
                $produto = TenantProduto::onlyTrashed()->where('id', $id)->firstOrFail();
            }

            // Verificar vendas associadas
            if ($this->isColectivo()) {
                $hasVendas = SharedItemVenda::doTenant()->where('produto_id', $id)->exists();
            } else {
                $hasVendas = TenantItemVenda::where('produto_id', $id)->exists();
            }

            if ($hasVendas) {
                return response()->json([
                    'message' => 'Não é possível remover permanentemente um produto com vendas associadas.',
                ], 409);
            }

            // Verificar compras associadas (se existir o model)
            try {
                if ($this->isColectivo()) {
                    $hasCompras = \App\Models\Shared\ItemCompra::doTenant()->where('produto_id', $id)->exists();
                } else {
                    $hasCompras = \App\Models\Tenant\ItemCompra::where('produto_id', $id)->exists();
                }

                if ($hasCompras) {
                    return response()->json([
                        'message' => 'Não é possível remover permanentemente um produto com compras associadas.',
                    ], 409);
                }
            } catch (\Exception $e) {
                // Model não existe, ignorar
            }

            // Verificar movimentos de stock
            if ($this->isColectivo()) {
                $hasMovimentos = \App\Models\Shared\MovimentoStock::doTenant()->where('produto_id', $id)->exists();
            } else {
                $hasMovimentos = \App\Models\Tenant\MovimentoStock::where('produto_id', $id)->exists();
            }

            if ($hasMovimentos) {
                return response()->json([
                    'message' => 'Não é possível remover permanentemente um produto com movimentações de stock.',
                ], 409);
            }

            $nome = $produto->nome;
            $produto->forceDelete();

            return response()->json([
                'message' => "Produto \"{$nome}\" removido permanentemente",
                'id'      => $id,
                'modo' => $modo,
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Produto não encontrado na lixeira'], 404);
        } catch (Throwable $e) {
            Log::error('[ProdutoController::forceDelete] Erro', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['message' => 'Erro ao remover produto', 'error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | ESTATÍSTICAS
     | ================================================================== */

    public function estatisticas(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[ProdutoController::estatisticas] Gerando estatísticas', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $dataInicio = $request->data_inicio;
            $dataFim    = $request->data_fim;

            // ⭐ QUERY COM FILTRO DE TENANT
            $query = DB::table('itens_venda')
                ->join('produtos', 'itens_venda.produto_id', '=', 'produtos.id')
                ->join('vendas', 'itens_venda.venda_id', '=', 'vendas.id')
                ->where('vendas.status', '!=', 'cancelada')
                ->when($dataInicio, fn ($q) => $q->whereDate('vendas.data_venda', '>=', $dataInicio))
                ->when($dataFim,    fn ($q) => $q->whereDate('vendas.data_venda', '<=', $dataFim));

            // ⭐ FILTRO DE TENANT (apenas para colectivo)
            if ($this->isColectivo() && $this->empresa) {
                $query->where('produtos.tenant_id', $this->empresa->id)
                      ->where('itens_venda.tenant_id', $this->empresa->id)
                      ->where('vendas.tenant_id', $this->empresa->id);
            }

            $maisVendidos = (clone $query)
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

            // ⭐ QUERY COM SCOPE PARA TOTAIS
            $produtosQuery = $this->queryProdutos();

            return response()->json([
                'success' => true,
                'data'    => [
                    'produtos_mais_vendidos'      => $maisVendidos,
                    'total_produtos_ativos'       => (clone $produtosQuery)->where('tipo', 'produto')->where('status', 'ativo')->count(),
                    'total_servicos_ativos'       => (clone $produtosQuery)->where('tipo', 'servico')->where('status', 'ativo')->count(),
                    'total_servicos_com_retencao' => (clone $produtosQuery)->where('tipo', 'servico')->where('taxa_retencao', '>', 0)->count(),
                ],
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ProdutoController::estatisticas] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar estatísticas',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | HELPERS PRIVADOS (VALIDAÇÃO)
     | ================================================================== */

    private function regrasValidacao(string $tipo): array
    {
        $base = [
            'tipo'   => 'required|in:produto,servico',
            'nome'   => 'required|string|max:255',
            'descricao'   => 'nullable|string',
            'preco_venda' => 'required|numeric|min:0',
            'status'      => 'nullable|in:ativo,inativo',
            'tipo_preco'          => 'nullable|in:fixo,margem,markup',
            'despesas_adicionais' => 'nullable|numeric|min:0',
            'margem_lucro'        => 'nullable|numeric|min:0|max:99.99',
            'markup'              => 'nullable|numeric|min:0',
        ];

        if ($tipo === 'produto') {
            return array_merge($base, [
                'categoria_id'   => 'required|uuid',
                'fornecedor_id'  => 'nullable|uuid',
                'codigo'         => 'nullable|string|max:50',
                'preco_compra'   => 'required|numeric|min:0',
                'custo_medio'    => 'nullable|numeric|min:0',
                'estoque_atual'  => 'nullable|integer|min:0',
                'estoque_minimo' => 'nullable|integer|min:0',
            ]);
        }

        return array_merge($base, [
            'taxa_iva'         => 'nullable|numeric|min:0|max:100',
            'sujeito_iva'      => 'nullable|boolean',
            'taxa_retencao'    => 'nullable|numeric|in:0,2,5,6.5,10,15',
            'codigo_isencao'   => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
            'duracao_estimada' => 'required|string|max:50',
            'unidade_medida'   => 'required|in:hora,dia,semana,mes',
        ]);
    }

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
            return array_merge($base, [
                'categoria_id'   => 'sometimes|uuid',
                'fornecedor_id'  => 'nullable|uuid',
                'codigo'         => 'nullable|string|max:50',
                'preco_compra'   => 'sometimes|numeric|min:0',
                'custo_medio'    => 'nullable|numeric|min:0',
                'estoque_atual'  => 'nullable|integer|min:0',
                'estoque_minimo' => 'nullable|integer|min:0',
            ]);
        }

        return array_merge($base, [
            'taxa_iva'         => 'nullable|numeric|min:0|max:100',
            'sujeito_iva'      => 'nullable|boolean',
            'taxa_retencao'    => 'nullable|numeric|in:0,2,5,6.5,10,15',
            'codigo_isencao'   => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
            'duracao_estimada' => 'sometimes|string|max:50',
            'unidade_medida'   => 'sometimes|in:hora,dia,semana,mes',
        ]);
    }

    private function extrairFiltros(Request $request): array
    {
        return array_filter([
            'tipo'         => $request->tipo,
            'status'       => $request->status,
            'categoria_id' => $request->categoria_id,
            'busca'        => $request->busca,
        ], fn ($v) => !is_null($v) && $v !== '');
    }
}