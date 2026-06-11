<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RelatoriosService;
use App\Models\Tenant\DocumentoFiscal;
use App\Models\Tenant\MovimentoStock;
use App\Models\Tenant\Venda;
use App\Models\Tenant\Produto;
use App\Models\Tenant\Cliente;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\SaftService;
use App\Services\SaftAlertService;
use App\Models\Empresa;

class RelatoriosController extends Controller
{
    protected $relatoriosService;

    public function __construct(RelatoriosService $relatoriosService)
    {
        $this->relatoriosService = $relatoriosService;
    }

    /**
     * Retorna o utilizador autenticado pelo guard correto (tenant).
     */
    private function getAuthUser()
    {
        $user = auth('tenant')->user();

        if (!$user) {
            $user = auth()->user();
        }

        return $user;
    }

    /**
     * Método auxiliar para controlar permissões
     */
    private function authorizeRelatorio(string $tipo = 'basico')
    {
        $user = $this->getAuthUser();

        if (!$user) {
            Log::warning('Tentativa de acesso a relatório SEM usuário autenticado', [
                'ip'                   => request()->ip(),
                'route'                => request()->route()?->getName(),
                'authorization_header' => request()->header('Authorization') ? 'PRESENTE' : 'AUSENTE',
            ]);
            abort(401, 'Usuário não autenticado. Por favor, faça login.');
        }

        $role = $user->role ?? null;

        if (!$role && method_exists($user, 'roles')) {
            $role = $user->roles()->pluck('name')->first() ?? null;
        }

        Log::info('Acesso a relatório', [
            'user_id'        => $user->id,
            'user_name'      => $user->name,
            'user_email'     => $user->email,
            'user_role'      => $role,
            'tipo_relatorio' => $tipo,
            'ip'             => request()->ip(),
            'route'          => request()->route()?->getName(),
            'guard_usado'    => auth('tenant')->check() ? 'tenant' : 'default',
        ]);

        $rolesBasicos = [
            'admin',
            'contablista',
            'gestor',
            'vendedor',
            'gerente_vendas',
            'armazem',
            'gerente_armazem',
            'diretor',
            'supervisor',
        ];

        if (!$role) {
            Log::warning('Acesso negado - usuário SEM role definido', [
                'user_id'   => $user->id,
                'user_name' => $user->name,
            ]);
            abort(403, "Seu usuário não tem role definido. Contacte o administrador.");
        }

        if (!in_array($role, $rolesBasicos)) {
            Log::warning('Acesso negado - role não autorizado para relatórios', [
                'user_id'          => $user->id,
                'user_name'        => $user->name,
                'user_role'        => $role,
                'roles_permitidos' => $rolesBasicos,
            ]);
            abort(403, "Role '{$role}' não autorizado para acessar relatórios. Roles permitidos: " . implode(', ', $rolesBasicos));
        }

        if ($tipo === 'avancado' && $role !== 'admin') {
            Log::warning('Acesso negado - relatório avançado requer admin', [
                'user_id'   => $user->id,
                'user_role' => $role,
            ]);
            abort(403, 'Apenas administradores podem acessar relatórios avançados.');
        }

        Log::info('Autorização concedida para relatório', [
            'user_id'   => $user->id,
            'user_role' => $role,
            'tipo'      => $tipo,
        ]);
    }

    /**
     * Endpoint de debug
     * GET /api/relatorios/debug
     */
    public function debug()
    {
        $user      = $this->getAuthUser();
        $token     = request()->header('Authorization');
        $guardUsed = auth('tenant')->check() ? 'tenant' : (auth()->check() ? 'default' : 'nenhum');

        return response()->json([
            'authenticated' => !!$user,
            'guard_usado'   => $guardUsed,
            'user'          => $user ? [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role ?? 'SEM ROLE',
            ] : null,
            'token_present' => !!$token,
            'token_type'    => $token ? explode(' ', $token)[0] : null,
            'tenant'        => session('tenant_id'),
            'ip'            => request()->ip(),
        ]);
    }

    /**
     * Dashboard geral com indicadores principais
     * GET /api/relatorios/dashboard
     *
     * REGRA SEMÂNTICA (crítica para todo o dashboard):
     *  - "Pendente de pagamento" / "cobrança" aplica-se APENAS a FT e FA.
     *  - FP (Proforma) com estado 'emitido' = "aguarda conversão em FT/FR".
     *    NÃO é dívida. NÃO entra em totais de cobrança. NÃO aparece em
     *    "documentos vencidos". É reportada num campo próprio e separado.
     */
    public function dashboard()
    {
        $this->authorizeRelatorio('basico');

        try {
            $hoje      = now();
            $inicioMes = $hoje->copy()->startOfMonth();

            $totalDocumentos = DocumentoFiscal::whereNotIn('estado', ['cancelado'])->count();

            // Apenas FT e FR para faturação real (exclui FP)
            $totalFaturado = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR'])
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_liquido');

            $totalNotasCredito = DocumentoFiscal::where('tipo_documento', 'NC')
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_liquido');

            $totalLiquido = $totalFaturado - $totalNotasCredito;

            $totalRetencaoServicos = DocumentoFiscal::whereNotIn('estado', ['cancelado'])
                ->sum('total_retencao');

            $totalRetencaoMes = DocumentoFiscal::whereBetween('data_emissao', [$inicioMes, $hoje])
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_retencao');

            $vendasMes = Venda::whereBetween('data_venda', [$inicioMes, $hoje])
                ->where('status', 'faturada')
                ->count();

            $valorVendasMes = Venda::whereBetween('data_venda', [$inicioMes, $hoje])
                ->where('status', 'faturada')
                ->sum('total');

            $totalClientes    = Cliente::count();
            $clientesNovosMes = Cliente::whereBetween('created_at', [$inicioMes, $hoje])->count();

            $totalProdutos = Produto::where('tipo', 'produto')->count();
            $totalServicos = Produto::where('tipo', 'servico')->count();
            $servicosAtivos = Produto::where('tipo', 'servico')->where('status', 'ativo')->count();

            $produtosEstoqueBaixo = Produto::where('tipo', 'produto')
                ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
                ->count();

            $produtosSemEstoque = Produto::where('tipo', 'produto')
                ->where('estoque_atual', '<=', 0)
                ->count();

            $movimentosStockHoje = MovimentoStock::whereDate('created_at', $hoje->toDateString())->count();
            $entradasHoje = MovimentoStock::whereDate('created_at', $hoje->toDateString())
                ->where('tipo', 'entrada')
                ->sum('quantidade');
            $saidasHoje = MovimentoStock::whereDate('created_at', $hoje->toDateString())
                ->where('tipo', 'saida')
                ->sum(DB::raw('ABS(quantidade)'));

            // CORRIGIDO: apenas FT e FA entram em "documentos vencidos".
            // FP nunca vence para efeitos de cobrança.
            $documentosVencidos = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FA'])
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->whereNotNull('data_vencimento')
                ->where('data_vencimento', '<', $hoje)
                ->count();

            // CORRIGIDO: proformas antigas reportadas num campo próprio,
            // sem qualquer relação com cobrança ou pagamentos em falta.
            $proformasEmAberto = DocumentoFiscal::where('tipo_documento', 'FP')
                ->where('estado', 'emitido')
                ->where('data_emissao', '<', $hoje->copy()->subDays(7))
                ->count();

            $servicosComRetencaoPendente = DocumentoFiscal::where('total_retencao', '>', 0)
                ->whereIn('tipo_documento', ['FT', 'FA'])
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->where('data_vencimento', '<', $hoje->copy()->addDays(5))
                ->count();

            // CORRIGIDO: adiantamentos pendentes de pagamento = FA emitido.
            // Separado de proformas em aberto.
            $adiantamentosPendentes = DocumentoFiscal::where('tipo_documento', 'FA')
                ->where('estado', 'emitido')
                ->count();

            $dashboard = [
                'documentos_fiscais' => [
                    'total'               => $totalDocumentos,
                    'total_faturado'      => $totalFaturado,
                    'total_notas_credito' => $totalNotasCredito,
                    'total_liquido'       => $totalLiquido,
                    'total_retencao'      => $totalRetencaoServicos,
                    'total_retencao_mes'  => $totalRetencaoMes,
                ],
                'vendas' => [
                    'total_mes' => $vendasMes,
                    'valor_mes' => $valorVendasMes,
                ],
                'clientes' => [
                    'total'     => $totalClientes,
                    'novos_mes' => $clientesNovosMes,
                ],
                'produtos' => [
                    'total'         => $totalProdutos,
                    'estoque_baixo' => $produtosEstoqueBaixo,
                    'sem_estoque'   => $produtosSemEstoque,
                ],
                'servicos' => [
                    'total'    => $totalServicos,
                    'ativos'   => $servicosAtivos,
                    'inativos' => $totalServicos - $servicosAtivos,
                ],
                'stock' => [
                    'movimentos_hoje' => $movimentosStockHoje,
                    'entradas_hoje'   => $entradasHoje,
                    'saidas_hoje'     => $saidasHoje,
                ],
                // CORRIGIDO: alertas separados por semântica.
                // "documentos_vencidos"   = FT/FA com prazo de pagamento ultrapassado.
                // "proformas_em_aberto"   = FP não convertidas há mais de 7 dias (NÃO é cobrança)
                // "adiantamentos_pendentes" = FA aguardando pagamento.
                'alertas' => [
                    'documentos_vencidos'            => $documentosVencidos,
                    'proformas_em_aberto'            => $proformasEmAberto,
                    'adiantamentos_pendentes'         => $adiantamentosPendentes,
                    'servicos_com_retencao_pendente'  => $servicosComRetencaoPendente,
                ],
                'periodo' => [
                    'inicio_mes' => $inicioMes->toDateString(),
                    'hoje'       => $hoje->toDateString(),
                ],
            ];

            return response()->json([
                'success'   => true,
                'message'   => 'Dashboard carregado com sucesso',
                'dashboard' => $dashboard,
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar dashboard:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dashboard: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Relatório de vendas detalhado
     * GET /api/relatorios/vendas
     */
    public function vendas(Request $request)
    {
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio'       => 'nullable|date',
                'data_fim'          => 'nullable|date|after_or_equal:data_inicio',
                'apenas_vendas'     => 'nullable|boolean',
                'cliente_id'        => 'nullable|uuid|exists:clientes,id',
                'tipo_documento'    => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'estado_pagamento'  => 'nullable|in:paga,pendente,parcial,cancelada',
                'agrupar_por'       => 'nullable|in:dia,mes,ano',
                'incluir_servicos'  => 'nullable|boolean',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim    = $dados['data_fim']    ?? now()->toDateString();

            $query = Venda::with(['cliente', 'documentoFiscal', 'itens.produto'])
                ->whereBetween('data_venda', [$dataInicio, $dataFim]);

            if (!empty($dados['apenas_vendas'])) {
                $query->whereHas('documentoFiscal', function ($q) {
                    $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
                });
            }

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            }

            if (!empty($dados['tipo_documento'])) {
                $query->whereHas('documentoFiscal', function ($q) use ($dados) {
                    $q->where('tipo_documento', $dados['tipo_documento']);
                });
            }

            if (!empty($dados['estado_pagamento'])) {
                $query->where('estado_pagamento', $dados['estado_pagamento']);
            }

            $vendas = $query->orderBy('data_venda', 'desc')->get();

            $totalServicos         = 0;
            $totalRetencaoServicos = 0;
            $servicosPorVenda      = [];

            foreach ($vendas as $venda) {
                $itensServicos = $venda->itens->filter(function ($item) {
                    return $item->produto && $item->produto->tipo === 'servico';
                });

                if ($itensServicos->count() > 0) {
                    $totalServicos         += $itensServicos->count();
                    $totalRetencaoServicos += $itensServicos->sum('valor_retencao');
                    $servicosPorVenda[$venda->id] = [
                        'quantidade' => $itensServicos->count(),
                        'retencao'   => $itensServicos->sum('valor_retencao'),
                    ];
                }
            }

            $totais = [
                'total_vendas'              => $vendas->count(),
                'total_valor'               => $vendas->sum('total'),
                'total_base_tributavel'     => $vendas->sum('base_tributavel'),
                'total_iva'                 => $vendas->sum('total_iva'),
                'total_retencao'            => $vendas->sum('total_retencao'),
                'total_servicos'            => $totalServicos,
                'total_retencao_servicos'   => $totalRetencaoServicos,
                'percentual_retencao_media' => $vendas->sum('base_tributavel') > 0
                    ? round(($vendas->sum('total_retencao') / $vendas->sum('base_tributavel')) * 100, 2)
                    : 0,
            ];

            $agrupado = [];
            if (!empty($dados['agrupar_por'])) {
                $agrupado = $this->agruparVendas($vendas, $dados['agrupar_por']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Relatório de vendas carregado com sucesso',
                'data'    => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim'    => $dataFim,
                    ],
                    'filtros'  => $dados,
                    'totais'   => $totais,
                    'vendas'   => $vendas->map(function ($v) use ($servicosPorVenda) {
                        $resumo = $v->resumo;
                        $resumo['tem_servicos']   = isset($servicosPorVenda[$v->id]);
                        $resumo['dados_servicos'] = $servicosPorVenda[$v->id] ?? null;
                        return $resumo;
                    }),
                    'agrupado' => $agrupado,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de vendas:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de vendas: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Relatório de documentos fiscais (detalhado)
     * GET /api/relatorios/documentos-fiscais
     */
    public function documentosFiscais(Request $request)
    {
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio'       => 'nullable|date',
                'data_fim'          => 'nullable|date|after_or_equal:data_inicio',
                'tipo'              => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'cliente_id'        => 'nullable|uuid|exists:clientes,id',
                'cliente_nome'      => 'nullable|string|max:255',
                'estado'            => 'nullable|in:emitido,paga,parcialmente_paga,cancelado,expirado',
                'apenas_vendas'     => 'nullable|boolean',
                'apenas_nao_vendas' => 'nullable|boolean',
                'com_retencao'      => 'nullable|boolean',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim    = $dados['data_fim']    ?? now()->toDateString();

            $query = DocumentoFiscal::with(['cliente'])
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
                'total_valor'      => $documentos->sum('total_liquido'),
                'total_base'       => $documentos->sum('base_tributavel'),
                'total_iva'        => $documentos->sum('total_iva'),
                'total_retencao'   => $documentos->sum('total_retencao'),
                'por_tipo'  => $documentos->groupBy('tipo_documento')
                    ->map(fn($docs) => [
                        'quantidade' => $docs->count(),
                        'valor'      => $docs->sum('total_liquido'),
                        'retencao'   => $docs->sum('total_retencao'),
                    ]),
                'por_estado' => $documentos->groupBy('estado')
                    ->map(fn($docs) => $docs->count()),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Relatório de documentos fiscais carregado com sucesso',
                'data'    => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim'    => $dataFim,
                    ],
                    'filtros'      => $dados,
                    'estatisticas' => $estatisticas,
                    'documentos'   => $documentos->map(fn($d) => array_merge($d->toArray(), [
                        'resumo' => $d->resumo,
                    ])),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de documentos fiscais:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de documentos fiscais: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Relatório de movimentos de stock
     * GET /api/relatorios/movimentos-stock
     */
    public function movimentosStock(Request $request)
    {
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio'    => 'nullable|date',
                'data_fim'       => 'nullable|date|after_or_equal:data_inicio',
                'produto_id'     => 'nullable|uuid|exists:produtos,id',
                'tipo'           => 'nullable|in:entrada,saida',
                'tipo_movimento' => 'nullable|in:compra,venda,ajuste,nota_credito,venda_cancelada,nota_credito_cancelada',
                'agrupar_por'    => 'nullable|in:dia,mes,produto,tipo_movimento',
                'paginar'        => 'nullable|boolean',
                'per_page'       => 'nullable|integer|min:5|max:200',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim    = $dados['data_fim']    ?? now()->toDateString();

            $query = MovimentoStock::with([
                'produto' => fn($q) => $q->withTrashed()->select('id', 'nome', 'codigo', 'tipo'),
                'user'    => fn($q) => $q->select('id', 'name'),
            ])
                ->whereDate('created_at', '>=', $dataInicio)
                ->whereDate('created_at', '<=', $dataFim);

            if (!empty($dados['produto_id'])) {
                $query->where('produto_id', $dados['produto_id']);
            }

            if (!empty($dados['tipo'])) {
                $query->where('tipo', $dados['tipo']);
            }

            if (!empty($dados['tipo_movimento'])) {
                $query->where('tipo_movimento', $dados['tipo_movimento']);
            }

            $totaisQuery = MovimentoStock::whereDate('created_at', '>=', $dataInicio)
                ->whereDate('created_at', '<=', $dataFim);

            if (!empty($dados['produto_id'])) {
                $totaisQuery->where('produto_id', $dados['produto_id']);
            }
            if (!empty($dados['tipo'])) {
                $totaisQuery->where('tipo', $dados['tipo']);
            }
            if (!empty($dados['tipo_movimento'])) {
                $totaisQuery->where('tipo_movimento', $dados['tipo_movimento']);
            }

            $totalMovimentos = (clone $totaisQuery)->count();
            $totalEntradas   = (clone $totaisQuery)->where('tipo', 'entrada')->sum('quantidade');
            $totalSaidas     = abs((clone $totaisQuery)->where('tipo', 'saida')->sum('quantidade'));
            $totalPorTipo    = (clone $totaisQuery)
                ->selectRaw('tipo_movimento, COUNT(*) as total, SUM(ABS(quantidade)) as quantidade_total')
                ->groupBy('tipo_movimento')
                ->get()
                ->keyBy('tipo_movimento');

            $agrupado = [];
            if (!empty($dados['agrupar_por'])) {
                $agrupado = $this->agruparMovimentos(
                    (clone $totaisQuery)->get(),
                    $dados['agrupar_por']
                );
            }

            $movimentos = ($dados['paginar'] ?? false)
                ? $query->orderBy('created_at', 'desc')->paginate($dados['per_page'] ?? 50)
                : $query->orderBy('created_at', 'desc')->get();

            $formatarMovimento = function ($m) {
                return [
                    'id'               => $m->id,
                    'produto_id'       => $m->produto_id,
                    'produto_nome'     => $m->produto?->nome ?? 'N/A',
                    'produto_codigo'   => $m->produto?->codigo ?? 'N/A',
                    'tipo'             => $m->tipo,
                    'tipo_movimento'   => $m->tipo_movimento,
                    'quantidade'       => abs($m->quantidade),
                    'estoque_anterior' => $m->estoque_anterior,
                    'estoque_novo'     => $m->estoque_novo,
                    'custo_medio'      => $m->custo_medio,
                    'referencia'       => $m->referencia,
                    'observacao'       => $m->observacao,
                    'user'             => $m->user?->name ?? 'Sistema',
                    'data'             => $m->created_at?->format('Y-m-d H:i:s'),
                ];
            };

            $movimentosFormatados = ($dados['paginar'] ?? false)
                ? $movimentos->through($formatarMovimento)
                : $movimentos->map($formatarMovimento);

            return response()->json([
                'success' => true,
                'message' => 'Relatório de movimentos de stock carregado com sucesso',
                'data'    => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim'    => $dataFim,
                    ],
                    'filtros' => $dados,
                    'resumo'  => [
                        'total_movimentos' => $totalMovimentos,
                        'total_entradas'   => $totalEntradas,
                        'total_saidas'     => $totalSaidas,
                        'balanco'          => $totalEntradas - $totalSaidas,
                        'por_tipo_movimento' => $totalPorTipo->map(fn($t) => [
                            'total'            => $t->total,
                            'quantidade_total' => $t->quantidade_total,
                        ]),
                    ],
                    'agrupado'   => $agrupado,
                    'movimentos' => $movimentosFormatados,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de movimentos de stock:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de movimentos de stock: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Relatório de pagamentos pendentes
     * GET /api/relatorios/pagamentos-pendentes
     *
     * CORRIGIDO: apenas FT e FA entram neste relatório.
     * FP (Proforma) NUNCA é um pagamento pendente — é um orçamento.
     * Para proformas em aberto, use GET /api/relatorios/proformas?pendentes=1
     */
    public function pagamentosPendentes(Request $request)
    {
        $this->authorizeRelatorio('avancado');

        try {
            $hoje = now();

            // ── Faturas FT pendentes de pagamento ─────────────────────────
            $faturasPendentes = DocumentoFiscal::where('tipo_documento', 'FT')
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->with(['cliente'])
                ->orderBy('data_vencimento', 'asc')
                ->get()
                ->map(function ($fatura) use ($hoje) {
                    $valorPago = $fatura->recibos()
                        ->where('estado', '!=', 'cancelado')
                        ->sum('total_liquido') ?? 0;

                    $valorAdiantamentos = DB::table('adiantamento_fatura')
                        ->where('fatura_id', $fatura->id)
                        ->sum('valor_utilizado');

                    $valorPendente = $fatura->total_liquido - $valorPago - $valorAdiantamentos;

                    return [
                        'id'               => $fatura->id,
                        'numero_documento' => $fatura->numero_documento,
                        'cliente'          => $fatura->cliente?->nome ?? $fatura->cliente_nome ?? 'Consumidor Final',
                        'data_emissao'     => $fatura->data_emissao,
                        'data_vencimento'  => $fatura->data_vencimento,
                        'valor_total'      => $fatura->total_liquido,
                        'valor_pendente'   => max(0, $valorPendente),
                        'retencao'         => $fatura->total_retencao,
                        'dias_atraso'      => $fatura->data_vencimento && $fatura->data_vencimento < $hoje
                            ? $hoje->diffInDays($fatura->data_vencimento)
                            : 0,
                        'estado' => $fatura->estado,
                    ];
                })
                ->filter(fn($f) => $f['valor_pendente'] > 0)
                ->values();

            // ── Adiantamentos FA pendentes de pagamento ───────────────────
            // CORRIGIDO: FA com estado 'emitido' = pagamento de adiantamento em falta.
            // Incluído neste relatório porque é genuinamente um valor a receber.
            $adiantamentosPendentes = DocumentoFiscal::where('tipo_documento', 'FA')
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->with(['cliente'])
                ->orderBy('data_vencimento', 'asc')
                ->get()
                ->map(function ($adiantamento) use ($hoje) {
                    $valorPago = $adiantamento->recibos()
                        ->where('estado', '!=', 'cancelado')
                        ->sum('total_liquido') ?? 0;

                    $valorPendente = $adiantamento->total_liquido - $valorPago;

                    return [
                        'id'               => $adiantamento->id,
                        'numero_documento' => $adiantamento->numero_documento,
                        'cliente'          => $adiantamento->cliente?->nome ?? $adiantamento->cliente_nome ?? 'Consumidor Final',
                        'data_emissao'     => $adiantamento->data_emissao,
                        'data_vencimento'  => $adiantamento->data_vencimento,
                        'valor_total'      => $adiantamento->total_liquido,
                        'valor_pendente'   => max(0, $valorPendente),
                        'dias_atraso'      => $adiantamento->data_vencimento && $adiantamento->data_vencimento < $hoje
                            ? $hoje->diffInDays($adiantamento->data_vencimento)
                            : 0,
                        'estado' => $adiantamento->estado,
                    ];
                })
                ->filter(fn($a) => $a['valor_pendente'] > 0)
                ->values();

            $totalPendente = $faturasPendentes->sum('valor_pendente')
                + $adiantamentosPendentes->sum('valor_pendente');

            $totalAtrasado = $faturasPendentes->where('dias_atraso', '>', 0)->sum('valor_pendente')
                + $adiantamentosPendentes->where('dias_atraso', '>', 0)->sum('valor_pendente');

            $retencaoPendente = $faturasPendentes->sum('retencao');

            return response()->json([
                'success' => true,
                'message' => 'Relatório de pagamentos pendentes carregado com sucesso',
                'data'    => [
                    'resumo' => [
                        'total_pendente'           => $totalPendente,
                        'total_atrasado'           => $totalAtrasado,
                        'quantidade_faturas'        => $faturasPendentes->count(),
                        'quantidade_adiantamentos' => $adiantamentosPendentes->count(),
                        'retencao_pendente'        => $retencaoPendente,
                        // NOTA: FP não aparece aqui. Para proformas em aberto,
                        // usar GET /api/relatorios/proformas?pendentes=1
                    ],
                    'faturas_pendentes'       => $faturasPendentes,
                    'adiantamentos_pendentes' => $adiantamentosPendentes,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de pagamentos pendentes:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de pagamentos pendentes: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Relatório de faturação
     * GET /api/relatorios/faturacao
     */
    public function faturacao(Request $request)
    {
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio'       => 'nullable|date',
                'data_fim'          => 'nullable|date|after_or_equal:data_inicio',
                'tipo'              => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'cliente_id'        => 'nullable|uuid|exists:clientes,id',
                'incluir_retencoes' => 'nullable|boolean',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim    = $dados['data_fim']    ?? now()->toDateString();

            $relatorio = $this->relatoriosService->relatorioFaturacao($dataInicio, $dataFim, $dados);

            if (!empty($dados['incluir_retencoes'])) {
                $retencoes = DocumentoFiscal::whereBetween('data_emissao', [$dataInicio, $dataFim])
                    ->where('total_retencao', '>', 0)
                    ->whereNotIn('estado', ['cancelado'])
                    ->with(['cliente'])
                    ->get();

                $relatorio['retencoes'] = [
                    'total'                 => $retencoes->sum('total_retencao'),
                    'quantidade_documentos' => $retencoes->count(),
                    'detalhes'              => $retencoes->map(function ($doc) {
                        return [
                            'numero'     => $doc->numero_documento,
                            'data'       => $doc->data_emissao,
                            'cliente'    => $doc->nome_cliente,
                            'total'      => $doc->total_liquido,
                            'retencao'   => $doc->total_retencao,
                            'percentual' => $doc->base_tributavel > 0
                                ? round(($doc->total_retencao / $doc->base_tributavel) * 100, 2)
                                : 0,
                        ];
                    }),
                ];
            }

            return response()->json([
                'success'   => true,
                'message'   => 'Relatório de faturação carregado com sucesso',
                'relatorio' => $relatorio,
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de faturação:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de faturação: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Relatório de proformas
     * GET /api/relatorios/proformas
     *
     * FP com estado 'emitido' = "em aberto / aguarda conversão".
     * Este é o endpoint correto para listar proformas — nunca misturar
     * com endpoints de pagamentos pendentes ou cobrança.
     */
    public function proformas(Request $request)
    {
        $this->authorizeRelatorio('basico');

        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim'    => 'nullable|date|after_or_equal:data_inicio',
                'cliente_id'  => 'nullable|uuid|exists:clientes,id',
                'pendentes'   => 'nullable|boolean',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim    = $dados['data_fim']    ?? now()->toDateString();

            $query = DocumentoFiscal::where('tipo_documento', 'FP')
                ->with(['cliente'])
                ->whereBetween('data_emissao', [$dataInicio, $dataFim]);

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            }

            // NOTA: "pendentes" aqui significa "por converter", não "por pagar".
            if (!empty($dados['pendentes'])) {
                $query->where('estado', 'emitido');
            }

            $proformas = $query->orderBy('data_emissao', 'desc')->get();

            return response()->json([
                'success' => true,
                'message' => 'Relatório de proformas carregado com sucesso',
                'data'    => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim'    => $dataFim,
                    ],
                    'total'       => $proformas->count(),
                    'valor_total' => $proformas->sum('total_liquido'),
                    'proformas'   => $proformas,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de proformas:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de proformas: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exportar SAF-T
     * GET /api/relatorios/exportar-saft?year=2026&month=5
     */
    public function exportarSaft(Request $request)
    {
        $this->authorizeRelatorio('avancado');

        try {
            $year  = (int) $request->query('year');
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
            Log::error('Erro ao exportar SAF-T', [
                'year'  => $year ?? null,
                'month' => $month ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar SAF-T: ' . $e->getMessage()
            ], 500);
        }
    }

    /* ================== MÉTODOS AUXILIARES ================== */

    private function agruparVendas($vendas, $agruparPor)
    {
        $agrupado = [];
        foreach ($vendas as $venda) {
            $chave = match ($agruparPor) {
                'dia'   => $venda->data_venda->format('Y-m-d'),
                'mes'   => $venda->data_venda->format('Y-m'),
                'ano'   => $venda->data_venda->format('Y'),
                default => $venda->data_venda->format('Y-m-d'),
            };

            if (!isset($agrupado[$chave])) {
                $agrupado[$chave] = [
                    'periodo'         => $chave,
                    'quantidade'      => 0,
                    'total'           => 0,
                    'base_tributavel' => 0,
                    'total_iva'       => 0,
                    'total_retencao'  => 0,
                ];
            }

            $agrupado[$chave]['quantidade']++;
            $agrupado[$chave]['total']          += $venda->total;
            $agrupado[$chave]['base_tributavel'] += $venda->base_tributavel;
            $agrupado[$chave]['total_iva']       += $venda->total_iva;
            $agrupado[$chave]['total_retencao']  += $venda->total_retencao;
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
                    'chave'    => $chave,
                    'label'    => $label,
                    'entradas' => 0,
                    'saidas'   => 0,
                    'total'    => 0,
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