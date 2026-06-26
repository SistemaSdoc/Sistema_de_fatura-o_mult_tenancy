<?php

namespace App\Http\Controllers;

use App\Models\Shared\Categoria as SharedCategoria;
use App\Models\Tenant\Categoria as TenantCategoria;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * CategoriaController
 *
 * ✅ SUPORTA AMBOS OS MODOS:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 */
class CategoriaController extends Controller
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct()
    {
        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[CategoriaController] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
    }

    /* =====================================================================
     | HELPERS
     | ================================================================== */

    protected function getModo(): string
    {
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        return $this->modo;
    }

    protected function getEmpresa(): ?Empresa
    {
        if (!$this->empresa) {
            $this->empresa = app('current.empresa');
        }
        return $this->empresa;
    }

    protected function getUser(): ?object
    {
        return $this->tenantUser;
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
     | VERIFICAÇÃO DE ACESSO - CORRIGIDA ✅
     | ================================================================== */

    /**
     * Verifica se o usuário tem acesso ao tenant atual
     */
    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[CategoriaController] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[CategoriaController] Empresa não identificada.');
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
            Log::error('[CategoriaController] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[CategoriaController] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[CategoriaController] Acesso verificado com sucesso', [
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
    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    /**
     * Verifica se o usuário tem role permitida
     */
    protected function hasRole(array $roles): bool
    {
        if (!$this->tenantUser) {
            return false;
        }

        // Verificar role global
        if ($this->tenantUser->role_global === 'super_admin') {
            return true;
        }

        // Verificar role no tenant atual
        $roleNoTenant = $this->tenantUser->role ?? 'operador';
        return in_array($roleNoTenant, $roles);
    }

    /* =====================================================================
     | HELPERS: Models e Queries
     | ================================================================== */

    protected function categoriaModel()
    {
        return $this->isColectivo() ? new SharedCategoria() : new TenantCategoria();
    }

    /**
     * Query com scope para categorias (apenas colectivo)
     */
    protected function queryCategorias()
    {
        if ($this->isColectivo()) {
            return SharedCategoria::doTenant();
        }
        return TenantCategoria::query();
    }

    /**
     * Busca categorias deletadas com scope (apenas colectivo)
     */
    protected function queryCategoriasDeletadas()
    {
        if ($this->isColectivo()) {
            return SharedCategoria::doTenant()->onlyTrashed();
        }
        return TenantCategoria::onlyTrashed();
    }

    /**
     * Busca categoria com scope (apenas colectivo)
     */
    protected function buscarCategoria(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedCategoria::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->first();
        }

        if ($comTrashed) {
            return TenantCategoria::withTrashed()->where('id', $id)->first();
        }
        return TenantCategoria::where('id', $id)->first();
    }

    /**
     * Busca categoria com scope e lança exceção se não encontrada
     */
    protected function buscarCategoriaOrFail(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedCategoria::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->firstOrFail();
        }

        if ($comTrashed) {
            return TenantCategoria::withTrashed()->where('id', $id)->firstOrFail();
        }
        return TenantCategoria::where('id', $id)->firstOrFail();
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
     | MÉTODOS DO CONTROLLER
     | ================================================================== */

    /**
     * GET /api/categorias
     * Lista apenas categorias ativas (padrão) ou conforme filtro
     */
    public function index(Request $request)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            $query = $this->queryCategorias();

            if ($request->filled('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            } else {
                $query->where('status', 'ativo');
            }

            if ($request->filled('busca')) {
                $query->where('nome', 'like', '%' . $request->busca . '%');
            }

            $categorias = $query->withCount('produtos')->get();

            Log::info('[CategoriaController] Lista de categorias carregada', [
                'total' => $categorias->count(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Lista de categorias carregada com sucesso',
                'data' => $categorias,
                'resumo' => [
                    'total' => $categorias->count(),
                    'iva_14' => $categorias->where('taxa_iva', 14)->count(),
                    'iva_5' => $categorias->where('taxa_iva', 5)->count(),
                    'isentas' => $categorias->where('sujeito_iva', false)->count(),
                ],
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] INDEX ERROR', ['error' => $e->getMessage(), 'modo' => $modo]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar categorias',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/categorias/todas
     * Lista TODAS as categorias (incluindo inativas, mas excluindo deletadas)
     */
    public function indexTodas(Request $request)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            $query = $this->queryCategorias();

            if ($request->filled('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('busca')) {
                $query->where('nome', 'like', '%' . $request->busca . '%');
            }

            $categorias = $query->withCount('produtos')->get();

            return response()->json([
                'success' => true,
                'message' => 'Lista de todas as categorias carregada com sucesso',
                'data' => $categorias,
                'total' => $categorias->count(),
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] INDEX TODAS ERROR', ['error' => $e->getMessage(), 'modo' => $modo]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar categorias',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/categorias/deletadas
     * Lista apenas categorias deletadas (soft delete)
     */
    public function indexDeletadas(Request $request)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            if (!$this->hasRole(['admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas admin pode ver categorias deletadas'
                ], 403);
            }

            $query = $this->queryCategoriasDeletadas();

            if ($request->filled('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            if ($request->filled('busca')) {
                $query->where('nome', 'like', '%' . $request->busca . '%');
            }

            $categorias = $query->withCount('produtos')->get();

            return response()->json([
                'success' => true,
                'message' => 'Lista de categorias deletadas carregada com sucesso',
                'data' => $categorias,
                'total' => $categorias->count(),
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] INDEX DELETADAS ERROR', ['error' => $e->getMessage(), 'modo' => $modo]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar categorias deletadas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/categorias/select
     * Para dropdown/select (apenas ativas)
     */
    public function paraSelectProdutos()
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            $categorias = $this->queryCategorias()
                ->where('status', 'ativo')
                ->orderBy('nome')
                ->get()
                ->map(fn ($c) => [
                    'id' => $c->id,
                    'nome' => $c->nome,
                    'taxa_iva' => (float) $c->taxa_iva,
                    'label_iva' => $c->labelTaxaIva(),
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Categorias para selecção',
                'data' => $categorias,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] SELECT ERROR', ['error' => $e->getMessage(), 'modo' => $modo]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar categorias',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/categorias/{categoria}
     */
    public function show($id)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            $categoria = $this->buscarCategoria($id, true);

            if (!$categoria) {
                return response()->json([
                    'success' => false,
                    'message' => 'Categoria não encontrada'
                ], 404);
            }

            $categoria->loadCount('produtos');

            return response()->json([
                'success' => true,
                'message' => 'Categoria carregada com sucesso',
                'data' => $categoria,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] SHOW ERROR', ['error' => $e->getMessage(), 'modo' => $modo]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar categoria',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/categorias
     */
    public function store(Request $request)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            if (!$this->hasRole(['admin', 'operador', 'gestor', 'contabilista'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Não autorizado'
                ], 403);
            }

            $dados = $request->validate([
                'nome' => 'required|string|max:255',
                'descricao' => 'nullable|string',
                'taxa_iva' => 'nullable|numeric|in:0,5,14',
                'sujeito_iva' => 'nullable|boolean',
                'status' => 'nullable|in:ativo,inativo',
                'tipo' => 'nullable|in:produto,servico',
            ]);

            $dados['user_id'] = $this->getUserId();
            $dados['status'] = $dados['status'] ?? 'ativo';
            $dados['taxa_iva'] = $dados['taxa_iva'] ?? 14.00;
            $dados['sujeito_iva'] = $dados['sujeito_iva'] ?? true;

            // ⭐ ADICIONAR TENANT_ID (apenas para colectivo)
            if ($this->isColectivo()) {
                $dados['tenant_id'] = $this->empresa->id;
            }

            // ⭐ USAR O MODEL CORRETO
            if ($this->isColectivo()) {
                $categoria = SharedCategoria::create($dados);
            } else {
                $categoria = TenantCategoria::create($dados);
            }

            Log::info('[CategoriaController] Categoria criada', [
                'categoria_id' => $categoria->id,
                'nome' => $categoria->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Categoria criada com sucesso',
                'data' => $categoria,
                'modo' => $modo,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] STORE ERROR', ['error' => $e->getMessage(), 'modo' => $modo]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar categoria',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/categorias/{categoria}
     */
public function update(Request $request, $id)
{
    try {
        $modo = $this->getModo();
        $this->verificarAcessoUsuario();

        if (!$this->hasRole(['admin', 'operador', 'gestor', 'contabilista'])) {
            return response()->json(['error' => 'Não autorizado'], 403);
        }

        $categoria = $this->buscarCategoria($id);

        if (!$categoria) {
            return response()->json(['error' => 'Categoria não encontrada'], 404);
        }

        // 🔥 LOG PARA DEBUG
        Log::info('[UPDATE] Dados recebidos:', [
            'todos_dados' => $request->all(),
            'descricao' => $request->input('descricao'),
            'raw' => $request->getContent()
        ]);

        $dados = $request->validate([
            'nome'           => 'sometimes|string|max:255',
            'descricao'      => 'nullable|string', // ← PERMITE NULL
            'taxa_iva'       => 'nullable|numeric|in:0,5,14',
            'sujeito_iva'    => 'nullable|boolean',
            'status'         => 'nullable|in:ativo,inativo',
            'tipo'           => 'nullable|in:produto,servico',
        ]);

        // 🔥 LOG DOS DADOS VALIDADOS
        Log::info('[UPDATE] Dados validados:', $dados);

        // 🔥 Forçar update mesmo com campos vazios
        if (!empty($dados) || array_key_exists('descricao', $dados)) {
            $categoria->update($dados);

            $camposIva = ['taxa_iva', 'sujeito_iva', 'codigo_isencao'];
            $ivaAlterado = count(array_intersect(array_keys($dados), $camposIva)) > 0;

            if ($ivaAlterado) {
                $produtosAfetados = $categoria->produtos()
                    ->where('tipo', 'produto')
                    ->update([
                        'taxa_iva' => (float) $categoria->taxa_iva,
                        'sujeito_iva' => (bool) $categoria->sujeito_iva,
                        'codigo_isencao' => $categoria->codigo_isencao,
                    ]);

                Log::info('[UPDATE] IVA propagado para produtos da categoria', [
                    'categoria_id' => $categoria->id,
                    'produtos_afetados' => $produtosAfetados,
                    'taxa_iva' => (float) $categoria->taxa_iva,
                    'sujeito_iva' => (bool) $categoria->sujeito_iva,
                    'codigo_isencao' => $categoria->codigo_isencao,
                ]);
            }
        }

        // Recarregar a categoria
        $categoria->refresh();
        $categoria->loadCount('produtos');

        Log::info('[UPDATE] Categoria atualizada:', [
            'id' => $categoria->id,
            'nome' => $categoria->nome,
            'descricao' => $categoria->descricao
        ]);

        return response()->json([
            'success'   => true,
            'message'   => 'Categoria actualizada com sucesso',
            'data'      => $categoria,
            'categoria' => $categoria,
            'modo'      => $modo,
        ]);
    } catch (\Exception $e) {
        Log::error('[CategoriaController] UPDATE ERROR', [
            'error' => $e->getMessage(), 
            'trace' => $e->getTraceAsString()
        ]);
        return response()->json(['error' => $e->getMessage()], 500);
    }
}

    /**
     * DELETE /api/categorias/{categoria} (Soft Delete)
     */
    public function destroy($id)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            if (!$this->hasRole(['admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas admin pode apagar'
                ], 403);
            }

            $categoria = $this->buscarCategoria($id);

            if (!$categoria) {
                return response()->json([
                    'success' => false,
                    'message' => 'Categoria não encontrada'
                ], 404);
            }

            // Verificar produtos ativos
            $totalProdutosAtivos = $categoria->produtos()->where('status', 'ativo')->count();
            if ($totalProdutosAtivos > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Não é possível: {$totalProdutosAtivos} produto(s) activo(s).",
                    'error' => 'produtos_activos',
                ], 409);
            }

            $categoria->delete();

            Log::info('[CategoriaController] Categoria deletada (soft)', [
                'categoria_id' => $categoria->id,
                'nome' => $categoria->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Categoria eliminada com sucesso',
                'deleted' => true,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] DESTROY ERROR', ['error' => $e->getMessage(), 'modo' => $modo]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao eliminar categoria',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/categorias/{id}/restore
     * Restaura categoria deletada (soft delete)
     */
    public function restore($id)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            if (!$this->hasRole(['admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas admin pode restaurar'
                ], 403);
            }

            $categoria = $this->buscarCategoria($id, true);

            if (!$categoria) {
                return response()->json([
                    'success' => false,
                    'message' => 'Categoria não encontrada na lixeira'
                ], 404);
            }

            if (!$categoria->trashed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Categoria não está deletada'
                ], 400);
            }

            $categoria->restore();
            $categoria->loadCount('produtos');

            Log::info('[CategoriaController] Categoria restaurada', [
                'categoria_id' => $categoria->id,
                'nome' => $categoria->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Categoria restaurada com sucesso',
                'data' => $categoria,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] RESTORE ERROR', ['error' => $e->getMessage(), 'modo' => $modo]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao restaurar categoria',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/categorias/{id}/force
     * Remove permanentemente a categoria
     */
    public function forceDelete($id)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            if (!$this->hasRole(['admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas admin pode eliminar permanentemente'
                ], 403);
            }

            $categoria = $this->buscarCategoria($id, true);

            if (!$categoria) {
                return response()->json([
                    'success' => false,
                    'message' => 'Categoria não encontrada'
                ], 404);
            }

            // Verificar produtos mesmo os deletados
            $totalProdutos = $categoria->produtos()->withTrashed()->count();
            if ($totalProdutos > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Não é possível: {$totalProdutos} produto(s) associado(s).",
                    'error' => 'produtos_associados',
                ], 409);
            }

            $categoria->forceDelete();

            Log::info('[CategoriaController] Categoria eliminada permanentemente', [
                'categoria_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Categoria eliminada permanentemente com sucesso',
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] FORCE DELETE ERROR', ['error' => $e->getMessage(), 'modo' => $modo]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao eliminar categoria permanentemente',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
