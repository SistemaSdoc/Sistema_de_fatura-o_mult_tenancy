<?php

namespace App\Services;

use App\Models\Shared\Produto as SharedProduto;
use App\Models\Shared\Venda as SharedVenda;
use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Shared\Cliente as SharedCliente;
use App\Models\Shared\User as SharedUser; // importado

use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Tenant\Venda as TenantVenda;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Tenant\Cliente as TenantCliente;
use App\Models\Tenant\User as TenantUser; //  importado

use App\Models\Empresa;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
/**
 * DashboardService - Versão Otimizada
 *
 * ✅ SuporTa ambos os modos (colectivo / singular)
 * ✅ Cache integrado para reduzir carga no banco
 * ✅ Consultas agregadas para KPIs (uma única query)
 * ✅ Uso centralizado do scope tenant (aplicarScopeTenant)
 * ✅ Filtros de período nos rankings de produtos/serviços
 * ✅ Menos repetição de código
 */
class DashboardService
{
    protected ?Empresa $empresa;
    protected string $modo;
    protected ?object $tenantUser = null;


    // Tempo de cache (minutos)
    protected const CACHE_TTL = 5;

    public function __construct()
    {
        $this->modo = $this->empresa?->modo ?? 'colectivo';
    }



    public function getEmpresa(): ?Empresa
{
    // Se ainda não foi definida, tenta obtê-la
    if (!$this->empresa) {
        $this->empresa = app('current.empresa');
    }
    return $this->empresa;
}

public function getModo(): string
{
    if (!$this->modo && $this->empresa) {
        $this->modo = $this->empresa->modo ?? 'colectivo';
    }
    return $this->modo;
}

public function getUser(): ?object
{
    return $this->tenantUser;
}



protected function verificarAcessoUsuario(): void
{
    // 1️⃣ Obtém a empresa
    $this->empresa = app('current.empresa');
    if (!$this->empresa) {
        Log::error('StockService: Empresa não identificada.');
        throw new \Exception('Empresa não identificada.', 400);
    }
    $this->modo = $this->empresa->modo ?? 'colectivo';

    // 2️⃣ Tenta obter via guard landlord
    $landlordUser = Auth::guard('landlord')->user();

    // 3️⃣ Fallback: se falhar, tenta obter da sessão
    if (!$landlordUser) {
        $landlordId = session('landlord_user_id');
        if ($landlordId) {
            $landlordUser = \App\Models\LandlordUser::find($landlordId);
        }
        if ($landlordUser) {
            Log::info('StockService: LandlordUser obtido via sessão (fallback)');
        }
    }

    if (!$landlordUser) {
        Log::error('StockService: Utilizador landlord não autenticado.', [
            'session' => session()->all(),
            'guard_landlord_check' => Auth::guard('landlord')->check(),
        ]);
        throw new \Exception('Usuário não autenticado.', 401);
    }

    // 4️⃣ Busca o TenantUser correspondente
    $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
    if (!$tenantUser) {
        Log::error('StockService: Utilizador tenant não encontrado para o email ' . $landlordUser->email);
        throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
    }

    $this->tenantUser = $tenantUser;
}

    protected function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        } else {
            return SharedUser::on('shared')
                ->where('email', $email)
                ->where('tenant_id', $empresa->id)
                ->first();
        }
    }




    // ============================================================
    // HELPERS: Models + Scope
    // ============================================================

    protected function isColectivo(): bool
    {
        return $this->modo === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->modo === 'singular';
    }

    protected function model(string $type)
    {
        return match ($type) {
            'produto' => $this->isColectivo() ? new SharedProduto() : new TenantProduto(),
            'venda'   => $this->isColectivo() ? new SharedVenda() : new TenantVenda(),
            'documento' => $this->isColectivo() ? new SharedDocumentoFiscal() : new TenantDocumentoFiscal(),
            'cliente' => $this->isColectivo() ? new SharedCliente() : new TenantCliente(),
            default   => throw new \InvalidArgumentException("Tipo de modelo inválido: $type"),
        };
    }

    /**
     * Aplica o scope do tenant à query (apenas para colectivo)
     */
    protected function aplicarScopeTenant($query)
    {
        if ($this->isColectivo()) {
            return $query->doTenant();
        }
        return $query;
    }

    /**
     * Obtém uma query base com scope aplicado
     */
    protected function queryComScope(string $modelType)
    {
        $model = $this->model($modelType);
        return $this->aplicarScopeTenant($model->query());
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


     // ============================================================
    // MÉTODO PRINCIPAL (com cache)
    // ============================================================

    public function getDashboard(): array
{
    try {
        // Verifica acesso e preenche $this->tenantUser
        $this->verificarAcessoUsuario();

        $cacheKey = 'dashboard_' . $this->empresa->id . '_' . $this->tenantUser->id;
        return Cache::remember($cacheKey, self::CACHE_TTL, function () {
            return $this->calcularDashboard();
        });
    } catch (\Exception $e) {
        Log::error('Erro ao calcular dashboard:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
        throw $e;
    }
}

    // ============================================================
    // CÁLCULO DO DASHBOARD (sem cache, chamado internamente)
    // ============================================================

    private function calcularDashboard(): array
    {
        $hoje        = Carbon::now();
        $mesAtual    = $hoje->month;
        $anoAtual    = $hoje->year;
        $mesAnterior = $hoje->copy()->subMonth()->month;
        $anoAnterior = $hoje->copy()->subMonth()->year;

        return [
            'kpis'             => $this->calcularKPIsAgregado($mesAtual, $anoAtual, $mesAnterior, $anoAnterior),
            'produtos'         => $this->getDadosProdutos(),
            'vendas'           => $this->getDadosVendas(),
            'documentos_fiscais' => $this->getDadosDocumentosFiscais($hoje),
            'pagamentos'       => $this->getDadosPagamentos($hoje),
            'clientes'         => $this->getDadosClientes($mesAtual, $anoAtual),
            'indicadores'      => [
                'produtosMaisVendidos' => $this->getProdutosMaisVendidos(30), // últimos 30 dias
                'servicosMaisVendidos' => $this->getServicosMaisVendidos(30),
            ],
            'alertas' => $this->calcularAlertas(),
            'periodo' => [
                'mes_atual'    => $mesAtual,
                'ano_atual'    => $anoAtual,
                'mes_anterior' => $mesAnterior,
                'ano_anterior' => $anoAnterior,
            ],
        ];
    }

    // ============================================================
    // KPIs OTIMIZADOS (UMA ÚNICA CONSULTA AGREGADA)
    // ============================================================

    private function calcularKPIsAgregado(int $mesAtual, int $anoAtual, int $mesAnterior, int $anoAnterior): array
    {
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;
        $tiposVenda = [
            $documentoModel::TIPO_FATURA,
            $documentoModel::TIPO_FATURA_RECIBO,
        ];

        $query = $this->queryComScope('documento')
            ->whereNotIn('estado', [$cancelado]);

        // Construção da query com CASE para múltiplas agregações
        $result = (clone $query)
            ->select([
                DB::raw("COUNT(DISTINCT id) as total_documentos"),
                DB::raw("SUM(CASE WHEN tipo_documento IN ('" . implode("','", $tiposVenda) . "') THEN total_liquido ELSE 0 END) as total_faturado"),
                DB::raw("SUM(total_iva) as total_iva"),
                DB::raw("SUM(total_retencao) as total_retencao"),
                // Receita mês atual
                DB::raw("SUM(CASE WHEN tipo_documento IN ('" . implode("','", $tiposVenda) . "') AND MONTH(data_emissao) = $mesAtual AND YEAR(data_emissao) = $anoAtual THEN total_liquido ELSE 0 END) as receita_mes_atual"),
                // Receita mês anterior
                DB::raw("SUM(CASE WHEN tipo_documento IN ('" . implode("','", $tiposVenda) . "') AND MONTH(data_emissao) = $mesAnterior AND YEAR(data_emissao) = $anoAnterior THEN total_liquido ELSE 0 END) as receita_mes_anterior"),
            ])
            ->first();

        $totalDocumentos = $result->total_documentos ?? 0;
        $totalFaturado   = $result->total_faturado ?? 0;
        $totalNotasCredito = $result->total_notas_credito ?? 0;
        $totalLiquido    = $totalFaturado - $totalNotasCredito;
        $ticketMedio     = $totalDocumentos > 0 ? round($totalLiquido / $totalDocumentos, 2) : 0;

        $receitaMesAtual   = $result->receita_mes_atual ?? 0;
        $receitaMesAnterior = $result->receita_mes_anterior ?? 0;
        $crescimentoPercentual = $receitaMesAnterior > 0
            ? round((($receitaMesAtual - $receitaMesAnterior) / $receitaMesAnterior) * 100, 2)
            : 0;

        return [
            'ticketMedio'           => $ticketMedio,
            'crescimentoPercentual' => $crescimentoPercentual,
            'ivaArrecadado'         => $result->total_iva ?? 0,
            'totalFaturado'         => $totalFaturado,
            'totalNotasCredito'     => $totalNotasCredito,
            'totalLiquido'          => $totalLiquido,
            'totalRetencao'         => $result->total_retencao ?? 0,
        ];
    }

    // ============================================================
    // PRODUTOS
    // ============================================================

    private function getDadosProdutos(): array
    {
        $query = $this->queryComScope('produto');
        return [
            'total'       => (clone $query)->count(),
            'ativos'      => (clone $query)->where('status', 'ativo')->count(),
            'inativos'    => (clone $query)->where('status', 'inativo')->count(),
            'stock_baixo' => (clone $query)->whereColumn('estoque_atual', '<=', 'estoque_minimo')->count(),
            'servicos'    => [
                'total'        => (clone $query)->where('tipo', 'servico')->count(),
                'ativos'       => (clone $query)->where('tipo', 'servico')->where('status', 'ativo')->count(),
                'com_retencao' => (clone $query)->where('tipo', 'servico')->where('taxa_retencao', '>', 0)->count(),
            ],
        ];
    }

    // ============================================================
    // VENDAS
    // ============================================================

    private function getDadosVendas(): array
    {
        $query = $this->queryComScope('venda');

        $ultimasVendas = (clone $query)
            ->with('documentoFiscal', 'cliente')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($v) => [
                'id'               => $v->id,
                'cliente'          => $v->cliente?->nome ?? 'Consumidor Final',
                'total'            => $v->total,
                'status'           => $v->status,
                'estado_pagamento' => $v->estado_pagamento,
                'documento_fiscal' => $v->documentoFiscal ? [
                    'tipo'           => $v->documentoFiscal->tipo_documento,
                    'numero'         => $v->documentoFiscal->numero_documento,
                    'estado'         => $v->documentoFiscal->estado,
                    'total_retencao' => $v->documentoFiscal->total_retencao,
                ] : null,
                'data' => $v->created_at->format('Y-m-d H:i'),
            ])
            ->toArray();

        return [
            'total'      => (clone $query)->count(),
            'abertas'    => (clone $query)->where('status', 'aberta')->count(),
            'faturadas'  => (clone $query)->where('status', 'faturada')->count(),
            'canceladas' => (clone $query)->where('status', 'cancelada')->count(),
            'ultimas'    => $ultimasVendas,
        ];
    }

    // ============================================================
    // DOCUMENTOS FISCAIS
    // ============================================================

    private function getDadosDocumentosFiscais(Carbon $hoje): array
    {
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;

        $query = $this->queryComScope('documento')
            ->whereNotIn('estado', [$cancelado]);

        $ultimosDocumentos = (clone $query)
            ->with('cliente')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($d) => [
                'id'               => $d->id,
                'tipo'             => $d->tipo_documento,
                'tipo_nome'        => $d->tipo_documento_nome,
                'numero'           => $d->numero_documento,
                'cliente'          => $d->cliente?->nome ?? 'Consumidor Final',
                'total'            => $d->total_liquido,
                'total_retencao'   => $d->total_retencao,
                'estado'           => $d->estado,
                'estado_pagamento' => $this->determinarEstadoPagamento($d),
                'data'             => $d->created_at->format('Y-m-d H:i'),
            ])
            ->toArray();

        return [
            'total'      => (clone $query)->count(),
            'por_tipo'   => $this->getDocumentosPorTipo(),
            'por_estado' => $this->getDocumentosPorEstado(),
            'ultimos'    => $ultimosDocumentos,
            'por_mes'    => $this->getDocumentosPorMes(),
            'por_dia'    => $this->getDocumentosPorDia($hoje),
        ];
    }

    // ============================================================
    // DOCUMENTOS POR TIPO / ESTADO / MÊS / DIA (com scope centralizado)
    // ============================================================

    private function getDocumentosPorTipo(): array
    {
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;

        $query = $this->queryComScope('documento')
            ->whereNotIn('estado', [$cancelado])
            ->select(
                'tipo_documento',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as valor'),
                DB::raw('SUM(total_retencao) as retencao')
            )
            ->groupBy('tipo_documento');

        return $query->get()
            ->mapWithKeys(fn ($item) => [
                $item->tipo_documento => [
                    'nome'       => $this->nomeTipoDocumento($item->tipo_documento),
                    'quantidade' => $item->quantidade,
                    'valor'      => $item->valor,
                    'retencao'   => $item->retencao,
                ],
            ])
            ->toArray();
    }

    private function getDocumentosPorEstado(): array
    {
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;

        $query = $this->queryComScope('documento')
            ->whereNotIn('estado', [$cancelado])
            ->select(
                'tipo_documento',
                'estado',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as valor_total'),
                DB::raw('SUM(total_retencao) as retencao')
            )
            ->groupBy('tipo_documento', 'estado');

        return $query->get()
            ->groupBy('tipo_documento')
            ->map(fn($grupo) => [
                'tipo'             => $grupo->first()->tipo_documento,
                'por_estado'       => $grupo->mapWithKeys(fn($item) => [
                    $item->estado => [
                        'quantidade' => $item->quantidade,
                        'valor'      => $item->valor_total,
                        'retencao'   => $item->retencao,
                    ],
                ])->toArray(),
                'total_quantidade' => $grupo->sum('quantidade'),
                'total_valor'      => $grupo->sum('valor_total'),
                'total_retencao'   => $grupo->sum('retencao'),
            ])
            ->values()
            ->toArray();
    }

    private function getDocumentosPorMes(): array
    {
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;

        $query = $this->queryComScope('documento')
            ->whereNotIn('estado', [$cancelado])
            ->select(
                DB::raw("DATE_FORMAT(data_emissao, '%Y-%m') as mes"),
                'tipo_documento',
                DB::raw('SUM(total_liquido) as total'),
                DB::raw('SUM(total_retencao) as retencao')
            )
            ->groupBy('mes', 'tipo_documento')
            ->orderBy('mes');

        return $query->get()
            ->groupBy('mes')
            ->map(fn ($grupo) => [
                'mes'      => Carbon::createFromFormat('Y-m', $grupo->first()->mes)->format('m/Y'),
                'FT'       => $grupo->firstWhere('tipo_documento', 'FT')?->total ?? 0,
                'FR'       => $grupo->firstWhere('tipo_documento', 'FR')?->total ?? 0,
                'NC'       => $grupo->firstWhere('tipo_documento', 'NC')?->total ?? 0,
                'ND'       => $grupo->firstWhere('tipo_documento', 'ND')?->total ?? 0,
                'total'    => $grupo->sum('total'),
                'retencao' => $grupo->sum('retencao'),
            ])
            ->values()
            ->toArray();
    }

    private function getDocumentosPorDia(Carbon $hoje): array
    {
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;

        $query = $this->queryComScope('documento')
            ->whereNotIn('estado', [$cancelado])
            ->where('data_emissao', '>=', $hoje->copy()->subDays(30))
            ->select(
                DB::raw('DATE(data_emissao) as dia'),
                DB::raw('SUM(total_liquido) as total'),
                DB::raw('SUM(total_retencao) as retencao')
            )
            ->groupBy('dia')
            ->orderBy('dia');

        return $query->get()
            ->map(fn ($item) => [
                'dia'      => Carbon::parse($item->dia)->format('d/m'),
                'total'    => $item->total,
                'retencao' => $item->retencao,
            ])
            ->values()
            ->toArray();
    }

    // ============================================================
    // PAGAMENTOS
    // ============================================================

    private function getDadosPagamentos(Carbon $hoje): array
    {
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;

        $documentosDebito = [
            $documentoModel::TIPO_FATURA,
            $documentoModel::TIPO_NOTA_DEBITO,
            $documentoModel::TIPO_FATURA_RECIBO,
        ];

        $query = $this->queryComScope('documento');

        $pagamentosHoje = (clone $query)
            ->where('tipo_documento', $documentoModel::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->whereDate('data_emissao', $hoje->toDateString())
            ->sum('total_liquido');

        $totalPendente = (clone $query)
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->sum('total_liquido');

        $totalAtrasado = (clone $query)
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->sum('total_liquido');

        return [
            'hoje'           => $pagamentosHoje,
            'total_pendente' => $totalPendente,
            'total_atrasado' => $totalAtrasado,
            'metodos'        => $this->getMetodosPagamento(),
        ];
    }

    private function getMetodosPagamento(): array
    {
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;

        $query = $this->queryComScope('documento')
            ->where('tipo_documento', $documentoModel::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->select(
                'metodo_pagamento',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as valor_total')
            )
            ->groupBy('metodo_pagamento');

        return $query->get()
            ->map(fn ($p) => [
                'metodo'      => $p->metodo_pagamento,
                'metodo_nome' => $this->nomeMetodoPagamento($p->metodo_pagamento),
                'quantidade'  => $p->quantidade,
                'valor_total' => $p->valor_total,
            ])
            ->toArray();
    }

    // ============================================================
    // CLIENTES
    // ============================================================

    private function getDadosClientes(int $mesAtual, int $anoAtual): array
    {
        $query = $this->queryComScope('cliente');
        return [
            'ativos'    => (clone $query)->where('status', 'ativo')->count(),
            'inativos'  => (clone $query)->where('status', 'inativo')->count(),
            'novos_mes' => (clone $query)
                ->whereMonth('created_at', $mesAtual)
                ->whereYear('created_at', $anoAtual)
                ->count(),
        ];
    }

    // ============================================================
    // RANKINGS OTIMIZADOS (com período)
    // ============================================================

private function getProdutosMaisVendidos(int $dias = 30): array
{
    $documentoModel = $this->model('documento');
    $cancelado = $documentoModel::ESTADO_CANCELADO;
    $dataLimite = Carbon::now()->subDays($dias);

    $query = DB::table('documentos_fiscais')
        ->join('itens_documento_fiscal', 'documentos_fiscais.id', '=', 'itens_documento_fiscal.documento_fiscal_id')
        ->join('produtos', 'produtos.id', '=', 'itens_documento_fiscal.produto_id')
        ->whereIn('documentos_fiscais.tipo_documento', [
            $documentoModel::TIPO_FATURA,
            $documentoModel::TIPO_FATURA_RECIBO,
        ])
        ->whereNotIn('documentos_fiscais.estado', [$cancelado])
        ->where('produtos.tipo', 'produto')
        ->where('documentos_fiscais.data_emissao', '>=', $dataLimite);

    // ⭐ APLICAR FILTRO DE TENANT (com qualificação)
    if ($this->isColectivo() && $this->empresa) {
        $query->where('documentos_fiscais.tenant_id', $this->empresa->id);
    }

    $query->select(
        'produtos.nome as produto',
        'produtos.codigo',
        DB::raw('SUM(itens_documento_fiscal.quantidade) as quantidade'),
        DB::raw('SUM(itens_documento_fiscal.total_linha) as valor_total')
    )
    ->groupBy('produtos.id', 'produtos.nome', 'produtos.codigo')
    ->orderByDesc('quantidade')
    ->limit(5);

    return $query->get()->toArray();
}

private function getServicosMaisVendidos(int $dias = 30): array
{
    $documentoModel = $this->model('documento');
    $cancelado = $documentoModel::ESTADO_CANCELADO;
    $dataLimite = Carbon::now()->subDays($dias);

    $query = DB::table('documentos_fiscais')
        ->join('itens_documento_fiscal', 'documentos_fiscais.id', '=', 'itens_documento_fiscal.documento_fiscal_id')
        ->join('produtos', 'produtos.id', '=', 'itens_documento_fiscal.produto_id')
        ->whereIn('documentos_fiscais.tipo_documento', [
            $documentoModel::TIPO_FATURA,
            $documentoModel::TIPO_FATURA_RECIBO,
        ])
        ->whereNotIn('documentos_fiscais.estado', [$cancelado])
        ->where('produtos.tipo', 'servico')
        ->where('documentos_fiscais.data_emissao', '>=', $dataLimite);

    // ⭐ APLICAR FILTRO DE TENANT (com qualificação)
    if ($this->isColectivo() && $this->empresa) {
        $query->where('documentos_fiscais.tenant_id', $this->empresa->id);
    }

    $query->select(
        'produtos.nome as produto',
        'produtos.codigo',
        DB::raw('SUM(itens_documento_fiscal.quantidade) as quantidade'),
        DB::raw('SUM(itens_documento_fiscal.total_linha) as valor_total'),
        DB::raw('SUM(itens_documento_fiscal.valor_retencao) as retencao_total')
    )
    ->groupBy('produtos.id', 'produtos.nome', 'produtos.codigo')
    ->orderByDesc('quantidade')
    ->limit(5);

    return $query->get()->toArray();
}

    // ============================================================
    // ALERTAS
    // ============================================================

    private function calcularAlertas(): array
    {
        $hoje = now();
        $documentoModel = $this->model('documento');

        $documentosDebito = [
            $documentoModel::TIPO_FATURA,
            $documentoModel::TIPO_NOTA_DEBITO,
            $documentoModel::TIPO_FATURA_RECIBO,
        ];

        $query = $this->queryComScope('documento');

        $documentosVencidos = (clone $query)
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->count();

        $documentosProximos = (clone $query)
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '>=', $hoje->toDateString())
            ->whereDate('data_vencimento', '<=', $hoje->copy()->addDays(3)->toDateString())
            ->count();

        $proformasAntigas = (clone $query)
            ->where('tipo_documento', $documentoModel::TIPO_FATURA_PROFORMA)
            ->where('estado', $documentoModel::ESTADO_EMITIDO)
            ->whereDate('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
            ->count();

        $queryRetencao = (clone $query)
            ->where('total_retencao', '>', 0)
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->copy()->addDays(5)->toDateString());

        return [
            'documentos_vencidos'            => $documentosVencidos,
            'documentos_proximo_vencimento'  => $documentosProximos,
            'proformas_antigas'              => $proformasAntigas,
            'servicos_com_retencao_pendente' => (clone $queryRetencao)->count(),
            'valor_retencao_pendente'        => (clone $queryRetencao)->sum('total_retencao'),
        ];
    }

    // ============================================================
    // MÉTODOS PÚBLICOS ADICIONAIS (com cache)
    // ============================================================

    public function getResumoDocumentosFiscais(): array
    {
        $this->verificarAcessoUsuario();
        $cacheKey = 'resumo_documentos_' . $this->empresa->id;
        return Cache::remember($cacheKey, self::CACHE_TTL, function () {
            return $this->calcularResumoDocumentos();
        });
    }

    private function calcularResumoDocumentos(): array
    {
        $hoje = now();
        $documentoModel = $this->model('documento');
        $inicioMes = $hoje->copy()->startOfMonth();
        $fimMes = $hoje->copy()->endOfMonth();
        $cancelado = $documentoModel::ESTADO_CANCELADO;

        $query = $this->queryComScope('documento')
            ->whereNotIn('estado', [$cancelado]);

        $tipos = ['FT', 'FR', 'NC', 'ND', 'FP', 'FA', 'RC', 'FRt'];
        $porTipo = [];
        foreach ($tipos as $tipo) {
            $queryTipo = (clone $query)->where('tipo_documento', $tipo);
            $queryMes = (clone $queryTipo)->whereBetween('data_emissao', [$inicioMes, $fimMes]);

            $porTipo[$tipo] = [
                'nome'           => $this->nomeTipoDocumento($tipo),
                'quantidade'     => (clone $queryTipo)->count(),
                'valor_total'    => (clone $queryTipo)->sum('total_liquido'),
                'mes_atual'      => (clone $queryMes)->sum('total_liquido'),
                'retencao_total' => (clone $queryTipo)->sum('total_retencao'),
            ];
        }

        $estados = [
            $documentoModel::ESTADO_EMITIDO,
            $documentoModel::ESTADO_PAGA,
            $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            $documentoModel::ESTADO_CANCELADO,
            $documentoModel::ESTADO_EXPIRADO,
        ];
        $porEstado = [];
        foreach ($estados as $estado) {
            $porEstado[$estado] = (clone $query)->where('estado', $estado)->count();
        }

        return [
            'total_emitidos' => (clone $query)->count(),
            'por_tipo'       => $porTipo,
            'por_estado'     => $porEstado,
            'periodo'        => [
                'inicio' => $inicioMes->toDateString(),
                'fim'    => $fimMes->toDateString(),
            ],
        ];
    }

    public function getEstatisticasPagamentos(): array
    {
        $this->verificarAcessoUsuario();
        $cacheKey = 'estatisticas_pagamentos_' . $this->empresa->id;
        return Cache::remember($cacheKey, self::CACHE_TTL, function () {
            return $this->calcularEstatisticasPagamentos();
        });
    }

    private function calcularEstatisticasPagamentos(): array
    {
        $hoje = now();
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;

        $documentosDebito = [
            $documentoModel::TIPO_FATURA,
            $documentoModel::TIPO_NOTA_DEBITO,
            $documentoModel::TIPO_FATURA_RECIBO,
        ];

        $query = $this->queryComScope('documento');

        $recebidosHoje = (clone $query)
            ->where('tipo_documento', $documentoModel::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->whereDate('data_emissao', $hoje->toDateString())
            ->sum('total_liquido');

        $recebidosMes = (clone $query)
            ->where('tipo_documento', $documentoModel::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->whereMonth('data_emissao', $hoje->month)
            ->whereYear('data_emissao', $hoje->year)
            ->sum('total_liquido');

        $recebidosAno = (clone $query)
            ->where('tipo_documento', $documentoModel::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->whereYear('data_emissao', $hoje->year)
            ->sum('total_liquido');

        $pendentes = (clone $query)
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->sum('total_liquido');

        $atrasados = (clone $query)
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->get();

        $metodos = (clone $query)
            ->where('tipo_documento', $documentoModel::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->select('metodo_pagamento', DB::raw('SUM(total_liquido) as total'))
            ->groupBy('metodo_pagamento')
            ->pluck('total', 'metodo_pagamento')
            ->toArray();

        return [
            'recebidos_hoje' => $recebidosHoje,
            'recebidos_mes'  => $recebidosMes,
            'recebidos_ano'  => $recebidosAno,
            'pendentes'      => $pendentes,
            'atrasados'      => [
                'quantidade'  => $atrasados->count(),
                'valor_total' => $atrasados->sum('total_liquido'),
                'documentos'  => $atrasados->take(5)->map(fn($d) => [
                    'id'          => $d->id,
                    'numero'      => $d->numero_documento,
                    'cliente'     => $d->cliente?->nome,
                    'valor'       => $d->total_liquido,
                    'dias_atraso' => Carbon::parse($d->data_vencimento)->diffInDays($hoje),
                ])->toArray(),
            ],
            'prazo_medio_pagamento' => 0,
            'metodos_pagamento'     => $metodos,
        ];
    }

    public function getAlertasPendentes(): array
    {
        $this->verificarAcessoUsuario();
        $cacheKey = 'alertas_pendentes_' . $this->empresa->id;
        return Cache::remember($cacheKey, self::CACHE_TTL, function () {
            return $this->calcularAlertasPendentes();
        });
    }

    private function calcularAlertasPendentes(): array
    {
        $hoje = now();
        $documentoModel = $this->model('documento');
        $tresDias = $hoje->copy()->addDays(3);

        $documentosDebito = [
            $documentoModel::TIPO_FATURA,
            $documentoModel::TIPO_NOTA_DEBITO,
            $documentoModel::TIPO_FATURA_RECIBO,
        ];

        $vencidos = $this->getDocumentosVencidos($hoje, $documentosDebito);
        $proximosVencimento = $this->getDocumentosProximosVencimento($hoje, $tresDias, $documentosDebito);
        $proformasPendentes = $this->getProformasPendentes($hoje);
        $servicosRetencao = $this->getServicosRetencaoProximos($hoje, $documentosDebito);

        return [
            'vencidos' => [
                'quantidade'  => $vencidos->count(),
                'valor_total' => $vencidos->sum('valor_pendente'),
                'documentos'  => $vencidos->toArray(),
            ],
            'proximos_vencimento' => [
                'quantidade'  => $proximosVencimento->count(),
                'valor_total' => $proximosVencimento->sum('valor_pendente'),
                'documentos'  => $proximosVencimento->toArray(),
            ],
            'proformas_pendentes' => [
                'quantidade'  => $proformasPendentes->count(),
                'valor_total' => $proformasPendentes->sum('valor'),
                'documentos'  => $proformasPendentes->toArray(),
            ],
            'servicos_com_retencao_proximos' => [
                'quantidade'     => $servicosRetencao->count(),
                'valor_total'    => $servicosRetencao->sum('valor'),
                'valor_retencao' => $servicosRetencao->sum('retencao'),
                'documentos'     => $servicosRetencao->toArray(),
            ],
            'total_alertas' => $vencidos->count() + $proximosVencimento->count() + $servicosRetencao->count(),
        ];
    }

    // ============================================================
    // HELPERS INTERNOS (Alertas)
    // ============================================================

    private function getDocumentosVencidos(Carbon $hoje, array $documentosDebito)
    {
        $documentoModel = $this->model('documento');
        $query = $this->queryComScope('documento')
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10);

        return $query->get()->map(fn ($d) => [
            'id'              => $d->id,
            'tipo'            => $d->tipo_documento,
            'numero'          => $d->numero_documento,
            'cliente'         => $d->cliente?->nome,
            'valor'           => $d->total_liquido,
            'valor_pendente'  => $d->total_liquido,
            'retencao'        => $d->total_retencao,
            'data_vencimento' => $d->data_vencimento,
            'dias_atraso'     => Carbon::parse($d->data_vencimento)->diffInDays($hoje),
        ]);
    }

    private function getDocumentosProximosVencimento(Carbon $hoje, Carbon $tresDias, array $documentosDebito)
    {
        $documentoModel = $this->model('documento');
        $query = $this->queryComScope('documento')
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '>=', $hoje->toDateString())
            ->whereDate('data_vencimento', '<=', $tresDias->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10);

        return $query->get()->map(fn ($d) => [
            'id'                  => $d->id,
            'tipo'                => $d->tipo_documento,
            'numero'              => $d->numero_documento,
            'cliente'             => $d->cliente?->nome,
            'valor'               => $d->total_liquido,
            'valor_pendente'      => $d->total_liquido,
            'retencao'            => $d->total_retencao,
            'data_vencimento'     => $d->data_vencimento,
            'dias_ate_vencimento' => $hoje->diffInDays(Carbon::parse($d->data_vencimento)),
        ]);
    }

    private function getProformasPendentes(Carbon $hoje)
    {
        $documentoModel = $this->model('documento');
        $query = $this->queryComScope('documento')
            ->where('tipo_documento', $documentoModel::TIPO_FATURA_PROFORMA)
            ->where('estado', $documentoModel::ESTADO_EMITIDO)
            ->whereDate('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
            ->with('cliente')
            ->orderBy('data_emissao')
            ->limit(10);

        return $query->get()->map(fn ($d) => [
            'id'             => $d->id,
            'tipo'           => $d->tipo_documento,
            'numero'         => $d->numero_documento,
            'cliente'        => $d->cliente?->nome,
            'valor'          => $d->total_liquido,
            'data_emissao'   => $d->data_emissao,
            'dias_pendentes' => Carbon::parse($d->data_emissao)->diffInDays($hoje),
        ]);
    }

    private function getServicosRetencaoProximos(Carbon $hoje, array $documentosDebito)
    {
        $documentoModel = $this->model('documento');
        $query = $this->queryComScope('documento')
            ->where('total_retencao', '>', 0)
            ->whereIn('tipo_documento', $documentosDebito)
            ->whereIn('estado', [
                $documentoModel::ESTADO_EMITIDO,
                $documentoModel::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '>=', $hoje->toDateString())
            ->whereDate('data_vencimento', '<=', $hoje->copy()->addDays(5)->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10);

        return $query->get()->map(fn ($d) => [
            'id'                  => $d->id,
            'numero'              => $d->numero_documento,
            'cliente'             => $d->cliente?->nome,
            'valor'               => $d->total_liquido,
            'retencao'            => $d->total_retencao,
            'data_vencimento'     => $d->data_vencimento,
            'dias_ate_vencimento' => $hoje->diffInDays(Carbon::parse($d->data_vencimento)),
        ]);
    }

    // ============================================================
    // EVOLUÇÃO MENSAL
    // ============================================================

    public function getEvolucaoMensal(int $ano): array
    {
        $this->verificarAcessoUsuario();
        $cacheKey = 'evolucao_mensal_' . $this->empresa->id . '_' . $ano;
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($ano) {
            return $this->calcularEvolucaoMensal($ano);
        });
    }

    private function calcularEvolucaoMensal(int $ano): array
    {
        $documentoModel = $this->model('documento');
        $cancelado = $documentoModel::ESTADO_CANCELADO;
        $meses = [];

        for ($mes = 1; $mes <= 12; $mes++) {
            $inicioMes = Carbon::create($ano, $mes, 1)->startOfMonth();
            $fimMes = Carbon::create($ano, $mes, 1)->endOfMonth();

            $query = $this->queryComScope('documento')
                ->whereNotIn('estado', [$cancelado])
                ->whereBetween('data_emissao', [$inicioMes, $fimMes]);

            $faturas = (clone $query)->where('tipo_documento', $documentoModel::TIPO_FATURA);
            $nc = (clone $query)->where('tipo_documento', $documentoModel::TIPO_NOTA_CREDITO);
            $rc = (clone $query)->where('tipo_documento', $documentoModel::TIPO_RECIBO);
            $fp = (clone $query)->where('tipo_documento', $documentoModel::TIPO_FATURA_PROFORMA);

            $valorFaturado = (clone $faturas)->sum('total_liquido');
            $valorPago = (clone $rc)->sum('total_liquido');

            $meses[] = [
                'mes'                 => $mes,
                'nome'                => $inicioMes->locale('pt_PT')->monthName,
                'faturas_emitidas'    => (clone $faturas)->count(),
                'valor_faturado'      => $valorFaturado,
                'valor_pago'          => $valorPago,
                'valor_pendente'      => max(0, $valorFaturado - $valorPago),
                'notas_credito'       => (clone $nc)->count(),
                'valor_notas_credito' => (clone $nc)->sum('total_liquido'),
                'proformas'           => (clone $fp)->count(),
                'valor_proformas'     => (clone $fp)->sum('total_liquido'),
                'retencao'            => (clone $faturas)->sum('total_retencao'),
            ];
        }

        return ['ano' => $ano, 'meses' => $meses];
    }

    // ============================================================
    // HELPERS - NOMES
    // ============================================================

    private function determinarEstadoPagamento($documento): string
    {
        $documentoModel = $this->model('documento');

        if ($documento->tipo_documento === $documentoModel::TIPO_FATURA_RECIBO) {
            return 'paga';
        }

        if (in_array($documento->tipo_documento, [
            $documentoModel::TIPO_FATURA,
            $documentoModel::TIPO_NOTA_DEBITO,
        ])) {
            $valorPago = $documento->recibos()
                ->whereNotIn('estado', [$documentoModel::ESTADO_CANCELADO])
                ->sum('total_liquido');

            if ($valorPago >= $documento->total_liquido) return 'paga';
            if ($valorPago > 0) return 'parcial';
        }

        return 'proforma';
    }

    private function nomeTipoDocumento(string $tipo): string
    {
        return match ($tipo) {
            'FT'  => 'Fatura',
            'FR'  => 'Fatura-Recibo',
            'RC'  => 'Recibo',
            'NC'  => 'Nota de Crédito',
            'ND'  => 'Nota de Débito',
            'FA'  => 'Fatura de Adiantamento',
            'FP'  => 'Fatura Proforma',
            'FRt' => 'Fatura de Retificação',
            default => 'Desconhecido',
        };
    }

    private function nomeMetodoPagamento(?string $metodo): string
    {
        return match ($metodo) {
            'transferencia' => 'Transferência Bancária',
            'multibanco'    => 'Multibanco',
            'dinheiro'      => 'Dinheiro',
            'cartao'        => 'Cartão',
            'cheque'        => 'Cheque',
            default         => 'Não especificado',
        };
    }

    // ============================================================
    // MÉTODO PARA INVALIDAR CACHE (chamar após alterações)
    // ============================================================

    public function invalidarCache(): void
    {
        if ($this->empresa) {
            $prefix = 'dashboard_' . $this->empresa->id;
            Cache::forget($prefix);
            Cache::forget('resumo_documentos_' . $this->empresa->id);
            Cache::forget('estatisticas_pagamentos_' . $this->empresa->id);
            Cache::forget('alertas_pendentes_' . $this->empresa->id);
            // Nota: evolução mensal tem chave com ano, seria necessário varrer ou invalidar todos os anos
            // Podemos usar tags de cache se suportado (ex: Redis)
            Log::info('Cache do dashboard invalidado para empresa ' . $this->empresa->id);
        }
    }

    // Adicionar ao DashboardService

/**
 * Obtém estatísticas de serviços
 */
public function getEstatisticasServicos(): array
{
    $this->verificarAcessoUsuario();
    $cacheKey = 'estatisticas_servicos_' . $this->empresa->id;
    return Cache::remember($cacheKey, self::CACHE_TTL, function () {
        return $this->calcularEstatisticasServicos();
    });
}

/**
 * Calcula as estatísticas de serviços
 */
private function calcularEstatisticasServicos(): array
{
    $produtoModel = $this->model('produto');
    $documentoModel = $this->model('documento');

    $queryProdutos = $this->aplicarScopeTenant($produtoModel->query());
    $queryDocumentos = $this->aplicarScopeTenant($documentoModel->query());

    $totalServicos  = (clone $queryProdutos)->where('tipo', 'servico')->count();
    $servicosAtivos = (clone $queryProdutos)->where('tipo', 'servico')->where('status', 'ativo')->count();
    $precoMedio     = (clone $queryProdutos)->where('tipo', 'servico')->where('status', 'ativo')->avg('preco_venda') ?? 0;

    $cancelado = $documentoModel::ESTADO_CANCELADO;

    $retencoesMes = (clone $queryDocumentos)
        ->where('estado', '!=', $cancelado)
        ->whereMonth('data_emissao', now()->month)
        ->whereYear('data_emissao', now()->year)
        ->sum('total_retencao') ?? 0;

    $retencoesAnt = (clone $queryDocumentos)
        ->where('estado', '!=', $cancelado)
        ->whereMonth('data_emissao', now()->subMonth()->month)
        ->whereYear('data_emissao', now()->subMonth()->year)
        ->sum('total_retencao') ?? 0;

    $variacao = $retencoesAnt > 0
        ? round((($retencoesMes - $retencoesAnt) / $retencoesAnt) * 100, 2)
        : 0;

    // Top 5 serviços (últimos 30 dias)
    $topServicos = $this->getServicosMaisVendidos(30);

    return [
        'servicos' => [
            'total'                 => $totalServicos,
            'ativos'                => $servicosAtivos,
            'inativos'              => $totalServicos - $servicosAtivos,
            'preco_medio'           => round($precoMedio, 2),
            'preco_medio_formatado' => $this->formatarKz($precoMedio),
        ],
        'retencoes' => [
            'periodo'                    => round($retencoesMes, 2),
            'periodo_formatado'          => $this->formatarKz($retencoesMes),
            'periodo_anterior'           => round($retencoesAnt, 2),
            'periodo_anterior_formatado' => $this->formatarKz($retencoesAnt),
            'variacao'                   => $variacao,
            'variacao_sinal'             => $variacao >= 0 ? '+' : '',
        ],
        'top_servicos' => $topServicos,
    ];
}

/**
 * Obtém ranking de serviços com filtro de período
 */
public function getRankingServicos(string $periodo = 'mes', int $limite = 10): array
{
    $this->verificarAcessoUsuario();
    $cacheKey = 'ranking_servicos_' . $this->empresa->id . '_' . $periodo . '_' . $limite;
    return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($periodo, $limite) {
        return $this->calcularRankingServicos($periodo, $limite);
    });
}

/**
 * Calcula o ranking de serviços
 */
private function calcularRankingServicos(string $periodo, int $limite): array
{
    $documentoModel = $this->model('documento');
    $cancelado = $documentoModel::ESTADO_CANCELADO;

    $dataLimite = match ($periodo) {
        'mes'       => now()->startOfMonth(),
        'trimestre' => now()->subMonths(3),
        'ano'       => now()->startOfYear(),
        default     => now()->subYears(10), // 'todo'
    };

    // Query base com scope
    $query = $this->aplicarScopeTenant($documentoModel->query())
        ->join('itens_documento_fiscal', 'documentos_fiscais.id', '=', 'itens_documento_fiscal.documento_fiscal_id')
        ->join('produtos', 'produtos.id', '=', 'itens_documento_fiscal.produto_id')
        ->where('produtos.tipo', 'servico')
        ->where('documentos_fiscais.estado', '!=', $cancelado);

    // Aplicar período
    if ($periodo !== 'todo') {
        $query->where('documentos_fiscais.data_emissao', '>=', $dataLimite);
    }

    $ranking = $query->select(
        'produtos.id',
        'produtos.nome',
        DB::raw('SUM(itens_documento_fiscal.quantidade) as total_quantidade'),
        DB::raw('SUM(itens_documento_fiscal.total_linha) as total_receita'),
        DB::raw('SUM(itens_documento_fiscal.valor_retencao) as total_retencao'),
        DB::raw('COUNT(DISTINCT documentos_fiscais.id) as total_documentos')
    )
    ->groupBy('produtos.id', 'produtos.nome')
    ->orderByDesc('total_receita')
    ->limit($limite)
    ->get()
    ->map(fn ($item, $index) => [
        'posicao'             => $index + 1,
        'id'                  => $item->id,
        'nome'                => $item->nome,
        'quantidade'          => (int) $item->total_quantidade,
        'documentos'          => (int) $item->total_documentos,
        'receita'             => round($item->total_receita, 2),
        'receita_formatada'   => $this->formatarKz($item->total_receita),
        'retencao'            => round($item->total_retencao, 2),
        'retencao_formatada'  => $this->formatarKz($item->total_retencao),
        'percentual_retencao' => $item->total_receita > 0
            ? round(($item->total_retencao / $item->total_receita) * 100, 2)
            : 0,
    ]);

    return $ranking;
}




/**
 * Formata valor monetário em Kz
 */
private function formatarKz(float|int|null $valor): string
{
    return number_format((float) $valor, 2, ',', '.') . ' Kz';
}
}
