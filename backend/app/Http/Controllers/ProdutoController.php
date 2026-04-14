<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\Produto;
use App\Models\Categoria;
use App\Models\Fornecedor;
use App\Services\ProdutoService;
use Carbon\Carbon;
use Throwable;

/**
 * ProdutoController
 *
 * Delega toda a lógica ao ProdutoService.
 * O controller faz apenas: validação de request, autorização e resposta JSON.
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
        $this->authorize('viewAny', Produto::class);

        $filtros = $this->extrairFiltros($request);
        $produtos = $this->produtoService->listarProdutos($filtros);

        return response()->json([
            'message'  => 'Lista de produtos carregada com sucesso',
            'produtos' => $produtos,
        ]);
    }

    public function indexWithTrashed(Request $request)
    {
        $this->authorize('viewAny', Produto::class);

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
        ]);
    }

    public function indexOnlyTrashed(Request $request)
    {
        $this->authorize('viewAny', Produto::class);

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

        $this->authorize('view', $produto);

        return response()->json([
            'message' => 'Produto carregado com sucesso',
            'produto' => $produto,
        ]);
    }

    /* =====================================================================
     | CRIAR
     | ================================================================== */

    public function store(Request $request)
    {
        $this->authorize('create', Produto::class);

        Log::info('[ProdutoController] Dados recebidos para validação:', $request->all());

        try {
            $dados = $request->validate($this->regrasValidacao($request->tipo));
            Log::info('[ProdutoController] Dados validados com sucesso:', $dados);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('[ProdutoController] ERRO DE VALIDAÇÃO:', [
                'errors' => $e->errors(),
                'data' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        }

        try {
            $produto = $this->produtoService->criarProduto($dados);

            return response()->json([
                'message' => $dados['tipo'] === 'servico' ? 'Serviço criado com sucesso' : 'Produto criado com sucesso',
                'produto' => $produto->fresh(),
            ], 201);

        } catch (\Exception $e) {
            Log::error('[PRODUTO STORE ERROR]', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Erro ao criar produto', 'error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | ACTUALIZAR - CORRIGIDO PARA EVITAR ERRO 422
     | ================================================================== */

    public function update(Request $request, string $id)
    {
        Log::info('[ProdutoController] UPDATE - Dados recebidos:', [
            'id' => $id,
            'all_data' => $request->all(),
            'method' => $request->method(),
            'content_type' => $request->header('Content-Type')
        ]);

        try {
            $produto = Produto::findOrFail($id);
            $this->authorize('update', $produto);

            // ✅ CORREÇÃO: Determinar tipo corretamente
            $tipo = $request->input('tipo', $produto->tipo);
            
            // Validar se tipo é válido, senão usar o do produto
            if (!in_array($tipo, ['produto', 'servico'])) {
                $tipo = $produto->tipo;
            }

            Log::info('[ProdutoController] UPDATE - Tipo determinado:', [
                'tipo' => $tipo,
                'produto_tipo_original' => $produto->tipo
            ]);

            // ✅ CORREÇÃO: Usar regras de validação apropriadas
            $regras = $this->regrasValidacaoUpdate($tipo, $id);
            
            Log::info('[ProdutoController] UPDATE - Regras de validação:', $regras);

            try {
                $dados = $request->validate($regras);
                Log::info('[ProdutoController] UPDATE - Dados validados:', $dados);
            } catch (\Illuminate\Validation\ValidationException $e) {
                Log::error('[ProdutoController] UPDATE - Erro de validação:', [
                    'errors' => $e->errors(),
                    'data' => $request->all(),
                    'regras_usadas' => $regras
                ]);
                
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors' => $e->errors()
                ], 422);
            }

            $produto = $this->produtoService->editarProduto($id, $dados);

            return response()->json([
                'message' => 'Produto actualizado com sucesso',
                'produto' => $produto,
            ]);

        } catch (ModelNotFoundException $e) {
            Log::error('[ProdutoController] UPDATE - Produto não encontrado:', ['id' => $id]);
            return response()->json(['message' => 'Produto não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[PRODUTO UPDATE ERROR]', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erro ao actualizar produto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /* =====================================================================
     | ESTADO
     | ================================================================== */

    public function alterarStatus(string $id, Request $request)
    {
        $produto = Produto::findOrFail($id);
        $this->authorize('update', $produto);

        $status = $request->validate(['status' => 'required|in:ativo,inativo'])['status'];
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
            $this->authorize('delete', $produto);

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
            $this->authorize('restore', $produto);

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
            $this->authorize('forceDelete', $produto);

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
        $this->authorize('viewAny', Produto::class);

        try {
            $dataInicio = $request->data_inicio;
            $dataFim    = $request->data_fim;

            $queryBase = fn ($q) => $q
                ->join('produtos', 'itens_venda.produto_id', '=', 'produtos.id')
                ->join('vendas', 'itens_venda.venda_id', '=', 'vendas.id')
                ->where('vendas.status', '!=', 'cancelada')
                ->when($dataInicio, fn ($q) => $q->whereDate('vendas.data_venda', '>=', $dataInicio))
                ->when($dataFim,    fn ($q) => $q->whereDate('vendas.data_venda', '<=', $dataFim));

            // Top 10 — todos os tipos
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

            // Top 10 serviços (com retenção)
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
                    'produtos_mais_vendidos'   => $maisVendidos,
                    'servicos_mais_vendidos'   => $servicosMaisVendidos,
                    'total_produtos_ativos'    => Produto::where('tipo', 'produto')->where('status', 'ativo')->count(),
                    'total_servicos_ativos'    => Produto::where('tipo', 'servico')->where('status', 'ativo')->count(),
                    'total_servicos_com_retencao' => Produto::where('tipo', 'servico')->where('taxa_retencao', '>', 0)->count(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('[PRODUTO ESTATISTICAS ERROR]', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erro ao carregar estatísticas', 'error' => $e->getMessage()], 500);
        }
    }

    /* =====================================================================
     | HELPERS PRIVADOS
     | ================================================================== */

    /**
     * Regras de validação para CRIAR (store).
     */
    private function regrasValidacao(string $tipo, ?string $id = null): array
    {
        $base = [
            'tipo'        => 'required|in:produto,servico',
            'nome'        => 'required|string|max:255',
            'descricao'   => 'nullable|string',
            'preco_venda' => 'required|numeric|min:0',
            'taxa_iva'    => 'nullable|numeric',
            'sujeito_iva' => 'nullable|boolean',
            'status'      => 'nullable|in:ativo,inativo',
            
            // NOVOS: Campos de cálculo de preço (opcionais)
            'tipo_preco'           => 'nullable|in:fixo,margem,markup',
            'despesas_adicionais'  => 'nullable|numeric|min:0',
            'margem_lucro'         => 'nullable|numeric|min:0|max:99.99',
            'markup'               => 'nullable|numeric|min:0',
        ];

        if ($tipo === 'produto') {
            return array_merge($base, [
                'categoria_id'   => 'required|uuid|exists:categorias,id',
                'fornecedor_id'  => 'nullable|uuid|exists:fornecedores,id',
                'codigo'         => 'nullable|string|max:50|unique:produtos,codigo',
                'preco_compra'   => 'required|numeric|min:0',
                'custo_medio'    => 'nullable|numeric|min:0',
                'estoque_atual'  => 'nullable|integer|min:0',
                'estoque_minimo' => 'nullable|integer|min:0',
            ]);
        }

        // Serviço
        return array_merge($base, [
            'taxa_retencao'    => 'nullable|numeric|in:0,2,5,6.5,10,15',
            'codigo_isencao'   => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
            'duracao_estimada' => 'required|string|max:50',
            'unidade_medida'   => 'required|in:hora,dia,semana,mes',
        ]);
    }

    /**
     * ✅ NOVO: Regras de validação específicas para UPDATE.
     * Diferença: campos opcionais e regras de unique ignorando o próprio registo.
     */
    private function regrasValidacaoUpdate(string $tipo, string $id): array
    {
        // ✅ CORREÇÃO: Na atualização, a maioria dos campos é opcional (sometimes)
        // pois o frontend pode enviar apenas os campos que foram modificados
        $base = [
            'tipo'        => 'sometimes|in:produto,servico',
            'nome'        => 'sometimes|string|max:255',
            'descricao'   => 'nullable|string',
            'preco_venda' => 'sometimes|numeric|min:0',
            'taxa_iva'    => 'nullable|numeric',
            'sujeito_iva' => 'nullable|boolean',
            'status'      => 'nullable|in:ativo,inativo',
            
            // NOVOS: Campos de cálculo de preço (opcionais)
            'tipo_preco'           => 'nullable|in:fixo,margem,markup',
            'despesas_adicionais'  => 'nullable|numeric|min:0',
            'margem_lucro'         => 'nullable|numeric|min:0|max:99.99',
            'markup'               => 'nullable|numeric|min:0',
        ];

        if ($tipo === 'produto') {
            return array_merge($base, [
                'categoria_id'   => 'sometimes|uuid|exists:categorias,id',
                'fornecedor_id'  => 'nullable|uuid|exists:fornecedores,id',
                // ✅ CORREÇÃO: Ignorar o próprio ID na validação de unique
                'codigo'         => 'nullable|string|max:50|unique:produtos,codigo,' . $id,
                'preco_compra'   => 'sometimes|numeric|min:0',
                'custo_medio'    => 'nullable|numeric|min:0',
                'estoque_atual'  => 'nullable|integer|min:0',
                'estoque_minimo' => 'nullable|integer|min:0',
            ]);
        }

        // Serviço
        return array_merge($base, [
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