<?php

namespace App\Http\Controllers;

use App\Models\Shared\Pagamento as SharedPagamento;
use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\Pagamento as TenantPagamento;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Tenant\User as TenantUser;
use App\Models\Empresa;
use App\Models\LandlordUser;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PagamentoController extends Controller
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct()
    {
        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[PagamentoController] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
        
        // ⚠️ REMOVER authorizeResource - será controlado manualmente
        // $this->authorizeResource(Pagamento::class, 'pagamento');
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
        Log::debug('[PagamentoController] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[PagamentoController] Empresa não identificada.');
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
            Log::error('[PagamentoController] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[PagamentoController] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[PagamentoController] Acesso verificado com sucesso', [
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
     | HELPERS: Models e Queries
     | ================================================================== */

    protected function pagamentoModel()
    {
        return $this->isColectivo() ? new SharedPagamento() : new TenantPagamento();
    }

    protected function documentoFiscalModel()
    {
        return $this->isColectivo() ? new SharedDocumentoFiscal() : new TenantDocumentoFiscal();
    }

    protected function userModel()
    {
        return $this->isColectivo() ? new SharedUser() : new TenantUser();
    }

    /**
     * Query com scope para pagamentos (apenas colectivo)
     */
    protected function queryPagamentos()
    {
        if ($this->isColectivo()) {
            return SharedPagamento::doTenant();
        }
        return TenantPagamento::query();
    }

    /**
     * Query com scope para documentos fiscais (apenas colectivo)
     */
    protected function queryDocumentosFiscais()
    {
        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant();
        }
        return TenantDocumentoFiscal::query();
    }

    /**
     * Query com scope para usuários (apenas colectivo)
     */
    protected function queryUsers()
    {
        if ($this->isColectivo()) {
            return SharedUser::doTenant();
        }
        return TenantUser::query();
    }

    /**
     * Busca pagamento com scope (apenas colectivo)
     */
    protected function buscarPagamento(string $id)
    {
        if ($this->isColectivo()) {
            return SharedPagamento::doTenant()->where('id', $id)->first();
        }
        return TenantPagamento::where('id', $id)->first();
    }

    /**
     * Busca pagamento com scope e lança exceção
     */
    protected function buscarPagamentoOrFail(string $id)
    {
        if ($this->isColectivo()) {
            return SharedPagamento::doTenant()->where('id', $id)->firstOrFail();
        }
        return TenantPagamento::where('id', $id)->firstOrFail();
    }

    /**
     * Verifica se fatura existe no tenant
     */
    protected function faturaExiste(string $id): bool
    {
        return $this->queryDocumentosFiscais()->where('id', $id)->exists();
    }

    /**
     * Verifica se usuário existe no tenant
     */
    protected function userExiste(string $id): bool
    {
        return $this->queryUsers()->where('id', $id)->exists();
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
     * Listar todos os pagamentos
     */
    public function index(Request $request)
    {
        $modo = $this->getModo();
        
        Log::info('[PagamentoController::index] Listando pagamentos', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ QUERY COM SCOPE
            $query = $this->queryPagamentos()->with('user', 'fatura')->orderBy('data_pagamento', 'desc');

            // Filtros opcionais
            if ($request->has('fatura_id')) {
                $query->where('fatura_id', $request->fatura_id);
            }

            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->has('metodo')) {
                $query->where('metodo', $request->metodo);
            }

            $pagamentos = $query->get();

            return response()->json([
                'success' => true,
                'message' => 'Lista de pagamentos carregada com sucesso',
                'data' => $pagamentos,
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[PagamentoController::index] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar pagamentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar pagamento específico
     */
    public function show($id)
    {
        $modo = $this->getModo();
        
        Log::info('[PagamentoController::show] Buscando pagamento', [
            'pagamento_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ BUSCAR COM SCOPE
            $pagamento = $this->buscarPagamentoOrFail($id);

            return response()->json([
                'success' => true,
                'message' => 'Pagamento carregado com sucesso',
                'data' => $pagamento->load('user', 'fatura'),
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pagamento não encontrado',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoController::show] Erro', [
                'pagamento_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar novo pagamento
     */
    public function store(Request $request)
    {
        $modo = $this->getModo();
        
        Log::info('[PagamentoController::store] Criando pagamento', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ VALIDAÇÃO COM SCOPE
            $dados = $request->validate([
                'user_id' => [
                    'required',
                    'uuid',
                    function ($attribute, $value, $fail) {
                        if (!$this->userExiste($value)) {
                            $fail('O usuário selecionado não existe ou não pertence à empresa.');
                        }
                    },
                ],
                'fatura_id' => [
                    'required',
                    'uuid',
                    function ($attribute, $value, $fail) {
                        if (!$this->faturaExiste($value)) {
                            $fail('A fatura selecionada não existe ou não pertence à empresa.');
                        }
                    },
                ],
                'metodo' => 'required|in:dinheiro,cartao,transferencia,multibanco,cheque',
                'valor_pago' => 'required|numeric|min:0',
                'troco' => 'nullable|numeric|min:0',
                'referencia' => 'nullable|string|max:255',
                'data_pagamento' => 'required|date',
                'hora_pagamento' => 'required|date_format:H:i:s',
            ]);

            $dados['troco'] = $dados['troco'] ?? 0;

            // ⭐ ADICIONAR TENANT_ID (apenas para colectivo)
            if ($this->isColectivo()) {
                $dados['tenant_id'] = $this->empresa->id;
            }

            // ⭐ USAR O MODEL CORRETO
            if ($this->isColectivo()) {
                $pagamento = SharedPagamento::create($dados);
            } else {
                $pagamento = TenantPagamento::create($dados);
            }

            Log::info('[PagamentoController::store] Pagamento criado com sucesso', [
                'pagamento_id' => $pagamento->id,
                'valor' => $pagamento->valor_pago,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pagamento registrado com sucesso',
                'data' => $pagamento->load('user', 'fatura'),
                'modo' => $modo,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[PagamentoController::store] Erro', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar pagamento
     */
    public function update(Request $request, $id)
    {
        $modo = $this->getModo();
        
        Log::info('[PagamentoController::update] Atualizando pagamento', [
            'pagamento_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ BUSCAR COM SCOPE
            $pagamento = $this->buscarPagamentoOrFail($id);

            // ⭐ VALIDAÇÃO COM SCOPE
            $dados = $request->validate([
                'user_id' => [
                    'sometimes',
                    'required',
                    'uuid',
                    function ($attribute, $value, $fail) {
                        if (!$this->userExiste($value)) {
                            $fail('O usuário selecionado não existe ou não pertence à empresa.');
                        }
                    },
                ],
                'fatura_id' => [
                    'sometimes',
                    'required',
                    'uuid',
                    function ($attribute, $value, $fail) {
                        if (!$this->faturaExiste($value)) {
                            $fail('A fatura selecionada não existe ou não pertence à empresa.');
                        }
                    },
                ],
                'metodo' => 'sometimes|required|in:dinheiro,cartao,transferencia,multibanco,cheque',
                'valor_pago' => 'sometimes|required|numeric|min:0',
                'troco' => 'nullable|numeric|min:0',
                'referencia' => 'nullable|string|max:255',
                'data_pagamento' => 'sometimes|required|date',
                'hora_pagamento' => 'sometimes|required|date_format:H:i:s',
            ]);

            if (!isset($dados['troco'])) {
                $dados['troco'] = $pagamento->troco ?? 0;
            }

            $pagamento->update($dados);

            Log::info('[PagamentoController::update] Pagamento atualizado com sucesso', [
                'pagamento_id' => $pagamento->id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pagamento atualizado com sucesso',
                'data' => $pagamento->load('user', 'fatura'),
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pagamento não encontrado',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoController::update] Erro', [
                'pagamento_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Deletar pagamento
     */
    public function destroy($id)
    {
        $modo = $this->getModo();
        
        Log::info('[PagamentoController::destroy] Deletando pagamento', [
            'pagamento_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ BUSCAR COM SCOPE
            $pagamento = $this->buscarPagamentoOrFail($id);

            $pagamento->delete();

            Log::info('[PagamentoController::destroy] Pagamento deletado com sucesso', [
                'pagamento_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pagamento deletado com sucesso',
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pagamento não encontrado',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoController::destroy] Erro', [
                'pagamento_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao deletar pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar pagamentos por fatura
     */
    public function porFatura(Request $request, string $faturaId)
    {
        $modo = $this->getModo();
        
        Log::info('[PagamentoController::porFatura] Listando pagamentos por fatura', [
            'fatura_id' => $faturaId,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ VERIFICAR SE FATURA EXISTE NO TENANT
            if (!$this->faturaExiste($faturaId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fatura não encontrada ou não pertence à empresa.',
                    'error' => 'not_found'
                ], 404);
            }

            // ⭐ QUERY COM SCOPE
            $pagamentos = $this->queryPagamentos()
                ->where('fatura_id', $faturaId)
                ->with('user')
                ->orderBy('data_pagamento', 'desc')
                ->get();

            $totalPago = $pagamentos->sum('valor_pago');

            return response()->json([
                'success' => true,
                'message' => 'Pagamentos da fatura carregados com sucesso',
                'data' => [
                    'fatura_id' => $faturaId,
                    'total_pago' => $totalPago,
                    'pagamentos' => $pagamentos,
                ],
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[PagamentoController::porFatura] Erro', [
                'fatura_id' => $faturaId,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar pagamentos da fatura',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resumo de pagamentos por período
     */
    public function resumo(Request $request)
    {
        $modo = $this->getModo();
        
        Log::info('[PagamentoController::resumo] Gerando resumo de pagamentos', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
            ]);

            $dataInicio = $request->data_inicio ?? now()->startOfMonth()->toDateString();
            $dataFim = $request->data_fim ?? now()->endOfMonth()->toDateString();

            // ⭐ QUERY COM SCOPE
            $query = $this->queryPagamentos()
                ->whereBetween('data_pagamento', [$dataInicio, $dataFim]);

            $totalPago = (clone $query)->sum('valor_pago');
            $totalTroco = (clone $query)->sum('troco');
            $quantidade = (clone $query)->count();

            $porMetodo = (clone $query)
                ->select('metodo', 
                    DB::raw('COUNT(*) as quantidade'),
                    DB::raw('SUM(valor_pago) as total')
                )
                ->groupBy('metodo')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Resumo de pagamentos carregado com sucesso',
                'data' => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                    ],
                    'total_pago' => $totalPago,
                    'total_troco' => $totalTroco,
                    'quantidade' => $quantidade,
                    'por_metodo' => $porMetodo,
                ],
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[PagamentoController::resumo] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar resumo de pagamentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}