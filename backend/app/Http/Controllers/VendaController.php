<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Shared\Venda as SharedVenda;
use App\Models\Shared\Cliente as SharedCliente;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Tenant\Venda as TenantVenda;
use App\Models\Tenant\Cliente as TenantCliente;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use App\Services\VendaService;
use App\Services\AuditLogger;
use Carbon\Carbon;
use App\Traits\VerificaLimites;
use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;

class VendaController extends Controller
{
    use VerificaLimites;

    protected VendaService $vendaService;
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct(VendaService $vendaService)
    {
        $this->vendaService = $vendaService;

        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');

        Log::debug('[VendaController] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
    }

    /* =====================================================================
     | HELPERS DE MODO
     | ================================================================== */

    protected function getModo(): string
    {
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
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
     | HELPERS DE MODEL
     | ================================================================== */

    protected function vendaModel()
    {
        return $this->isColectivo() ? new SharedVenda() : new TenantVenda();
    }

    protected function clienteModel()
    {
        return $this->isColectivo() ? new SharedCliente() : new TenantCliente();
    }

    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
    }

    /* =====================================================================
     | HELPERS DE QUERY (com scope do tenant)
     | ================================================================== */

    protected function queryVendas()
    {
        if ($this->isColectivo()) {
            return SharedVenda::doTenant();
        }
        return TenantVenda::query();
    }

    protected function queryClientes()
    {
        if ($this->isColectivo()) {
            return SharedCliente::doTenant();
        }
        return TenantCliente::query();
    }

    protected function queryProdutos()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    protected function buscarVenda(string $id)
    {
        if ($this->isColectivo()) {
            return SharedVenda::doTenant()->where('id', $id)->first();
        }
        return TenantVenda::where('id', $id)->first();
    }

    protected function buscarVendaOrFail(string $id)
    {
        if ($this->isColectivo()) {
            return SharedVenda::doTenant()->where('id', $id)->firstOrFail();
        }
        return TenantVenda::where('id', $id)->firstOrFail();
    }

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO - CORRIGIDA ✅
     | ================================================================== */

    /**
     * Verifica se o usuário tem acesso ao tenant atual
     */
    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[VendaController] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[VendaController] Empresa não identificada.');
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
            Log::error('[VendaController] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[VendaController] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[VendaController] Acesso verificado com sucesso', [
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

        $userRole = $this->tenantUser->role ?? 'operador';
        return in_array($userRole, $roles);
    }

    /**
     * Verifica se é admin
     */
    protected function isAdmin(): bool
    {
        return $this->hasRole(['admin']);
    }

    /* =====================================================================
     | MÉTODOS DO CONTROLLER
     | ================================================================== */

    public function create()
    {
        $modo = $this->getModo();
        Log::info('[VendaController::create] Carregando dados para criação', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $clientes = $this->queryClientes()->where('status', 'ativo')->get();
            $produtos = $this->queryProdutos()->where('status', 'ativo')->get();

            return response()->json([
                'clientes' => $clientes,
                'produtos' => $produtos,
                'estatisticas' => [
                    'total_produtos' => $produtos->where('tipo', 'produto')->count(),
                    'total_servicos' => $produtos->where('tipo', 'servico')->count(),
                ],
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[VendaController::create] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao carregar dados',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    public function index(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[VendaController::index] Listando vendas', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $query = $this->queryVendas()->with([
                'cliente',
                'user',
                'itens.produto',
                'documentoFiscal.recibos',
                'documentoFiscal.notasCredito',
                'documentoFiscal.notasDebito',
            ]);

            // Filtros
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('estado_pagamento')) {
                $query->where('estado_pagamento', $request->estado_pagamento);
            }
            if ($request->filled('tipo_documento')) {
                $query->whereHas('documentoFiscal', fn($q) => $q->where('tipo_documento', $request->tipo_documento));
            }
            if ($request->filled('tipo_item')) {
                $query->whereHas('itens.produto', fn($q) => $q->where('tipo', $request->tipo_item));
            }
            if ($request->filled('cliente_id')) {
                $query->where('cliente_id', $request->cliente_id);
            }
            if ($request->filled('cliente_nome')) {
                $query->where('cliente_nome', 'like', '%' . $request->cliente_nome . '%');
            }
            if ($request->filled('data_inicio')) {
                $query->whereDate('data_venda', '>=', Carbon::parse($request->data_inicio));
            }
            if ($request->filled('data_fim')) {
                $query->whereDate('data_venda', '<=', Carbon::parse($request->data_fim));
            }
            if ($request->filled('valor_min')) {
                $query->where('total', '>=', $request->valor_min);
            }
            if ($request->filled('valor_max')) {
                $query->where('total', '<=', $request->valor_max);
            }
            if ($request->filled('numero_documento')) {
                $query->where('numero_documento', 'like', '%' . $request->numero_documento . '%');
            }
            if ($request->boolean('pendentes')) {
                $query->whereIn('estado_pagamento', ['pendente', 'parcial']);
            }
            if ($request->boolean('com_retencao')) {
                $query->where('total_retencao', '>', 0);
            }
            if ($request->boolean('apenas_vendas')) {
                $query->whereHas('documentoFiscal', fn($q) => $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']));
            }
            if ($request->boolean('apenas_nao_vendas')) {
                $query->whereHas('documentoFiscal', fn($q) => $q->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']));
            }

            $orderBy = in_array($request->order_by, ['data_venda', 'created_at', 'total', 'numero_documento'])
                ? $request->order_by
                : 'data_venda';
            $orderDir = $request->order_dir === 'asc' ? 'asc' : 'desc';
            $query->orderBy($orderBy, $orderDir);

            $vendas = $query->paginate($request->get('per_page', 15));

            AuditLogger::log('Listou Vendas', '📋', [
                'area' => 'Vendas',
                'detalhes' => [
                    'filtros' => $request->only(['status', 'estado_pagamento', 'tipo_documento', 'cliente_id', 'data_inicio', 'data_fim']),
                    'total' => $vendas->total(),
                ],
            ]);

            return response()->json([
                'message' => 'Lista de vendas carregada',
                'vendas' => $vendas->map(fn($v) => $this->formatarVenda($v)),
                'pagination' => [
                    'current_page' => $vendas->currentPage(),
                    'last_page' => $vendas->lastPage(),
                    'per_page' => $vendas->perPage(),
                    'total' => $vendas->total(),
                ],
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[VendaController::index] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao listar vendas',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    public function show($id)
    {
        $modo = $this->getModo();
        Log::info('[VendaController::show] Buscando venda', [
            'venda_id' => $id,
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $venda = $this->buscarVendaOrFail($id);
            $venda->load(['cliente', 'user', 'itens.produto', 'documentoFiscal.recibos']);

            AuditLogger::log('Visualizou Venda', '👁️', [
                'area' => 'Vendas',
                'detalhes' => ['venda_id' => $venda->id],
            ]);

            return response()->json([
                'message' => 'Venda carregada',
                'venda' => $this->formatarVenda($venda, true),
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Venda não encontrada',
                'error' => 'not_found',
                'modo' => $modo,
            ], 404);
        } catch (\Exception $e) {
            Log::error('[VendaController::show] Erro', [
                'venda_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao buscar venda',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[VendaController::store] Criando venda', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ============================================================
            // VERIFICAR LIMITE DE DOCUMENTOS
            // ============================================================
            $empresaId = $this->empresa->id;
            try {
                $this->verificarLimite(
                    'Documentos/mês',
                    fn() => $this->contarDocumentosMes($empresaId),
                    'Limite de documentos mensais do seu plano atingido. Faça upgrade para emitir mais documentos.'
                );
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'modo' => $modo,
                ], 403);
            }
            // ============================================================

            // ✅ Lock atómico contra duplo submit da mesma venda pelo mesmo utilizador
            $lockKey = 'venda_lock_' . $this->getUserId();
            $lock = \Illuminate\Support\Facades\Cache::lock($lockKey, 10);

            if (!$lock->get()) {
                Log::warning('[VendaController::store] Venda bloqueada por lock (possível duplo submit)', [
                    'user_id' => $this->getUserId(),
                    'modo' => $modo,
                ]);
                return response()->json([
                    'message' => 'Já existe uma venda a ser processada. Aguarde alguns segundos e tente novamente.',
                    'modo' => $modo,
                ], 429);
            }

            try {
                $dados = $request->validate([
                    'cliente_id' => 'nullable|uuid|exists:clientes,id',
                    'cliente_nome' => 'nullable|string|max:255',
                    'cliente_nif' => 'nullable|string|max:14',
                    'itens' => 'required|array|min:1',
                    'itens.*.produto_id' => 'required|uuid|exists:produtos,id',
                    'itens.*.quantidade' => 'required|integer|min:1',
                    'itens.*.preco_venda' => 'required|numeric|min:0',
                    'itens.*.desconto' => 'nullable|numeric|min:0',
                    'itens.*.taxa_iva' => 'nullable|numeric',
                    'itens.*.taxa_retencao' => 'nullable|numeric|in:0,2,5,6.5,10,15',
                    'itens.*.codigo_isencao' => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
                    'faturar' => 'nullable|boolean',
                    'tipo_documento' => 'nullable|in:FT,FR,FP,FA',
                    'dados_pagamento' => 'nullable|array',
                    'dados_pagamento.metodo' => 'required_with:dados_pagamento|in:transferencia,multibanco,dinheiro,cheque,cartao',
                    'dados_pagamento.valor' => 'required_with:dados_pagamento|numeric|min:0',
                    'dados_pagamento.referencia' => 'nullable|string|max:255',
                    'observacoes' => 'nullable|string|max:1000',
                    'desconto_global' => 'nullable|numeric|min:0',
                    'troco' => 'nullable|numeric|min:0',
                    // ✅ DADOS BANCÁRIOS
                    'nome_banco' => 'nullable|string|max:255',
                    'iban' => 'nullable|string|max:34',
                    'numero_conta' => 'nullable|string|max:20',
                ]);

                if (empty($dados['cliente_id']) && empty($dados['cliente_nome'])) {
                    return response()->json(['message' => 'É necessário informar um cliente (cadastrado ou avulso).'], 422);
                }

                // ✅ Log dos dados bancários recebidos
                Log::info('[VendaController::store] Dados bancários recebidos', [
                    'nome_banco' => $dados['nome_banco'] ?? null,
                    'iban' => $dados['iban'] ?? null,
                    'numero_conta' => $dados['numero_conta'] ?? null,
                ]);

                $venda = $this->vendaService->criarVenda(
                    $dados,
                    (bool) ($dados['faturar'] ?? false),
                    $dados['tipo_documento'] ?? 'FT'
                );

                AuditLogger::log('Venda Criada', '🛒', [
                    'area' => 'Vendas',
                    'detalhes' => [
                        'venda_id' => $venda->id,
                        'cliente_id' => $dados['cliente_id'] ?? null,
                        'cliente_nome' => $dados['cliente_nome'] ?? null,
                        'itens' => count($dados['itens'] ?? []),
                        'tipo_documento' => $dados['tipo_documento'] ?? 'FT',
                        'tem_dados_bancarios' => !empty($dados['nome_banco']) || !empty($dados['iban']) || !empty($dados['numero_conta']),
                    ],
                ]);

                return response()->json([
                    'message' => 'Venda criada com sucesso',
                    'venda' => $this->formatarVenda($venda->load('itens.produto', 'documentoFiscal')),
                    'modo' => $modo,
                ]);
            } finally {
                $lock->release();
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $e->errors(),
                'modo' => $modo,
            ], 422);
        } catch (\Exception $e) {
            Log::error('[VendaController::store] Erro', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);
            return response()->json(['message' => $e->getMessage(), 'modo' => $modo], 422);
        }
    }

    public function cancelar($id, Request $request)
    {
        $modo = $this->getModo();
        Log::info('[VendaController::cancelar] Cancelando venda', [
            'venda_id' => $id,
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $request->validate(['motivo' => 'required|string|max:500']);

            $venda = $this->buscarVendaOrFail($id);

            if ($venda->estado_pagamento === 'paga') {
                return response()->json([
                    'message' => 'Não é possível cancelar uma venda já paga. Cancele o documento fiscal primeiro.',
                ], 422);
            }

            $vendaCancelada = $this->vendaService->cancelarVenda($venda->id, $request->motivo);

            AuditLogger::log('Venda Cancelada', '❌', [
                'area' => 'Vendas',
                'detalhes' => [
                    'venda_id' => $vendaCancelada->id,
                    'motivo' => $request->motivo,
                ],
            ]);

            return response()->json([
                'message' => 'Venda cancelada com sucesso',
                'venda' => $this->formatarVenda($vendaCancelada),
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Venda não encontrada',
                'error' => 'not_found',
                'modo' => $modo,
            ], 404);
        } catch (\Exception $e) {
            Log::error('[VendaController::cancelar] Erro', [
                'venda_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['message' => $e->getMessage(), 'modo' => $modo], 422);
        }
    }

    public function gerarRecibo($id, Request $request)
    {
        $modo = $this->getModo();
        Log::info('[VendaController::gerarRecibo] Gerando recibo', [
            'venda_id' => $id,
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $venda = $this->buscarVendaOrFail($id);

            $dados = $request->validate([
                'valor' => 'required|numeric|min:0.01',
                'metodo_pagamento' => 'required|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'data_pagamento' => 'nullable|date',
                'referencia' => 'nullable|string|max:100',
            ]);

            $resultado = $this->vendaService->processarPagamento($venda->id, $dados);

            AuditLogger::log('Recibo de Venda Gerado', '💰', [
                'area' => 'Vendas',
                'detalhes' => [
                    'venda_id' => $venda->id,
                    'valor' => $dados['valor'] ?? null,
                    'metodo_pagamento' => $dados['metodo_pagamento'] ?? null,
                ],
            ]);

            return response()->json([
                'message' => 'Recibo gerado com sucesso',
                'recibo' => $resultado['recibo'],
                'venda' => $this->formatarVenda($resultado['venda']),
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Venda não encontrada',
                'error' => 'not_found',
                'modo' => $modo,
            ], 404);
        } catch (\Exception $e) {
            Log::error('[VendaController::gerarRecibo] Erro', [
                'venda_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json(['message' => $e->getMessage(), 'modo' => $modo], 422);
        }
    }

    public function estatisticas(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[VendaController::estatisticas] Gerando estatísticas', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $query = $this->queryVendas();

            if ($request->filled('data_inicio')) {
                $query->whereDate('data_venda', '>=', Carbon::parse($request->data_inicio));
            }
            if ($request->filled('data_fim')) {
                $query->whereDate('data_venda', '<=', Carbon::parse($request->data_fim));
            }

            if (!$request->filled('data_inicio') && !$request->filled('data_fim')) {
                $ano = $request->get('ano', Carbon::now()->year);
                $mes = $request->get('mes');
                $query->whereYear('data_venda', $ano);
                if ($mes) {
                    $query->whereMonth('data_venda', $mes);
                }
            }

            $queryFaturadas = (clone $query)->whereHas('documentoFiscal', fn($q) => $q->whereIn('tipo_documento', ['FT', 'FR']));

            return response()->json([
                'total_vendas' => (float) $query->sum('total'),
                'total_retencao' => (float) $query->sum('total_retencao'),
                'total_iva' => (float) $query->sum('total_iva'),
                'quantidade_vendas' => (clone $queryFaturadas)->count(),
                'quantidade_pendentes' => (clone $query)->whereIn('estado_pagamento', ['pendente', 'parcial'])->count(),
                'quantidade_pagas' => (clone $query)->where('estado_pagamento', 'paga')->count(),
                'vendas_por_dia' => (clone $query)->select(
                    DB::raw('DATE(data_venda) as data'),
                    DB::raw('SUM(total) as total')
                )->groupBy('data')->orderBy('data')->get(),
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[VendaController::estatisticas] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao gerar estatísticas',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    /**
     * Conta quantos documentos fiscais a empresa já emitiu no mês atual
     */
    private function contarDocumentosMes($empresaId): int
    {
        if ($this->isColectivo()) {
            // doTenant() já aplica o global scope que filtra por tenant_id.
            // NÃO adicionar where('empresa_id') aqui: no modo colectivo a
            //    tabela documentos_fiscais (banco shared) não tem essa coluna,
            //    só tenant_id — mesma regra já documentada em UserController::store.
            return SharedDocumentoFiscal::doTenant()
                ->whereIn('tipo_documento', ['FT', 'FR', 'FP', 'NC', 'ND', 'RC', 'FRt'])
                ->where('estado', '!=', 'cancelado')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();
        } else {
            // No modo singular a base tenant já é exclusiva da empresa.
            // Se a coluna empresa_id não existir nesta tabela também,
            // remova este where (mesmo problema pode se repetir aqui).
            return TenantDocumentoFiscal::where('empresa_id', $empresaId)
                ->whereIn('tipo_documento', ['FT', 'FR', 'FP', 'NC', 'ND', 'RC', 'FRt'])
                ->where('estado', '!=', 'cancelado')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();
        }
    }

    public function relatorio(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[VendaController::relatorio] Gerando relatório', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $tipo = $request->get('tipo', 'vendas');

            $query = $this->queryVendas()->with(['cliente', 'documentoFiscal']);

            match ($tipo) {
                'vendas' => $query->whereHas('documentoFiscal', fn($q) => $q->whereIn('tipo_documento', ['FT', 'FR'])),
                'proformas' => $query->whereHas('documentoFiscal', fn($q) => $q->where('tipo_documento', 'FP')),
                'adiantamentos' => $query->whereHas('documentoFiscal', fn($q) => $q->where('tipo_documento', 'FA')),
                default => null,
            };

            if ($request->filled('data_inicio')) {
                $query->whereDate('data_venda', '>=', $request->data_inicio);
            }
            if ($request->filled('data_fim')) {
                $query->whereDate('data_venda', '<=', $request->data_fim);
            }

            $vendas = $query->orderBy('data_venda', 'desc')->get();

            return response()->json([
                'relatorio' => $vendas->map(fn($v) => [
                    'data' => $v->data_venda,
                    'numero' => $v->numero_documento,
                    'cliente' => $v->cliente_nome ?? $v->cliente?->nome ?? 'Consumidor Final',
                    'tipo' => $v->tipo_documento_nome,
                    'total' => (float) $v->total,
                    'estado' => $v->estado_pagamento,
                ]),
                'total_geral' => (float) $vendas->sum('total'),
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[VendaController::relatorio] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao gerar relatório',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    /* =====================================================================
     | HELPER PRIVADO — FORMATAR VENDA (MANTIDO)
     | ================================================================== */

    private function formatarVenda($venda, bool $detalhado = false): array
    {
        $servicos = $venda->itens->filter(fn($i) => $i->produto?->tipo === 'servico');
        $totalRetencaoServicos = $servicos->sum('valor_retencao');

        $dados = [
            'id' => $venda->id,
            'numero_documento' => $venda->documentoFiscal?->numero_documento ?? $venda->numero_documento ?? 'N/A',
            'serie' => $venda->documentoFiscal?->serie ?? $venda->serie ?? 'A',
            'tipo_documento' => $venda->documentoFiscal?->tipo_documento ?? 'venda',
            'tipo_documento_nome' => $venda->tipo_documento_nome,
            'cliente_id' => $venda->cliente_id,
            'cliente' => $venda->cliente ? [
                'id' => $venda->cliente->id,
                'nome' => $venda->cliente->nome,
                'nif' => $venda->cliente->nif,
                'tipo' => $venda->cliente->tipo,
                'telefone' => $venda->cliente->telefone,
                'email' => $venda->cliente->email,
                'endereco' => $venda->cliente->endereco,
            ] : null,
            'cliente_nome' => $venda->cliente_nome,
            'cliente_nif' => $venda->cliente_nif,
            'user' => $venda->user
                ? ['id' => $venda->user->id, 'name' => $venda->user->name]
                : null,
            'data_venda' => $venda->data_venda,
            'hora_venda' => $venda->hora_venda,
            'created_at' => $venda->created_at,
            'total' => (float) $venda->total,
            'base_tributavel' => (float) $venda->base_tributavel,
            'total_iva' => (float) $venda->total_iva,
            'total_retencao' => (float) $venda->total_retencao,
            'total_retencao_servicos' => (float) $totalRetencaoServicos,
            'tem_servicos' => $servicos->count() > 0,
            'quantidade_servicos' => $servicos->count(),
            'status' => $venda->status,
            'faturado' => !is_null($venda->documentoFiscal),
            'estado_pagamento' => $venda->estado_pagamento,
            'paga' => $venda->estado_pagamento === 'paga',
            'valor_pendente' => $venda->valor_pendente,
            'valor_pago' => $venda->valor_pago,
            'pode_receber_pagamento' => $venda->pode_receber_pagamento,
            'pode_ser_cancelada' => $venda->pode_ser_cancelada,
            'observacoes' => $venda->observacoes,
            'desconto_global' => (float) ($venda->desconto_global ?? 0),
            'troco' => (float) ($venda->troco ?? 0),
        ];

        if ($venda->documentoFiscal) {
            $df = $venda->documentoFiscal;
            $dados['documento_fiscal'] = [
                'id' => $df->id,
                'numero_documento' => $df->numero_documento,
                'tipo_documento' => $df->tipo_documento,
                'tipo_documento_nome' => $df->tipo_documento_nome,
                'data_emissao' => $df->data_emissao,
                'hora_emissao' => $df->hora_emissao,
                'data_vencimento' => $df->data_vencimento,
                'estado' => $df->estado,
                'hash_fiscal' => $df->hash_fiscal,
                'qr_code' => $df->qr_code,
                'retencao_total' => (float) ($df->total_retencao ?? 0),
                'recibos' => $df->recibos->map(fn($r) => [
                    'id' => $r->id,
                    'numero' => $r->numero_documento,
                    'valor' => (float) $r->total_liquido,
                    'metodo_pagamento' => $r->metodo_pagamento,
                    'data_emissao' => $r->data_emissao,
                ]),
            ];
        }

        if ($detalhado) {
            $dados['itens'] = $venda->itens->map(fn($item) => [
                'id' => $item->id,
                'produto_id' => $item->produto_id,
                'produto' => $item->produto ? [
                    'id' => $item->produto->id,
                    'nome' => $item->produto->nome,
                    'codigo' => $item->produto->codigo,
                    'tipo' => $item->produto->tipo,
                ] : null,
                'descricao' => $item->descricao,
                'quantidade' => (int) $item->quantidade,
                'preco_venda' => (float) $item->preco_venda,
                'desconto' => (float) ($item->desconto ?? 0),
                'base_tributavel' => (float) $item->base_tributavel,
                'taxa_iva' => (float) $item->taxa_iva,
                'valor_iva' => (float) $item->valor_iva,
                'codigo_isencao' => $item->codigo_isencao,
                'taxa_retencao' => (float) ($item->taxa_retencao ?? 0),
                'valor_retencao' => (float) ($item->valor_retencao ?? 0),
                'subtotal' => (float) $item->subtotal,
                'eh_servico' => $item->produto?->tipo === 'servico',
            ]);

            $dados['totais_por_tipo'] = [
                'produtos' => [
                    'quantidade' => $venda->itens->filter(fn($i) => $i->produto?->tipo === 'produto')->count(),
                    'total' => (float) $venda->itens->filter(fn($i) => $i->produto?->tipo === 'produto')->sum('subtotal'),
                ],
                'servicos' => [
                    'quantidade' => $servicos->count(),
                    'total' => (float) $servicos->sum('subtotal'),
                    'retencao' => (float) $totalRetencaoServicos,
                ],
            ];
        }

        return $dados;
    }
}