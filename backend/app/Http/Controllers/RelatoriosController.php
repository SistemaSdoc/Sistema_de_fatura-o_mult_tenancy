<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RelatoriosService;
use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Shared\MovimentoStock as SharedMovimentoStock;
use App\Models\Shared\Venda as SharedVenda;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Shared\Cliente as SharedCliente;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Tenant\MovimentoStock as TenantMovimentoStock;
use App\Models\Tenant\Venda as TenantVenda;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Tenant\Cliente as TenantCliente;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Services\SaftService;
use App\Services\SaftAlertService;

class RelatoriosController extends Controller
{
    protected RelatoriosService $relatoriosService;
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct(RelatoriosService $relatoriosService)
    {
        $this->relatoriosService = $relatoriosService;
        
        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[RelatoriosController] Inicializado', [
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
        Log::debug('[RelatoriosController] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[RelatoriosController] Empresa não identificada.');
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
            Log::error('[RelatoriosController] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[RelatoriosController] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[RelatoriosController] Acesso verificado com sucesso', [
            'modo' => $this->modo,
            'user_id' => $tenantUser->id,
            'email' => $tenantUser->email,
        ]);
    }

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

    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    /**
     * Retorna o utilizador autenticado pelo guard correto (landlord).
     */
    private function getAuthUser(): ?object
    {
        $user = Auth::guard('landlord')->user();
        
        if ($user) {
            return $user;
        }

        $landlordId = session('landlord_user_id');
        if ($landlordId) {
            return LandlordUser::find($landlordId);
        }

        return null;
    }

    /**
     * Método auxiliar para controlar permissões
     * ✅ CORRIGIDO: Verifica se tenantUser está carregado e obtém role
     */
    private function authorizeRelatorio(string $tipo = 'basico'): void
    {
        // ✅ GARANTIR QUE O USUÁRIO ESTÁ CARREGADO
        if (!$this->tenantUser) {
            Log::warning('[RelatoriosController] TenantUser não carregado, tentando verificar acesso');
            try {
                $this->verificarAcessoUsuario();
            } catch (\Exception $e) {
                Log::error('[RelatoriosController] Falha ao carregar tenantUser', [
                    'error' => $e->getMessage(),
                ]);
                abort(401, 'Usuário não autenticado.');
            }
        }

        $user = $this->getAuthUser();

        if (!$user) {
            Log::warning('[RelatoriosController] Tentativa de acesso a relatório SEM usuário autenticado', [
                'ip' => request()->ip(),
                'route' => request()->route()?->getName(),
            ]);
            abort(401, 'Usuário não autenticado. Por favor, faça login.');
        }

        // ✅ OBTÉM A ROLE DO TENANT USER
        $role = $this->tenantUser?->role ?? null;

        // ✅ FALLBACK: tentar obter do usuário landlord via relação
        if (!$role && $user) {
            if ($this->isColectivo() && method_exists($user, 'getRoleNoTenant')) {
                $role = $user->getRoleNoTenant($this->empresa?->id);
            }
        }

        Log::info('[RelatoriosController] Acesso a relatório', [
            'user_id' => $user->id ?? null,
            'user_email' => $user->email ?? null,
            'user_role' => $role,
            'tipo_relatorio' => $tipo,
            'modo' => $this->getModo(),
        ]);

        $rolesBasicos = [
            'admin', 'contablista', 'gestor', 'vendedor',
            'gerente_vendas', 'armazem', 'gerente_armazem',
            'diretor', 'supervisor', 'operador',
        ];

        if (!$role) {
            Log::error('[RelatoriosController] Usuário sem role definida', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
            abort(403, "Seu usuário não tem role definido. Contacte o administrador.");
        }

        if (!in_array($role, $rolesBasicos)) {
            Log::warning('[RelatoriosController] Role não autorizada', [
                'user_id' => $user->id,
                'role' => $role,
            ]);
            abort(403, "Role '{$role}' não autorizado para acessar relatórios.");
        }

        if ($tipo === 'avancado' && $role !== 'admin') {
            Log::warning('[RelatoriosController] Tentativa de acesso a relatório avançado sem role admin', [
                'user_id' => $user->id,
                'role' => $role,
            ]);
            abort(403, 'Apenas administradores podem acessar relatórios avançados.');
        }

        Log::info('[RelatoriosController] Autorização concedida', [
            'user_id' => $user->id,
            'user_role' => $role,
            'tipo' => $tipo,
            'modo' => $this->getModo(),
        ]);
    }

    /* =====================================================================
     | HELPERS: Models e Queries
     | ================================================================== */

    protected function documentoFiscalModel()
    {
        return $this->isColectivo() ? new SharedDocumentoFiscal() : new TenantDocumentoFiscal();
    }

    protected function movimentoStockModel()
    {
        return $this->isColectivo() ? new SharedMovimentoStock() : new TenantMovimentoStock();
    }

    protected function vendaModel()
    {
        return $this->isColectivo() ? new SharedVenda() : new TenantVenda();
    }

    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
    }

    protected function clienteModel()
    {
        return $this->isColectivo() ? new SharedCliente() : new TenantCliente();
    }

    protected function queryDocumentosFiscais()
    {
        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant();
        }
        return TenantDocumentoFiscal::query();
    }

    protected function queryMovimentosStock()
    {
        if ($this->isColectivo()) {
            return SharedMovimentoStock::doTenant();
        }
        return TenantMovimentoStock::query();
    }

    protected function queryVendas()
    {
        if ($this->isColectivo()) {
            return SharedVenda::doTenant();
        }
        return TenantVenda::query();
    }

    protected function queryProdutos()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    protected function queryClientes()
    {
        if ($this->isColectivo()) {
            return SharedCliente::doTenant();
        }
        return TenantCliente::query();
    }

    protected function aplicarFiltroTenant($query, string $table)
    {
        if ($this->isColectivo() && $this->empresa) {
            return $query->where("{$table}.tenant_id", $this->empresa->id);
        }
        return $query;
    }

    /* =====================================================================
     | ENDPOINTS - CORRIGIDOS ✅
     | ================================================================== */

    public function debug()
    {
        $modo = $this->getModo();
        $this->verificarAcessoUsuario();

        $user = $this->getAuthUser();
        $token = request()->header('Authorization');
        $guardUsed = Auth::guard('landlord')->check() ? 'landlord' : 'nenhum';

        return response()->json([
            'authenticated' => !!$user,
            'guard_usado' => $guardUsed,
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'SEM ROLE',
            ] : null,
            'tenantUser' => $this->tenantUser ? [
                'id' => $this->tenantUser->id,
                'role' => $this->tenantUser->role ?? 'SEM ROLE',
            ] : null,
            'token_present' => !!$token,
            'tenant' => session('tenant_id'),
            'modo' => $modo,
            'ip' => request()->ip(),
        ]);
    }

    public function dashboard()
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role
        $this->authorizeRelatorio('basico');

        try {
            $hoje = now();
            $inicioMes = $hoje->copy()->startOfMonth();

            $documentosQuery = $this->queryDocumentosFiscais();
            $vendasQuery = $this->queryVendas();
            $clientesQuery = $this->queryClientes();
            $produtosQuery = $this->queryProdutos();
            $movimentosQuery = $this->queryMovimentosStock();

            $totalDocumentos = (clone $documentosQuery)->whereNotIn('estado', ['cancelado'])->count();
            $totalFaturado = (clone $documentosQuery)
                ->whereIn('tipo_documento', ['FT', 'FR'])
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_liquido');

            $totalNotasCredito = (clone $documentosQuery)
                ->where('tipo_documento', 'NC')
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_liquido');

            $totalLiquido = $totalFaturado - $totalNotasCredito;

            $totalRetencaoServicos = (clone $documentosQuery)
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_retencao');

            $totalRetencaoMes = (clone $documentosQuery)
                ->whereBetween('data_emissao', [$inicioMes, $hoje])
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_retencao');

            $vendasMes = (clone $vendasQuery)
                ->whereBetween('data_venda', [$inicioMes, $hoje])
                ->where('status', 'faturada')
                ->count();

            $valorVendasMes = (clone $vendasQuery)
                ->whereBetween('data_venda', [$inicioMes, $hoje])
                ->where('status', 'faturada')
                ->sum('total');

            $totalClientes = (clone $clientesQuery)->count();
            $clientesNovosMes = (clone $clientesQuery)
                ->whereBetween('created_at', [$inicioMes, $hoje])
                ->count();

            $totalProdutos = (clone $produtosQuery)->where('tipo', 'produto')->count();
            $totalServicos = (clone $produtosQuery)->where('tipo', 'servico')->count();
            $servicosAtivos = (clone $produtosQuery)
                ->where('tipo', 'servico')
                ->where('status', 'ativo')
                ->count();

            $produtosEstoqueBaixo = (clone $produtosQuery)
                ->where('tipo', 'produto')
                ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
                ->count();

            $produtosSemEstoque = (clone $produtosQuery)
                ->where('tipo', 'produto')
                ->where('estoque_atual', '<=', 0)
                ->count();

            $movimentosStockHoje = (clone $movimentosQuery)
                ->whereDate('created_at', $hoje->toDateString())
                ->count();

            $entradasHoje = (clone $movimentosQuery)
                ->whereDate('created_at', $hoje->toDateString())
                ->where('tipo', 'entrada')
                ->sum('quantidade');

            $saidasHoje = (clone $movimentosQuery)
                ->whereDate('created_at', $hoje->toDateString())
                ->where('tipo', 'saida')
                ->sum(DB::raw('ABS(quantidade)'));

            $documentosVencidos = (clone $documentosQuery)
                ->whereIn('tipo_documento', ['FT', 'FA'])
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->whereNotNull('data_vencimento')
                ->where('data_vencimento', '<', $hoje)
                ->count();

            $proformasEmAberto = (clone $documentosQuery)
                ->where('tipo_documento', 'FP')
                ->where('estado', 'emitido')
                ->where('data_emissao', '<', $hoje->copy()->subDays(7))
                ->count();

            $servicosComRetencaoPendente = (clone $documentosQuery)
                ->where('total_retencao', '>', 0)
                ->whereIn('tipo_documento', ['FT', 'FA'])
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->where('data_vencimento', '<', $hoje->copy()->addDays(5))
                ->count();

            $adiantamentosPendentes = (clone $documentosQuery)
                ->where('tipo_documento', 'FA')
                ->where('estado', 'emitido')
                ->count();

            $dashboard = [
                'documentos_fiscais' => [
                    'total' => $totalDocumentos,
                    'total_faturado' => $totalFaturado,
                    'total_notas_credito' => $totalNotasCredito,
                    'total_liquido' => $totalLiquido,
                    'total_retencao' => $totalRetencaoServicos,
                    'total_retencao_mes' => $totalRetencaoMes,
                ],
                'vendas' => [
                    'total_mes' => $vendasMes,
                    'valor_mes' => $valorVendasMes,
                ],
                'clientes' => [
                    'total' => $totalClientes,
                    'novos_mes' => $clientesNovosMes,
                ],
                'produtos' => [
                    'total' => $totalProdutos,
                    'estoque_baixo' => $produtosEstoqueBaixo,
                    'sem_estoque' => $produtosSemEstoque,
                ],
                'servicos' => [
                    'total' => $totalServicos,
                    'ativos' => $servicosAtivos,
                    'inativos' => $totalServicos - $servicosAtivos,
                ],
                'stock' => [
                    'movimentos_hoje' => $movimentosStockHoje,
                    'entradas_hoje' => $entradasHoje,
                    'saidas_hoje' => $saidasHoje,
                ],
                'alertas' => [
                    'documentos_vencidos' => $documentosVencidos,
                    'proformas_em_aberto' => $proformasEmAberto,
                    'adiantamentos_pendentes' => $adiantamentosPendentes,
                    'servicos_com_retencao_pendente' => $servicosComRetencaoPendente,
                ],
                'periodo' => [
                    'inicio_mes' => $inicioMes->toDateString(),
                    'hoje' => $hoje->toDateString(),
                ],
                'modo' => $modo,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Dashboard carregado com sucesso',
                'data' => $dashboard,
            ]);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao carregar dashboard:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dashboard: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function vendas(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'estado_pagamento' => 'nullable|in:paga,pendente,parcial,cancelada',
                'apenas_vendas' => 'nullable|boolean',
                'agrupar_por' => 'nullable|in:dia,mes,ano',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            // ⭐ USAR O SERVICE
            $relatorio = $this->relatoriosService->relatorioVendas($dataInicio, $dataFim, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Relatório de vendas carregado com sucesso',
                'data' => $relatorio,
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar relatório de vendas:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de vendas: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function documentosFiscais(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'tipo' => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255',
                'estado' => 'nullable|in:emitido,paga,parcialmente_paga,cancelado,expirado',
                'apenas_vendas' => 'nullable|boolean',
                'apenas_nao_vendas' => 'nullable|boolean',
                'com_retencao' => 'nullable|boolean',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            // ⭐ QUERY COM SCOPE
            $query = $this->queryDocumentosFiscais()->with(['cliente'])
                ->whereBetween('data_emissao', [$dataInicio, $dataFim]);

            if (!empty($dados['tipo'])) {
                $query->where('tipo_documento', $dados['tipo']);
            }

            if (!empty($dados['estado'])) {
                $query->where('estado', $dados['estado']);
            }

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            } elseif (!empty($dados['cliente_nome'])) {
                $query->where('cliente_nome', 'like', '%' . $dados['cliente_nome'] . '%');
            }

            if (!empty($dados['apenas_vendas'])) {
                $query->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
            }

            if (!empty($dados['apenas_nao_vendas'])) {
                $query->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']);
            }

            if (!empty($dados['com_retencao'])) {
                $query->where('total_retencao', '>', 0);
            }

            $documentos = $query->orderBy('data_emissao', 'desc')->get();

            $estatisticas = [
                'total_documentos' => $documentos->count(),
                'total_valor' => $documentos->sum('total_liquido'),
                'total_base' => $documentos->sum('base_tributavel'),
                'total_iva' => $documentos->sum('total_iva'),
                'total_retencao' => $documentos->sum('total_retencao'),
                'por_tipo' => $documentos->groupBy('tipo_documento')
                    ->map(fn($docs) => [
                        'quantidade' => $docs->count(),
                        'valor' => $docs->sum('total_liquido'),
                        'retencao' => $docs->sum('total_retencao'),
                    ]),
                'por_estado' => $documentos->groupBy('estado')
                    ->map(fn($docs) => $docs->count()),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Relatório de documentos fiscais carregado com sucesso',
                'data' => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                    ],
                    'filtros' => $dados,
                    'estatisticas' => $estatisticas,
                    'documentos' => $documentos->map(function ($d) {
                        return array_merge($d->toArray(), [
                            'resumo' => $d->resumo ?? null,
                        ]);
                    }),
                    'modo' => $modo,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar relatório de documentos fiscais:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de documentos fiscais: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function movimentosStock(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'produto_id' => 'nullable|uuid|exists:produtos,id',
                'tipo' => 'nullable|in:entrada,saida',
                'tipo_movimento' => 'nullable|in:compra,venda,ajuste,nota_credito,venda_cancelada,nota_credito_cancelada',
                'agrupar_por' => 'nullable|in:dia,mes,produto,tipo_movimento',
                'paginar' => 'nullable|boolean',
                'per_page' => 'nullable|integer|min:5|max:200',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            // ⭐ USAR O SERVICE
            $relatorio = $this->relatoriosService->relatorioMovimentosStock($dataInicio, $dataFim, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Relatório de movimentos de stock carregado com sucesso',
                'data' => $relatorio,
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar relatório de movimentos de stock:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de movimentos de stock: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function pagamentosPendentes(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role (AVANCADO)
        $this->authorizeRelatorio('avancado');

        try {
            // ⭐ USAR O SERVICE
            $relatorio = $this->relatoriosService->relatorioPagamentosPendentes();

            return response()->json([
                'success' => true,
                'message' => 'Relatório de pagamentos pendentes carregado com sucesso',
                'data' => $relatorio,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar relatório de pagamentos pendentes:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de pagamentos pendentes: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function faturacao(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'tipo' => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'incluir_retencoes' => 'nullable|boolean',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            // ⭐ USAR O SERVICE
            $relatorio = $this->relatoriosService->relatorioFaturacao($dataInicio, $dataFim, $dados);

            // Adicionar retenções se solicitado
            if (!empty($dados['incluir_retencoes'])) {
                $documentosQuery = $this->queryDocumentosFiscais();

                $retencoes = (clone $documentosQuery)
                    ->whereBetween('data_emissao', [$dataInicio, $dataFim])
                    ->where('total_retencao', '>', 0)
                    ->whereNotIn('estado', ['cancelado'])
                    ->with(['cliente'])
                    ->get();

                $relatorio['retencoes'] = [
                    'total' => $retencoes->sum('total_retencao'),
                    'quantidade_documentos' => $retencoes->count(),
                    'detalhes' => $retencoes->map(function ($doc) {
                        return [
                            'numero' => $doc->numero_documento,
                            'data' => $doc->data_emissao,
                            'cliente' => $doc->cliente_nome ?? $doc->cliente?->nome ?? 'N/A',
                            'total' => $doc->total_liquido,
                            'retencao' => $doc->total_retencao,
                            'percentual' => $doc->base_tributavel > 0
                                ? round(($doc->total_retencao / $doc->base_tributavel) * 100, 2)
                                : 0,
                        ];
                    }),
                ];
            }

            $relatorio['modo'] = $modo;

            return response()->json([
                'success' => true,
                'message' => 'Relatório de faturação carregado com sucesso',
                'data' => $relatorio,
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar relatório de faturação:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de faturação: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function proformas(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'pendentes' => 'nullable|boolean',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            // ⭐ USAR O SERVICE
            $relatorio = $this->relatoriosService->relatorioProformas(
                $dataInicio, 
                $dataFim, 
                $dados['cliente_id'] ?? null, 
                $dados['pendentes'] ?? false
            );

            return response()->json([
                'success' => true,
                'message' => 'Relatório de proformas carregado com sucesso',
                'data' => $relatorio,
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar relatório de proformas:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de proformas: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function stock(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role
        $this->authorizeRelatorio('basico');

        try {
            $filtros = $request->only(['categoria_id', 'apenas_ativos', 'estoque_baixo', 'sem_estoque']);
            
            // ⭐ USAR O SERVICE
            $relatorio = $this->relatoriosService->relatorioStock($filtros);

            return response()->json([
                'success' => true,
                'message' => 'Relatório de stock carregado com sucesso',
                'data' => $relatorio,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar relatório de stock:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de stock: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function compras(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role
        $this->authorizeRelatorio('basico');

        try {
            $dataInicio = $request->input('data_inicio', now()->startOfMonth()->toDateString());
            $dataFim = $request->input('data_fim', now()->toDateString());
            $fornecedorId = $request->input('fornecedor_id');

            // ⭐ USAR O SERVICE
            $relatorio = $this->relatoriosService->relatorioCompras($dataInicio, $dataFim, $fornecedorId);

            return response()->json([
                'success' => true,
                'message' => 'Relatório de compras carregado com sucesso',
                'data' => $relatorio,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar relatório de compras:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de compras: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function retencoes(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role
        $this->authorizeRelatorio('basico');

        try {
            $dataInicio = $request->input('data_inicio', now()->startOfMonth()->toDateString());
            $dataFim = $request->input('data_fim', now()->toDateString());

            // ⭐ QUERY COM SCOPE
            $query = $this->queryDocumentosFiscais()
                ->whereBetween('data_emissao', [$dataInicio, $dataFim])
                ->where('total_retencao', '>', 0)
                ->whereNotIn('estado', ['cancelado'])
                ->with(['cliente'])
                ->orderBy('data_emissao', 'desc');

            $documentos = $query->get();

            $totalRetencao = $documentos->sum('total_retencao');
            $totalBase = $documentos->sum('base_tributavel');
            $percentualMedia = $totalBase > 0 ? round(($totalRetencao / $totalBase) * 100, 2) : 0;

            return response()->json([
                'success' => true,
                'message' => 'Relatório de retenções carregado com sucesso',
                'data' => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                    ],
                    'resumo' => [
                        'total_retencao' => $totalRetencao,
                        'total_base' => $totalBase,
                        'percentual_medio' => $percentualMedia,
                        'quantidade_documentos' => $documentos->count(),
                    ],
                    'documentos' => $documentos->map(function ($doc) {
                        return [
                            'id' => $doc->id,
                            'numero' => $doc->numero_documento,
                            'tipo' => $doc->tipo_documento,
                            'data' => $doc->data_emissao,
                            'cliente' => $doc->cliente?->nome ?? $doc->cliente_nome ?? 'N/A',
                            'base_tributavel' => $doc->base_tributavel,
                            'retencao' => $doc->total_retencao,
                            'percentual' => $doc->base_tributavel > 0
                                ? round(($doc->total_retencao / $doc->base_tributavel) * 100, 2)
                                : 0,
                        ];
                    }),
                    'modo' => $modo,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar relatório de retenções:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de retenções: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function exportarSaft(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role (AVANCADO)
        $this->authorizeRelatorio('avancado');

        try {
            $year = (int) $request->query('year');
            $month = (int) $request->query('month');

            if (!$year || !$month || $month < 1 || $month > 12) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ano e mês são obrigatórios.'
                ], 422);
            }

            $saftService = new SaftService();

            $path = $saftService->generateFull($year, $month);

            if (!$path || !file_exists($path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Não foi possível gerar o arquivo SAF-T.'
                ], 500);
            }

            return response()->download($path, "SAFT_{$year}_{str_pad($month, 2, '0', STR_PAD_LEFT)}.xml")
                ->deleteFileAfterSend(false);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao exportar SAF-T', [
                'year' => $year ?? null,
                'month' => $month ?? null,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar SAF-T: ' . $e->getMessage()
            ], 500);
        }
    }

    public function saftAlertas(Request $request)
    {
        $modo = $this->getModo();
        
        // ✅ 1. Verificar acesso (carrega tenantUser)
        $this->verificarAcessoUsuario();
        
        // ✅ 2. Autorizar role (AVANCADO)
        $this->authorizeRelatorio('avancado');

        try {
            $saftAlertService = new SaftAlertService();

            $alertas = $saftAlertService->getAlertas();

            return response()->json([
                'success' => true,
                'message' => 'Alertas SAF-T carregados com sucesso',
                'data' => $alertas,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[RelatoriosController] Erro ao gerar alertas SAF-T:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar alertas SAF-T: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | MÉTODOS AUXILIARES
     | ================================================================== */

    private function agruparVendas($vendas, $agruparPor)
    {
        $agrupado = [];
        foreach ($vendas as $venda) {
            $chave = match ($agruparPor) {
                'dia' => $venda->data_venda->format('Y-m-d'),
                'mes' => $venda->data_venda->format('Y-m'),
                'ano' => $venda->data_venda->format('Y'),
                default => $venda->data_venda->format('Y-m-d'),
            };

            if (!isset($agrupado[$chave])) {
                $agrupado[$chave] = [
                    'periodo' => $chave,
                    'quantidade' => 0,
                    'total' => 0,
                    'base_tributavel' => 0,
                    'total_iva' => 0,
                    'total_retencao' => 0,
                ];
            }

            $agrupado[$chave]['quantidade']++;
            $agrupado[$chave]['total'] += $venda->total;
            $agrupado[$chave]['base_tributavel'] += $venda->base_tributavel;
            $agrupado[$chave]['total_iva'] += $venda->total_iva;
            $agrupado[$chave]['total_retencao'] += $venda->total_retencao;
        }

        return array_values($agrupado);
    }

    private function agruparMovimentos($movimentos, $agruparPor)
    {
        $agrupado = [];
        foreach ($movimentos as $mov) {
            switch ($agruparPor) {
                case 'dia':
                    $chave = $mov->created_at->format('Y-m-d');
                    $label = $chave;
                    break;
                case 'mes':
                    $chave = $mov->created_at->format('Y-m');
                    $label = $chave;
                    break;
                case 'produto':
                    $chave = $mov->produto_id;
                    $label = optional($mov->produto)->nome ?? 'N/A';
                    break;
                case 'tipo_movimento':
                    $chave = $mov->tipo_movimento;
                    $label = $chave;
                    break;
                default:
                    $chave = $mov->created_at->format('Y-m-d');
                    $label = $chave;
            }

            if (!isset($agrupado[$chave])) {
                $agrupado[$chave] = [
                    'chave' => $chave,
                    'label' => $label,
                    'entradas' => 0,
                    'saidas' => 0,
                    'total' => 0,
                ];
            }

            $qty = abs($mov->quantidade);
            if ($mov->tipo === 'entrada') {
                $agrupado[$chave]['entradas'] += $qty;
            } else {
                $agrupado[$chave]['saidas'] += $qty;
            }
            $agrupado[$chave]['total'] += $qty;
        }

        return array_values($agrupado);
    }
}