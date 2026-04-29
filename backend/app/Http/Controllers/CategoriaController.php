<?php

namespace App\Http\Controllers;

use App\Models\Tenant\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * CategoriaController
 *
 * Alterações:
 *  - Adicionada validação de taxa_iva, sujeito_iva e codigo_isencao
 *  - taxa_iva é agora o campo central — herdado por todos os produtos da categoria
 *  - Serviços NÃO usam este controller para IVA (têm o seu próprio)
 *
 * Taxas de IVA válidas em Angola (AGT):
 *  - 0%  → isentos (produtos agrícolas, medicamentos)
 *  - 5%  → cesta básica
 *  - 14% → taxa geral
 */
class CategoriaController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Categoria::class, 'categoria');
            Log::info('[Categoria nova] Verificação de autenticação', [
        'tenant_check' => Auth::guard('tenant')->check(),
        'landlord_check' => Auth::guard('landlord')->check(),
        'tenant_user_id' => Auth::guard('tenant')->id(),
        'landlord_user_id' => Auth::guard('landlord')->id(),
        'session_id' => session()->getId(),
        'session_tenant_id' => session('tenant_id'),
    ]);

        $user = Auth::guard('tenant')->user();
    
    // 🔍 LOG 2: Dados do utilizador do tenant (se existir)
    Log::info('[Categoria] Utilizador autenticado (tenant)', [
        'user_id' => $user?->id ?? 'null',
        'user_email' => $user?->email ?? 'null',
        'user_role' => $user?->role ?? 'indefinido',
        'user_nome' => $user?->nome ?? $user?->name ?? 'null',
        'tenant_db' => config('database.connections.tenant.database'),
    ]);
    }

    /* =====================================================================
     | LISTAGEM
     | ================================================================== */

    /**
     * Listar todas as categorias activas com informação de IVA.
     */
    public function index(Request $request)
    {


        $query = Categoria::query();

        // Filtros opcionais
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

        // Filtro por IVA
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

    /**
     * Listar categorias para dropdown/select no formulário de produtos.
     * Retorna apenas os campos necessários para o frontend.
     */
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
                'label_iva'      => $c->labelTaxaIva(), // ex: "14%" ou "Isento (0%)"
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

        // Garantir consistência: se não sujeito a IVA, taxa = 0
        if (isset($dados['sujeito_iva']) && ! $dados['sujeito_iva']) {
            $dados['taxa_iva'] = 0.00;
        }

        // Se taxa = 0 e sujeito_iva não foi enviado, inferir isenção
        if (isset($dados['taxa_iva']) && (float) $dados['taxa_iva'] === 0.0) {
            $dados['sujeito_iva'] = false;
        }

        $dados['status']  = $dados['status'] ?? 'ativo';
        $dados['tipo']    = $dados['tipo'] ?? 'produto';
        $dados['taxa_iva'] = $dados['taxa_iva'] ?? 14.00;
        $dados['sujeito_iva'] = $dados['sujeito_iva'] ?? true;
        $dados['user_id'] = Auth::id();

        $categoria = Categoria::create($dados);

        Log::info('[CategoriaController] Categoria criada', [
            'id'       => $categoria->id,
            'nome'     => $categoria->nome,
            'taxa_iva' => $categoria->taxa_iva,
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

        // Consistência sujeito_iva / taxa_iva
        if (isset($dados['sujeito_iva']) && ! $dados['sujeito_iva']) {
            $dados['taxa_iva'] = 0.00;
        }

        if (isset($dados['taxa_iva']) && (float) $dados['taxa_iva'] === 0.0) {
            $dados['sujeito_iva'] = false;
        }

        $taxaAnterior = $categoria->taxa_iva;

        $categoria->update($dados);

        // Avisar se a taxa de IVA mudou (pode afectar produtos existentes)
        $aviso = null;
        if (isset($dados['taxa_iva']) && $dados['taxa_iva'] != $taxaAnterior) {
            $totalProdutos = $categoria->produtos()->count();
            $aviso = $totalProdutos > 0
                ? "A taxa de IVA foi alterada. {$totalProdutos} produto(s) associado(s) passarão a usar a nova taxa ({$categoria->taxa_iva}%) automaticamente."
                : null;

            Log::info('[CategoriaController] Taxa IVA alterada', [
                'categoria_id'  => $categoria->id,
                'taxa_anterior' => $taxaAnterior,
                'taxa_nova'     => $dados['taxa_iva'],
                'produtos'      => $totalProdutos,
            ]);
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
        // Verificar se tem produtos activos associados
        $totalProdutosAtivos = $categoria->produtos()->where('status', 'ativo')->count();

        if ($totalProdutosAtivos > 0) {
            return response()->json([
                'message' => "Não é possível eliminar: existem {$totalProdutosAtivos} produto(s) activo(s) nesta categoria. Inactivar os produtos primeiro.",
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

    /**
     * Regras de validação para criar categoria.
     * Taxas válidas Angola: 0% (isento), 5% (cesta básica), 14% (geral).
     */
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
                // Código de isenção só faz sentido quando não sujeito a IVA
                function ($attribute, $value, $fail) {
                    if ($value && request()->boolean('sujeito_iva')) {
                        $fail('Código de isenção não pode ser definido quando o produto está sujeito a IVA.');
                    }
                },
            ],
        ];
    }

    /**
     * Regras de validação para actualizar categoria.
     */
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