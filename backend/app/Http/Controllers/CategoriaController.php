<?php

namespace App\Http\Controllers;

use App\Models\Tenant\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * CategoriaController
 *
 * ✅ COMPLETO - Com suporte a soft deletes e sem erros
 */
class CategoriaController extends Controller
{
    public function __construct()
    {
        // Vazio
    }

    /**
     * GET /api/categorias
     * Lista apenas categorias ativas (padrão) ou conforme filtro
     */
    public function index(Request $request)
    {
        try {
            $query = Categoria::query();

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

            return response()->json([
                'message'    => 'Lista de categorias carregada com sucesso',
                'categorias' => $categorias,
                'resumo'     => [
                    'total'   => $categorias->count(),
                    'iva_14'  => $categorias->where('taxa_iva', 14)->count(),
                    'iva_5'   => $categorias->where('taxa_iva', 5)->count(),
                    'isentas' => $categorias->where('sujeito_iva', false)->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] INDEX ERROR', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/categorias/todas
     * Lista TODAS as categorias (incluindo inativas, mas excluindo deletadas)
     */
    public function indexTodas(Request $request)
    {
        try {
            $query = Categoria::query();

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
                'message'    => 'Lista de todas as categorias carregada com sucesso',
                'categorias' => $categorias,
                'total'      => $categorias->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] INDEX TODAS ERROR', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/categorias/deletadas
     * Lista apenas categorias deletadas (soft delete)
     */
    public function indexDeletadas(Request $request)
    {
        try {
            $user = Auth::guard('tenant')->user();
            if (!$user || $user->role !== 'admin') {
                return response()->json(['error' => 'Apenas admin pode ver categorias deletadas'], 403);
            }

            $query = Categoria::onlyTrashed();

            if ($request->filled('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            if ($request->filled('busca')) {
                $query->where('nome', 'like', '%' . $request->busca . '%');
            }

            $categorias = $query->withCount('produtos')->get();

            return response()->json([
                'message'    => 'Lista de categorias deletadas carregada com sucesso',
                'categorias' => $categorias,
                'total'      => $categorias->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] INDEX DELETADAS ERROR', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/categorias/select
     * Para dropdown/select (apenas ativas)
     */
    public function paraSelectProdutos()
    {
        try {
            $categorias = Categoria::where('status', 'ativo')
                ->orderBy('nome')
                ->get()
                ->map(fn ($c) => [
                    'id'          => $c->id,
                    'nome'        => $c->nome,
                    'taxa_iva'    => (float) $c->taxa_iva,
                    'label_iva'   => $c->labelTaxaIva(),
                ]);

            return response()->json([
                'message'    => 'Categorias para selecção',
                'categorias' => $categorias,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] SELECT ERROR', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/categorias/{categoria}
     */
    public function show($id)
    {
        try {
            $categoria = Categoria::withTrashed()->find($id);

            if (!$categoria) {
                return response()->json(['error' => 'Categoria não encontrada'], 404);
            }

            $categoria->loadCount('produtos');

            return response()->json([
                'message'   => 'Categoria carregada com sucesso',
                'categoria' => $categoria,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] SHOW ERROR', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/categorias
     */
    public function store(Request $request)
    {
        try {
            $user = Auth::guard('tenant')->user();
            if (!$user || !in_array($user->role, ['admin', 'operador', 'gestor', 'contabilista'])) {
                return response()->json(['error' => 'Não autorizado'], 403);
            }

            $dados = $request->validate([
                'nome'           => 'required|string|max:255',
                'descricao'      => 'nullable|string',
                'taxa_iva'       => 'nullable|numeric|in:0,5,14',
                'sujeito_iva'    => 'nullable|boolean',
                'status'         => 'nullable|in:ativo,inativo',
                'tipo'           => 'nullable|in:produto,servico',
            ]);

            $dados['user_id']    = $user->id;
            $dados['status']     = $dados['status'] ?? 'ativo';
            $dados['taxa_iva']   = $dados['taxa_iva'] ?? 14.00;
            $dados['sujeito_iva'] = $dados['sujeito_iva'] ?? true;

            $categoria = Categoria::create($dados);

            return response()->json([
                'message'   => 'Categoria criada com sucesso',
                'categoria' => $categoria,
            ], 201);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] STORE ERROR', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/categorias/{categoria}
     */
    public function update(Request $request, $id)
    {
        try {
            $user = Auth::guard('tenant')->user();
            if (!$user || !in_array($user->role, ['admin', 'operador', 'gestor', 'contabilista'])) {
                return response()->json(['error' => 'Não autorizado'], 403);
            }

            $categoria = Categoria::find($id);

            if (!$categoria) {
                return response()->json(['error' => 'Categoria não encontrada'], 404);
            }

            $dados = $request->validate([
                'nome'           => 'sometimes|string|max:255',
                'descricao'      => 'nullable|string',
                'taxa_iva'       => 'nullable|numeric|in:0,5,14',
                'sujeito_iva'    => 'nullable|boolean',
                'status'         => 'nullable|in:ativo,inativo',
                'tipo'           => 'nullable|in:produto,servico',
            ]);

            if (!empty($dados)) {
                $categoria->update($dados);
            }

            // Recarregar a categoria para garantir dados atualizados
            $categoria->refresh();
            $categoria->loadCount('produtos');

                Log::info('Categoria ja esta' ,$dados);
            return response()->json([
                'message'   => 'Categoria actualizada com sucesso',
                'categoria' => $categoria,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] UPDATE ERROR', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /api/categorias/{categoria} (Soft Delete)
     */
    public function destroy($id)
    {
        try {
            $user = Auth::guard('tenant')->user();
            if (!$user || $user->role !== 'admin') {
                return response()->json(['error' => 'Apenas admin pode apagar'], 403);
            }

            $categoria = Categoria::find($id);

            if (!$categoria) {
                return response()->json(['error' => 'Categoria não encontrada'], 404);
            }

            $totalProdutosAtivos = $categoria->produtos()->where('status', 'ativo')->count();
            if ($totalProdutosAtivos > 0) {
                return response()->json([
                    'message' => "Não é possível: {$totalProdutosAtivos} produto(s) activo(s).",
                    'error'   => 'produtos_activos',
                ], 409);
            }

            $categoria->delete();

            return response()->json([
                'message' => 'Categoria eliminada com sucesso',
                'deleted' => true
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] DESTROY ERROR', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/categorias/{id}/restore
     * Restaura categoria deletada (soft delete)
     */
    public function restore($id)
    {
        try {
            $user = Auth::guard('tenant')->user();
            if (!$user || $user->role !== 'admin') {
                return response()->json(['error' => 'Apenas admin pode restaurar'], 403);
            }

            $categoria = Categoria::onlyTrashed()->find($id);

            if (!$categoria) {
                return response()->json(['error' => 'Categoria não encontrada na lixeira'], 404);
            }

            if (!$categoria->trashed()) {
                return response()->json(['error' => 'Categoria não está deletada'], 400);
            }

            $categoria->restore();
            $categoria->loadCount('produtos');

            return response()->json([
                'message'   => 'Categoria restaurada com sucesso',
                'categoria' => $categoria,
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] RESTORE ERROR', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /api/categorias/{id}/force
     * Remove permanentemente a categoria
     */
    public function forceDelete($id)
    {
        try {
            $user = Auth::guard('tenant')->user();
            if (!$user || $user->role !== 'admin') {
                return response()->json(['error' => 'Apenas admin pode eliminar permanentemente'], 403);
            }

            $categoria = Categoria::withTrashed()->find($id);

            if (!$categoria) {
                return response()->json(['error' => 'Categoria não encontrada'], 404);
            }

            // Verificar produtos mesmo os deletados
            $totalProdutos = $categoria->produtos()->withTrashed()->count();
            if ($totalProdutos > 0) {
                return response()->json([
                    'message' => "Não é possível: {$totalProdutos} produto(s) associado(s).",
                    'error'   => 'produtos_associados',
                ], 409);
            }

            $categoria->forceDelete();

            return response()->json([
                'message' => 'Categoria eliminada permanentemente com sucesso',
            ]);
        } catch (\Exception $e) {
            Log::error('[CategoriaController] FORCE DELETE ERROR', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
