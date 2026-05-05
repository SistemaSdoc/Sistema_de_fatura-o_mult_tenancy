<?php

namespace App\Http\Controllers;

use App\Models\Tenant\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * CategoriaController
 *
 * Alterações realizadas:
 *  - Melhor tratamento do guard 'tenant' no construtor
 *  - Logging mais claro para debug de autenticação
 *  - Uso correto de Auth::guard('tenant') em todo o controller
 *  - authorizeResource mantido, mas com middleware explícito
 */
class CategoriaController extends Controller
{
    public function __construct()
    {
        // Middleware explícito para garantir autenticação pelo tenant guard
        $this->middleware('auth:tenant');

        // Autorização via Policy para todas as actions do resource
        $this->authorizeResource(Categoria::class, 'categoria');

        Log::info('[CategoriaController] Construtor executado', [
            'tenant_check'      => Auth::guard('tenant')->check(),
            'tenant_user_id'    => Auth::guard('tenant')->id(),
            'landlord_check'    => Auth::guard('landlord')->check(),
            'default_guard'     => Auth::getDefaultDriver(),
            'session_id'        => session()->getId(),
            'session_tenant_id' => session('tenant_id'),
        ]);

        $user = Auth::guard('tenant')->user();

        Log::info('[CategoriaController] Utilizador autenticado (tenant)', [
            'user_id'    => $user?->id ?? 'null',
            'user_email' => $user?->email ?? 'null',
            'user_role'  => $user?->role ?? 'indefinido',
            'user_nome'  => $user?->nome ?? $user?->name ?? 'null',
            'tenant_db'  => config('database.connections.tenant.database') ?? 'null',
        ]);
    }

    /* =====================================================================
     | LISTAGEM
     | ================================================================== */

    public function index(Request $request)
    {
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

        if ($request->filled('taxa_iva')) {
            $query->where('taxa_iva', $request->taxa_iva);
        }

        if ($request->boolean('apenas_isentas')) {
            $query->where('sujeito_iva', false);
        }

        $categorias = $query->withCount('produtos')->get();

        return response()->json([
            'message'    => 'Lista de categorias carregada com sucesso',
            'categorias' => $categorias,
            'resumo' => [
                'total'        => $categorias->count(),
                'com_iva_14'   => $categorias->where('taxa_iva', 14)->count(),
                'com_iva_5'    => $categorias->where('taxa_iva', 5)->count(),
                'isentas'      => $categorias->where('sujeito_iva', false)->count(),
            ],
        ]);
    }

    public function paraSelectProdutos()
    {
        $categorias = Categoria::where('status', 'ativo')
            ->select('id', 'nome', 'tipo', 'taxa_iva', 'sujeito_iva', 'codigo_isencao')
            ->orderBy('nome')
            ->get()
            ->map(fn ($c) => [
                'id'             => $c->id,
                'nome'           => $c->nome,
                'tipo'           => $c->tipo,
                'taxa_iva'       => (float) $c->taxa_iva,
                'sujeito_iva'    => (bool) $c->sujeito_iva,
                'codigo_isencao' => $c->codigo_isencao,
                'label_iva'      => $c->labelTaxaIva(),
            ]);

        return response()->json([
            'message'    => 'Categorias para selecção',
            'categorias' => $categorias,
        ]);
    }

    /* =====================================================================
     | DETALHE
     | ================================================================== */

    public function show(Categoria $categoria)
    {
        $categoria->loadCount('produtos');

        return response()->json([
            'message'   => 'Categoria carregada com sucesso',
            'categoria' => array_merge($categoria->toArray(), [
                'label_iva'          => $categoria->labelTaxaIva(),
                'taxa_iva_efectiva'  => $categoria->taxaIvaEfectiva(),
                'total_produtos'     => $categoria->produtos_count,
            ]),
        ]);
    }

    /* =====================================================================
     | CRIAR
     | ================================================================== */

    public function store(Request $request)
    {
        $dados = $request->validate($this->regrasValidacao());

        // Garantir consistência de IVA
        if (isset($dados['sujeito_iva']) && !$dados['sujeito_iva']) {
            $dados['taxa_iva'] = 0.00;
        }

        if (isset($dados['taxa_iva']) && (float)$dados['taxa_iva'] === 0.0) {
            $dados['sujeito_iva'] = false;
        }

        $dados['status']       = $dados['status'] ?? 'ativo';
        $dados['tipo']         = $dados['tipo'] ?? 'produto';
        $dados['taxa_iva']     = $dados['taxa_iva'] ?? 14.00;
        $dados['sujeito_iva']  = $dados['sujeito_iva'] ?? true;
        
        // Usar o guard correto do tenant
        $dados['user_id'] = Auth::guard('tenant')->id();

        $categoria = Categoria::create($dados);

        Log::info('[CategoriaController] Categoria criada com sucesso', [
            'id'       => $categoria->id,
            'nome'     => $categoria->nome,
            'taxa_iva' => $categoria->taxa_iva,
            'user_id'  => $dados['user_id'],
        ]);

        return response()->json([
            'message'   => 'Categoria criada com sucesso',
            'categoria' => $categoria,
        ], 201);
    }

    /* =====================================================================
     | ACTUALIZAR
     | ================================================================== */

    public function update(Request $request, Categoria $categoria)
    {
        $dados = $request->validate($this->regrasValidacaoUpdate());

        if (isset($dados['sujeito_iva']) && !$dados['sujeito_iva']) {
            $dados['taxa_iva'] = 0.00;
        }

        if (isset($dados['taxa_iva']) && (float)$dados['taxa_iva'] === 0.0) {
            $dados['sujeito_iva'] = false;
        }

        $taxaAnterior = $categoria->taxa_iva;

        $categoria->update($dados);

        $aviso = null;
        if (isset($dados['taxa_iva']) && $dados['taxa_iva'] != $taxaAnterior) {
            $totalProdutos = $categoria->produtos()->count();
            $aviso = $totalProdutos > 0
                ? "A taxa de IVA foi alterada. {$totalProdutos} produto(s) associado(s) passarão a usar a nova taxa ({$categoria->taxa_iva}%) automaticamente."
                : null;
        }

        return response()->json([
            'message'   => 'Categoria actualizada com sucesso',
            'categoria' => $categoria->fresh(),
            'aviso'     => $aviso,
        ]);
    }

    /* =====================================================================
     | APAGAR
     | ================================================================== */

    public function destroy(Categoria $categoria)
    {
        $totalProdutosAtivos = $categoria->produtos()->where('status', 'ativo')->count();

        if ($totalProdutosAtivos > 0) {
            return response()->json([
                'message' => "Não é possível eliminar: existem {$totalProdutosAtivos} produto(s) activo(s) nesta categoria.",
                'error'   => 'produtos_activos',
            ], 409);
        }

        $categoria->delete();

        return response()->json([
            'message' => 'Categoria eliminada com sucesso',
        ]);
    }

    /* =====================================================================
     | HELPERS PRIVADOS
     | ================================================================== */

    private function regrasValidacao(): array
    {
        return [
            'nome'           => 'required|string|max:255',
            'descricao'      => 'nullable|string',
            'status'         => 'nullable|in:ativo,inativo',
            'tipo'           => 'nullable|in:produto,servico',
            'taxa_iva'       => 'nullable|numeric|in:0,5,14',
            'sujeito_iva'    => 'nullable|boolean',
            'codigo_isencao' => [
                'nullable',
                'string',
                'in:M00,M01,M02,M03,M04,M05,M06,M99',
                function ($attribute, $value, $fail) {
                    if ($value && request()->boolean('sujeito_iva')) {
                        $fail('Código de isenção não pode ser definido quando o produto está sujeito a IVA.');
                    }
                },
            ],
        ];
    }

    private function regrasValidacaoUpdate(): array
    {
        return [
            'nome'           => 'sometimes|string|max:255',
            'descricao'      => 'nullable|string',
            'status'         => 'nullable|in:ativo,inativo',
            'tipo'           => 'nullable|in:produto,servico',
            'taxa_iva'       => 'nullable|numeric|in:0,5,14',
            'sujeito_iva'    => 'nullable|boolean',
            'codigo_isencao' => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
        ];
    }
}