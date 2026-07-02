<?php

namespace App\Http\Controllers;

use App\Models\Shared\Compra as SharedCompra;
use App\Models\Tenant\Compra as TenantCompra;
use App\Models\Shared\Fornecedor as SharedFornecedor;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Tenant\Fornecedor as TenantFornecedor;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use App\Services\CompraService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

/**
 * CompraController
 *
 * ✅ SUPORTA AMBOS OS MODOS:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 */
class CompraController extends Controller
{
    protected CompraService $compraService;
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct(CompraService $compraService)
    {
        $this->compraService = $compraService;

        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');

        Log::debug('[CompraController] Inicializado', [
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
        Log::debug('[CompraController] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[CompraController] Empresa não identificada.');
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
            Log::error('[CompraController] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[CompraController] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[CompraController] Acesso verificado com sucesso', [
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

    /* =====================================================================
     | QUERY HELPERS
     | ================================================================== */

    /**
     * Query com scope para fornecedores (apenas colectivo)
     */
    protected function queryFornecedores()
    {
        if ($this->isColectivo()) {
            return SharedFornecedor::doTenant();
        }
        return TenantFornecedor::query();
    }

    /**
     * Query com scope para produtos (apenas colectivo)
     */
    protected function queryProdutos()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    /**
     * Verifica se fornecedor existe no tenant
     */
    protected function fornecedorExiste(string $id): bool
    {
        return $this->queryFornecedores()->where('id', $id)->exists();
    }

    /**
     * Verifica se produto existe no tenant
     */
    protected function produtoExiste(string $id): bool
    {
        return $this->queryProdutos()->where('id', $id)->exists();
    }

    /* =====================================================================
     | MÉTODOS DO CONTROLLER
     | ================================================================== */

    /**
     * Listar todas as compras
     */
    public function index()
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $compras = $this->compraService->listarCompras();

            return response()->json([
                'success' => true,
                'message' => 'Lista de compras carregada com sucesso',
                'data' => $compras,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CompraController::index] Erro ao listar compras', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar compras',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar uma compra específica
     */
    public function show($id)
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $compra = $this->compraService->buscarCompra($id);

            return response()->json([
                'success' => true,
                'message' => 'Compra carregada com sucesso',
                'data' => $compra,
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Compra não encontrada',
            ], 404);
        } catch (\Exception $e) {
            Log::error('[CompraController::show] Erro ao buscar compra', [
                'compra_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar compra',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar nova compra
     */
    public function store(Request $request)
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            // ⭐ VALIDAÇÃO COM SCOPE DO TENANT
            $dados = $request->validate([
                'fornecedor_id' => [
                    'required',
                    'uuid',
                    function ($attribute, $value, $fail) {
                        if (!$this->fornecedorExiste($value)) {
                            $fail('O fornecedor selecionado não existe ou não pertence à empresa.');
                        }
                    },
                ],
                'data' => 'required|date',
                'tipo_documento' => 'nullable|string|max:50',
                'numero_documento' => 'nullable|string|max:50',
                'data_emissao' => 'nullable|date',
                'validado_fiscalmente' => 'nullable|boolean',
                'desconto' => 'nullable|numeric|min:0',
                'itens' => 'required|array|min:1',
                'itens.*.produto_id' => [
                    'required',
                    'uuid',
                    function ($attribute, $value, $fail) {
                        if (!$this->produtoExiste($value)) {
                            $fail('O produto selecionado não existe ou não pertence à empresa.');
                        }
                    },
                ],
                'itens.*.quantidade' => 'required|integer|min:1',
                'itens.*.preco_compra' => 'required|numeric|min:0',
            ]);

            // ⭐ USAR O SERVICE
            $compra = $this->compraService->criarCompra($dados);

            Log::info('[CompraController::store] Compra criada com sucesso', [
                'compra_id' => $compra->id,
                'numero_documento' => $compra->numero_documento ?? 'N/A',
                'total' => $compra->total ?? 0,
                'modo' => $modo,
            ]);

            AuditLogger::log('Compra Criada', '📥', ['area' => 'Compras', 'detalhes' => ['compra_id' => $compra->id, 'fornecedor' => $compra->fornecedor_id]]);

            return response()->json([
                'success' => true,
                'message' => 'Compra criada com sucesso',
                'data' => $compra,
                'modo' => $modo,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[CompraController::store] Erro de validação', [
                'errors' => $e->errors(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[CompraController::store] Erro ao criar compra', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar compra',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancelar uma compra
     */
    public function cancelar(Request $request, $id)
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $motivo = $request->validate([
                'motivo' => 'required|string|min:3|max:500',
            ]);

            $compra = $this->compraService->cancelarCompra($id);

            Log::info('[CompraController::cancelar] Compra cancelada com sucesso', [
                'compra_id' => $id,
                'motivo' => $motivo['motivo'],
                'modo' => $modo,
            ]);

            AuditLogger::log('Compra Cancelada', '⛔', ['area' => 'Compras', 'detalhes' => ['compra_id' => $compra->id]]);

            return response()->json([
                'success' => true,
                'message' => 'Compra cancelada com sucesso',
                'data' => $compra,
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Compra não encontrada',
            ], 404);
        } catch (\Exception $e) {
            Log::error('[CompraController::cancelar] Erro ao cancelar compra', [
                'compra_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao cancelar compra',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar compras por período
     */
    public function porPeriodo(Request $request)
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $dados = $request->validate([
                'data_inicio' => 'required|date',
                'data_fim' => 'required|date|after_or_equal:data_inicio',
            ]);

            $resumo = $this->compraService->resumoCompras(
                $dados['data_inicio'],
                $dados['data_fim']
            );

            return response()->json([
                'success' => true,
                'message' => 'Resumo de compras por período',
                'data' => [
                    'periodo' => [
                        'data_inicio' => $dados['data_inicio'],
                        'data_fim' => $dados['data_fim'],
                    ],
                    'resumo' => $resumo,
                ],
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[CompraController::porPeriodo] Erro ao buscar compras por período', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar compras por período',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resumo de compras (dashboard)
     */
    public function resumo(Request $request)
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $dataInicio = $request->input('data_inicio');
            $dataFim = $request->input('data_fim');

            $resumo = $this->compraService->resumoCompras($dataInicio, $dataFim);

            return response()->json([
                'success' => true,
                'message' => 'Resumo de compras',
                'data' => $resumo,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CompraController::resumo] Erro ao buscar resumo de compras', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar resumo de compras',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estatísticas de compras
     */
    public function estatisticas(Request $request)
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $ano = $request->input('ano', now()->year);
            $mes = $request->input('mes', now()->month);

            $estatisticas = $this->compraService->estatisticas($ano, $mes);

            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de compras',
                'data' => $estatisticas,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CompraController::estatisticas] Erro ao buscar estatísticas', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar estatísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Dados para criar compra (fornecedores, produtos)
     */
    public function create()
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $fornecedores = $this->queryFornecedores()
                ->where('status', 'ativo')
                ->get(['id', 'nome', 'nif', 'telefone', 'email']);

            $produtos = $this->queryProdutos()
                ->where('status', 'ativo')
                ->where('tipo', 'produto')
                ->get(['id', 'nome', 'codigo', 'preco_compra', 'preco_venda', 'estoque_atual']);

            return response()->json([
                'success' => true,
                'message' => 'Dados para criação de compra',
                'data' => [
                    'fornecedores' => $fornecedores,
                    'produtos' => $produtos,
                ],
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[CompraController::create] Erro ao carregar dados', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dados',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
