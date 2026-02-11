<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Produto;
use App\Models\Categoria;
use App\Models\Fornecedor;
use App\Services\ProdutoService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\MovimentoStock;
use Illuminate\Database\QueryException;
use Illuminate\Database\Eloquent\ModelNotFoundException; // ✅ ADICIONADO
use Throwable; // ✅ ADICIONADO

class ProdutoController extends Controller
{
    protected $produtoService;

    public function __construct(ProdutoService $produtoService)
    {
        $this->produtoService = $produtoService;
    }

    /**
     * Listar produtos ativos (não deletados)
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Produto::class);

        $query = Produto::query();

        // Filtros
        if ($request->has('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->categoria_id);
        }
        if ($request->has('busca')) {
            $busca = $request->busca;
            $query->where(function ($q) use ($busca) {
                $q->where('nome', 'like', "%{$busca}%")
                    ->orWhere('codigo', 'like', "%{$busca}%")
                    ->orWhere('descricao', 'like', "%{$busca}%");
            });
        }
        if ($request->boolean('estoque_baixo')) {
            $query->estoqueBaixo();
        }
        if ($request->boolean('sem_estoque')) {
            $query->semEstoque();
        }

        // Ordenação
        $ordenar = $request->get('ordenar', 'nome');
        $direcao = $request->get('direcao', 'asc');
        $query->orderBy($ordenar, $direcao);

        // Paginação ou todos
        if ($request->boolean('paginar')) {
            $perPage = $request->get('per_page', 15);
            $produtos = $query->paginate($perPage);
        } else {
            $produtos = $query->get();
        }

        return response()->json([
            'message' => 'Lista de produtos carregada com sucesso',
            'produtos' => $produtos
        ]);
    }

    /**
     * Listar todos os produtos (ativos + deletados) - para admin
     */
    public function indexWithTrashed(Request $request)
    {
        $this->authorize('viewAny', Produto::class);

        $query = Produto::withTrashed();

        // Aplicar mesmos filtros do index
        if ($request->has('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->has('busca')) {
            $busca = $request->busca;
            $query->where(function ($q) use ($busca) {
                $q->where('nome', 'like', "%{$busca}%")
                    ->orWhere('codigo', 'like', "%{$busca}%");
            });
        }

        $produtos = $query->get();

        return response()->json([
            'message' => 'Lista completa de produtos',
            'produtos' => $produtos,
            'total' => $produtos->count(),
            'ativos' => $produtos->whereNull('deleted_at')->count(),
            'deletados' => $produtos->whereNotNull('deleted_at')->count(),
            'produtos_fisicos' => $produtos->where('tipo', 'produto')->count(),
            'servicos' => $produtos->where('tipo', 'servico')->count(),
        ]);
    }

    /**
     * Listar APENAS produtos deletados (lixeira)
     */
    public function indexOnlyTrashed(Request $request)
    {
        $this->authorize('viewAny', Produto::class);

        $query = Produto::onlyTrashed();

        if ($request->has('busca')) {
            $busca = $request->busca;
            $query->where(function ($q) use ($busca) {
                $q->where('nome', 'like', "%{$busca}%")
                    ->orWhere('codigo', 'like', "%{$busca}%");
            });
        }

        $produtos = $request->boolean('paginar')
            ? $query->paginate($request->get('per_page', 15))
            : $query->get();

        return response()->json([
            'message' => 'Produtos deletados',
            'produtos' => $produtos,
            'total_deletados' => $produtos instanceof \Illuminate\Pagination\LengthAwarePaginator
                ? $produtos->total()
                : $produtos->count(),
        ]);
    }

    /**
     * Mostrar produto específico
     */
    public function show($id)
    {
        $produto = Produto::withTrashed()
            ->with(['categoria', 'fornecedor', 'movimentosStock' => function ($q) {
                $q->limit(10);
            }])
            ->findOrFail($id);

        $this->authorize('view', $produto);

        return response()->json([
            'message' => 'Produto carregado com sucesso',
            'produto' => $produto
        ]);
    }

    /**
     * Criar novo produto
     */
    public function store(Request $request)
    {
        $this->authorize('create', Produto::class);

        // Validação base
        $regras = [
            'tipo' => 'required|in:produto,servico',
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'preco_venda' => 'required|numeric|min:0',
            'taxa_iva' => 'nullable|numeric|min:0|max:100',
            'sujeito_iva' => 'nullable|boolean',
            'status' => 'nullable|in:ativo,inativo',
        ];

        // Regras específicas para produtos
        if ($request->tipo === 'produto') {
            $regras['categoria_id'] = 'required|uuid|exists:categorias,id';
            $regras['fornecedor_id'] = 'nullable|uuid|exists:fornecedores,id';
            $regras['codigo'] = 'nullable|string|max:50|unique:produtos,codigo';
            $regras['preco_compra'] = 'required|numeric|min:0';
            $regras['custo_medio'] = 'nullable|numeric|min:0';
            $regras['estoque_atual'] = 'nullable|integer|min:0';
            $regras['estoque_minimo'] = 'nullable|integer|min:0';
        } else {
            // Regras para serviços
            $regras['retencao'] = 'nullable|numeric|min:0|max:100';
            $regras['duracao_estimada'] = 'required|string|max:50';
            $regras['unidade_medida'] = 'required|in:hora,dia,semana,mes';
        }

        $dados = $request->validate($regras);

        // Adicionar user_id do usuário autenticado
        $dados['user_id'] = auth()->id();

        // Definir valores padrão
        $dados['taxa_iva'] = $dados['taxa_iva'] ?? 14;
        $dados['status'] = $dados['status'] ?? 'ativo';
        $dados['sujeito_iva'] = $dados['sujeito_iva'] ?? true;

        // Valores padrão para produtos
        if ($dados['tipo'] === 'produto') {
            $dados['estoque_atual'] = $dados['estoque_atual'] ?? 0;
            $dados['estoque_minimo'] = $dados['estoque_minimo'] ?? 5;
            $dados['custo_medio'] = $dados['custo_medio'] ?? ($dados['preco_compra'] ?? 0);

            // Limpar campos de serviço
            $dados['retencao'] = null;
            $dados['duracao_estimada'] = null;
            $dados['unidade_medida'] = null;
        } else {
            // Valores para serviços
            $dados['categoria_id'] = null;
            $dados['fornecedor_id'] = null;
            $dados['codigo'] = null;
            $dados['preco_compra'] = 0;
            $dados['custo_medio'] = 0;
            $dados['estoque_atual'] = 0;
            $dados['estoque_minimo'] = 0;
        }

        try {
            DB::beginTransaction();

            $produto = Produto::create($dados);

            // Se houver estoque inicial, registrar movimento
            if ($dados['tipo'] === 'produto' && $dados['estoque_atual'] > 0) {
                MovimentoStock::create([
                    'produto_id' => $produto->id,
                    'user_id' => auth()->id(),
                    'tipo' => 'entrada',
                    'tipo_movimento' => 'ajuste',
                    'quantidade' => $dados['estoque_atual'],
                    'observacao' => 'Estoque inicial',
                    'custo_medio' => $produto->custo_medio,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => $dados['tipo'] === 'servico' ? 'Serviço criado com sucesso' : 'Produto criado com sucesso',
                'produto' => $produto->fresh()
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[PRODUTO STORE ERROR]', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Erro ao criar produto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar produto
     */
    public function update(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);

        $this->authorize('update', $produto);

        // Validação condicional baseada no tipo atual ou novo tipo
        $tipo = $request->get('tipo', $produto->tipo);

        $regras = [
            'tipo' => 'sometimes|required|in:produto,servico',
            'nome' => 'sometimes|required|string|max:255',
            'descricao' => 'nullable|string',
            'preco_venda' => 'sometimes|required|numeric|min:0',
            'taxa_iva' => 'nullable|numeric|min:0|max:100',
            'sujeito_iva' => 'nullable|boolean',
            'status' => 'nullable|in:ativo,inativo',
        ];

        if ($tipo === 'produto') {
            $regras['categoria_id'] = 'sometimes|required|uuid|exists:categorias,id';
            $regras['fornecedor_id'] = 'nullable|uuid|exists:fornecedores,id';
            $regras['codigo'] = 'nullable|string|max:50|unique:produtos,codigo,' . $id;
            $regras['preco_compra'] = 'sometimes|required|numeric|min:0';
            $regras['custo_medio'] = 'nullable|numeric|min:0';
            $regras['estoque_minimo'] = 'nullable|integer|min:0';
        } else {
            $regras['retencao'] = 'nullable|numeric|min:0|max:100';
            $regras['duracao_estimada'] = 'sometimes|required|string|max:50';
            $regras['unidade_medida'] = 'sometimes|required|in:hora,dia,semana,mes';
        }

        $dados = $request->validate($regras);

        try {
            DB::beginTransaction();

            // Se mudando de produto para serviço
            if (isset($dados['tipo']) && $dados['tipo'] === 'servico' && $produto->tipo === 'produto') {
                // Verificar se tem movimentações de estoque
                if ($produto->movimentosStock()->exists()) {
                    DB::rollBack();
                    return response()->json([
                        'message' => 'Não é possível converter produto com movimentações de estoque para serviço'
                    ], 422);
                }
            }

            $produto->update($dados);
            $produto->refresh();

            DB::commit();

            return response()->json([
                'message' => 'Produto atualizado com sucesso',
                'produto' => $produto
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[PRODUTO UPDATE ERROR]', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Erro ao atualizar produto',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Alterar status (ativo/inativo)
     */
    public function alterarStatus($id, Request $request)
    {
        $produto = Produto::findOrFail($id);

        $this->authorize('update', $produto);

        $status = $request->validate([
            'status' => 'required|in:ativo,inativo'
        ])['status'];

        $produto->update(['status' => $status]);
        $produto->refresh();

        return response()->json([
            'message' => 'Status do produto atualizado',
            'produto' => $produto
        ]);
    }

    /**
     * Deletar produto (SOFT DELETE) - VERSÃO CORRIGIDA
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            // Buscar incluindo deletados para verificar se já está deletado
            $produto = Produto::withTrashed()->find($id);

            if (!$produto) {
                return response()->json([
                    'message' => 'Produto não encontrado',
                ], 404);
            }

            $this->authorize('delete', $produto);

            if ($produto->trashed()) {
                return response()->json([
                    'message' => 'Produto já está deletado',
                    'soft_deleted' => true,
                ], 400);
            }

            // Verificar se tem vendas pendentes
            $vendasPendentes = $produto->itensVenda()
                ->whereHas('venda', function ($q) {
                    $q->where('status', 'pendente');
                })->exists();

            if ($vendasPendentes) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Não é possível deletar produto com vendas pendentes',
                ], 409);
            }

            // ✅ NOVO: Verificar se tem movimentações de stock
            if ($produto->movimentosStock()->exists()) {
                Log::warning('[PRODUTO DELETE] Produto com movimentações sendo deletado', [
                    'produto_id' => $produto->id,
                    'nome' => $produto->nome,
                    'total_movimentacoes' => $produto->movimentosStock()->count()
                ]);

                // Opcional: Impedir deleção se houver movimentações
                // Descomente se quiser impedir:
                /*
                DB::rollBack();
                return response()->json([
                    'message' => 'Não é possível deletar produto com histórico de movimentações de estoque',
                    'suggestion' => 'Altere o status para "inativo" para descontinuar o produto'
                ], 409);
                */
            }

            $produto->delete();

            DB::commit();

            Log::info('[PRODUTO DELETE]', [
                'id' => $produto->id,
                'nome' => $produto->nome,
                'deleted_at' => $produto->deleted_at,
                'trashed' => $produto->trashed()
            ]);

            return response()->json([
                'message' => 'Produto deletado com sucesso',
                'soft_deleted' => true,
                'id' => $produto->id,
                'deleted_at' => $produto->deleted_at,
            ]);
        } catch (QueryException $e) {
            DB::rollBack();

            // Verifica se é erro de constraint de foreign key
            if ($e->getCode() == 23000 || str_contains($e->getMessage(), 'foreign key constraint')) {
                Log::error('[PRODUTO DELETE] Foreign key constraint violation', [
                    'produto_id' => $id,
                    'error' => $e->getMessage()
                ]);

                return response()->json([
                    'message' => 'Não é possível deletar este produto pois existem registros vinculados',
                    'error' => 'constraint_violation',
                    'details' => 'O produto possui histórico que impede a exclusão. Considere inativar o produto alterando o status.'
                ], 409);
            }

            return response()->json([
                'message' => 'Erro no banco de dados ao deletar produto',
                'error' => $e->getMessage()
            ], 500);
        } catch (Throwable $e) { // ✅ ALTERADO de \Throwable para Throwable (com import)
            DB::rollBack();

            Log::error('[PRODUTO DELETE ERROR]', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Erro ao deletar produto',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Restaurar produto deletado - VERSÃO CORRIGIDA ✅
     */
    public function restore($id)
    {
        try {
            DB::beginTransaction();

            $produto = Produto::withTrashed()->findOrFail($id);

            $this->authorize('restore', $produto);

            if (!$produto->trashed()) {
                return response()->json([
                    'message' => 'Produto não está deletado',
                ], 400);
            }

            // ✅ CORREÇÃO: Verificar se categoria existe de forma mais segura
            if ($produto->categoria_id) {
                $categoriaExiste = Categoria::withTrashed()
                    ->where('id', $produto->categoria_id)
                    ->exists();

                if (!$categoriaExiste) {
                    DB::rollBack();
                    return response()->json([
                        'message' => 'Não é possível restaurar: categoria associada foi removida permanentemente',
                        'suggestion' => 'Associe uma nova categoria ao produto antes de restaurar'
                    ], 422);
                }
            }

            // ✅ CORREÇÃO: Verificar também o fornecedor se existir
            if ($produto->fornecedor_id) {
                $fornecedorExiste = Fornecedor::withTrashed()
                    ->where('id', $produto->fornecedor_id)
                    ->exists();

                if (!$fornecedorExiste) {
                    DB::rollBack();
                    return response()->json([
                        'message' => 'Não é possível restaurar: fornecedor associado foi removido permanentemente',
                        'suggestion' => 'Remova o fornecedor do produto ou associe um novo antes de restaurar'
                    ], 422);
                }
            }

            $produto->restore();

            DB::commit();

            Log::info('[PRODUTO RESTORE]', [
                'id' => $produto->id,
                'nome' => $produto->nome,
                'restored_at' => now()
            ]);

            return response()->json([
                'message' => 'Produto restaurado com sucesso',
                'produto' => $produto->fresh(['categoria', 'fornecedor']),
            ]);
        } catch (ModelNotFoundException $e) { // ✅ CORRIGIDO: Usando a classe importada
            DB::rollBack();
            return response()->json([
                'message' => 'Produto não encontrado',
            ], 404);
        } catch (Throwable $e) { // ✅ CORRIGIDO: Usando a classe importada
            DB::rollBack();
            Log::error('[PRODUTO RESTORE ERROR]', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Erro ao restaurar produto',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remover produto permanentemente (FORCE DELETE)
     */
    public function forceDelete($id)
    {
        try {
            $produto = Produto::withTrashed()->findOrFail($id);

            $this->authorize('forceDelete', $produto);

            if ($produto->itensVenda()->exists() || $produto->itensCompra()->exists()) {
                return response()->json([
                    'message' => 'Não é possível remover permanentemente um produto com vendas/compras associadas',
                ], 409);
            }

            if ($produto->movimentosStock()->exists()) {
                return response()->json([
                    'message' => 'Não é possível remover permanentemente um produto com movimentações de stock',
                ], 409);
            }

            $nome = $produto->nome;
            $produto->forceDelete();

            Log::info('[PRODUTO FORCE DELETE]', [
                'id' => $id,
                'nome' => $nome,
                'deleted_permanently' => true
            ]);

            return response()->json([
                'message' => 'Produto removido permanentemente',
                'id' => $id
            ]);
        } catch (QueryException $e) {
            Log::error('[PRODUTO FORCE DELETE] Database error', [
                'produto_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Erro ao remover produto permanentemente',
                'error' => 'Erro de banco de dados: ' . $e->getMessage()
            ], 500);
        } catch (Throwable $e) { // ✅ CORRIGIDO
            Log::error('[PRODUTO FORCE DELETE ERROR]', [
                'produto_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Erro ao remover produto',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
