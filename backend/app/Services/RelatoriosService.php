<?php

namespace App\Services;

use App\Models\Shared\Venda as SharedVenda;
use App\Models\Shared\Compra as SharedCompra;
use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Shared\Cliente as SharedCliente;
use App\Models\Shared\Fornecedor as SharedFornecedor;
use App\Models\Shared\MovimentoStock as SharedMovimentoStock;
use App\Models\Shared\User as SharedUser;

use App\Models\Tenant\Venda as TenantVenda;
use App\Models\Tenant\Compra as TenantCompra;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Tenant\Cliente as TenantCliente;
use App\Models\Tenant\Fornecedor as TenantFornecedor;
use App\Models\Tenant\MovimentoStock as TenantMovimentoStock;
use App\Models\Tenant\User as TenantUser;

use App\Models\Empresa;
use App\Models\LandlordUser;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Carbon\Carbon;

class RelatoriosService
{
    protected StockService $stockService;
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct()
    {
        $this->stockService = app(\App\Services\StockService::class);
        
        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[RelatoriosService] Inicializado', [
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

    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[RelatoriosService] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[RelatoriosService] Empresa não identificada.');
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
            Log::error('[RelatoriosService] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[RelatoriosService] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[RelatoriosService] Acesso verificado com sucesso', [
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

    /* =====================================================================
     | HELPERS: Models e Queries
     | ================================================================== */

    protected function vendaModel()
    {
        return $this->isColectivo() ? new SharedVenda() : new TenantVenda();
    }

    protected function compraModel()
    {
        return $this->isColectivo() ? new SharedCompra() : new TenantCompra();
    }

    protected function documentoFiscalModel()
    {
        return $this->isColectivo() ? new SharedDocumentoFiscal() : new TenantDocumentoFiscal();
    }

    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
    }

    protected function clienteModel()
    {
        return $this->isColectivo() ? new SharedCliente() : new TenantCliente();
    }

    protected function fornecedorModel()
    {
        return $this->isColectivo() ? new SharedFornecedor() : new TenantFornecedor();
    }

    protected function movimentoStockModel()
    {
        return $this->isColectivo() ? new SharedMovimentoStock() : new TenantMovimentoStock();
    }

    protected function aplicarScopeTenant($query)
    {
        if ($this->isColectivo()) {
            return $query->doTenant();
        }
        return $query;
    }

    protected function queryVendas()
    {
        if ($this->isColectivo()) {
            return SharedVenda::doTenant();
        }
        return TenantVenda::query();
    }

    protected function queryCompras()
    {
        if ($this->isColectivo()) {
            return SharedCompra::doTenant();
        }
        return TenantCompra::query();
    }

    protected function queryDocumentosFiscais()
    {
        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant();
        }
        return TenantDocumentoFiscal::query();
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

    protected function queryFornecedores()
    {
        if ($this->isColectivo()) {
            return SharedFornecedor::doTenant();
        }
        return TenantFornecedor::query();
    }

    protected function queryMovimentosStock()
    {
        if ($this->isColectivo()) {
            return SharedMovimentoStock::doTenant();
        }
        return TenantMovimentoStock::query();
    }

    /* =====================================================================
     | DASHBOARD (MANTIDO)
     | ================================================================== */

    public function dashboard()
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[RELATORIOS SERVICE] Iniciando dashboard', ['modo' => $modo]);

        $hoje      = now()->startOfDay();
        $inicioMes = now()->startOfMonth();
        $inicioAno = now()->startOfYear();

        $vendasQuery = $this->queryVendas();
        $documentosQuery = $this->queryDocumentosFiscais();
        $clientesQuery = $this->queryClientes();
        $produtosQuery = $this->queryProdutos();
        $fornecedoresQuery = $this->queryFornecedores();
        $movimentosQuery = $this->queryMovimentosStock();

        $vendasHoje = (clone $vendasQuery)
            ->whereDate('created_at', $hoje)
            ->where('status', 'faturada')
            ->sum('total');

        $vendasMes = (clone $vendasQuery)
            ->whereDate('created_at', '>=', $inicioMes)
            ->where('status', 'faturada')
            ->sum('total');

        $vendasAno = (clone $vendasQuery)
            ->whereDate('created_at', '>=', $inicioAno)
            ->where('status', 'faturada')
            ->sum('total');

        $documentosMes = (clone $documentosQuery)
            ->whereBetween('data_emissao', [$inicioMes, $hoje])
            ->count();

        $faturasPendentes = (clone $documentosQuery)
            ->where('tipo_documento', 'FT')
            ->whereIn('estado', ['emitido', 'parcialmente_paga'])
            ->count();

        $totalPendenteCobranca = (clone $documentosQuery)
            ->where('tipo_documento', 'FT')
            ->whereIn('estado', ['emitido', 'parcialmente_paga'])
            ->sum('total_liquido');

        $totalClientes = (clone $clientesQuery)->count();
        $totalProdutos = (clone $produtosQuery)->count();
        $totalFornecedores = (clone $fornecedoresQuery)->count();

        $alertasStock = (clone $produtosQuery)
            ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->count();

        $adiantamentosPendentes = (clone $documentosQuery)
            ->where('tipo_documento', 'FA')
            ->where('estado', 'emitido')
            ->count();

        $proformasEmAberto = (clone $documentosQuery)
            ->where('tipo_documento', 'FP')
            ->where('estado', 'emitido')
            ->count();

        $movimentosStockHoje = (clone $movimentosQuery)
            ->whereDate('created_at', $hoje)
            ->count();

        $entradasHoje = (clone $movimentosQuery)
            ->whereDate('created_at', $hoje)
            ->where('tipo', 'entrada')
            ->sum('quantidade');

        $saidasHoje = abs(
            (clone $movimentosQuery)
                ->whereDate('created_at', $hoje)
                ->where('tipo', 'saida')
                ->sum('quantidade')
        );

        $resultado = [
            'vendas_hoje'              => $vendasHoje,
            'vendas_mes'               => $vendasMes,
            'vendas_ano'               => $vendasAno,
            'documentos_mes'           => $documentosMes,
            'faturas_pendentes'        => $faturasPendentes,
            'total_pendente_cobranca'  => $totalPendenteCobranca,
            'adiantamentos_pendentes'  => $adiantamentosPendentes,
            'proformas_em_aberto'      => $proformasEmAberto,
            'total_clientes'           => $totalClientes,
            'total_produtos'           => $totalProdutos,
            'total_fornecedores'       => $totalFornecedores,
            'alertas_stock'            => $alertasStock,
            'movimentos_stock_hoje'    => $movimentosStockHoje,
            'entradas_stock_hoje'      => $entradasHoje,
            'saidas_stock_hoje'        => $saidasHoje,
            'modo'                     => $modo,
        ];

        Log::info('[RELATORIOS SERVICE] Dashboard processado', $resultado);

        return $resultado;
    }

    /* =====================================================================
     | RELATÓRIOS (MANTIDOS - APENAS ADICIONADO $this->getModo())
     | ================================================================== */
    /* =====================================================================
     | ✅ NOVOS MÉTODOS ADICIONADOS
     | ================================================================== */

    /**
     * ✅ Relatório de movimentos de stock
     */
    public function relatorioMovimentosStock($dataInicio = null, $dataFim = null, $filtros = [])
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de movimentos de stock', [
            'data_inicio' => $dataInicio,
            'data_fim'    => $dataFim,
            'filtros'     => $filtros,
            'modo'        => $modo,
        ]);

        try {
            $query = $this->queryMovimentosStock()->with([
                'produto' => fn($q) => $q->withTrashed()->select('id', 'nome', 'codigo', 'tipo'),
                'user'    => fn($q) => $q->select('id', 'name'),
            ]);

            if ($dataInicio) {
                $query->whereDate('created_at', '>=', $dataInicio);
            }
            if ($dataFim) {
                $query->whereDate('created_at', '<=', $dataFim);
            }
            if (!empty($filtros['produto_id'])) {
                $query->where('produto_id', $filtros['produto_id']);
            }
            if (!empty($filtros['tipo'])) {
                $query->where('tipo', $filtros['tipo']);
            }
            if (!empty($filtros['tipo_movimento'])) {
                $query->where('tipo_movimento', $filtros['tipo_movimento']);
            }

            $movimentos = $query->orderBy('created_at', 'desc')->get();

            $totalEntradas = $movimentos->where('tipo', 'entrada')->sum('quantidade');
            $totalSaidas   = abs($movimentos->where('tipo', 'saida')->sum('quantidade'));

            $porTipoMovimento = $movimentos->groupBy('tipo_movimento')->map(fn($grupo) => [
                'total'            => $grupo->count(),
                'quantidade_total' => $grupo->sum(fn($m) => abs($m->quantidade)),
                'entradas'         => $grupo->where('tipo', 'entrada')->sum('quantidade'),
                'saidas'           => abs($grupo->where('tipo', 'saida')->sum('quantidade')),
            ]);

            $lista = $movimentos->map(fn($m) => [
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
            ]);

            return [
                'resumo' => [
                    'total_movimentos'   => $movimentos->count(),
                    'total_entradas'     => $totalEntradas,
                    'total_saidas'       => $totalSaidas,
                    'balanco'            => $totalEntradas - $totalSaidas,
                    'por_tipo_movimento' => $porTipoMovimento,
                ],
                'movimentos' => $lista,
                'periodo' => [
                    'data_inicio' => $dataInicio,
                    'data_fim'    => $dataFim,
                ],
                'modo' => $modo,
            ];

        } catch (\Exception $e) {
            Log::error('[RELATORIOS SERVICE] Erro no relatório de movimentos de stock:', [
                'error' => $e->getMessage(),
            ]);

            return [
                'resumo' => [
                    'total_movimentos'   => 0,
                    'total_entradas'     => 0,
                    'total_saidas'       => 0,
                    'balanco'            => 0,
                    'por_tipo_movimento' => [],
                ],
                'movimentos' => [],
                'periodo' => [
                    'data_inicio' => $dataInicio,
                    'data_fim'    => $dataFim,
                ],
                'modo' => $modo,
            ];
        }
    }

    /**
     * ✅ Relatório de pagamentos pendentes
     */
    public function relatorioPagamentosPendentes()
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de pagamentos pendentes', ['modo' => $modo]);

        try {
            $hoje = now();
            $documentosQuery = $this->queryDocumentosFiscais();

            // ── Faturas FT pendentes de pagamento ─────────────────────────
            $faturasPendentes = (clone $documentosQuery)
                ->where('tipo_documento', 'FT')
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
                        'dias_atraso'      => $fatura->data_vencimento && $fatura->data_vencimento < $hoje
                            ? $hoje->diffInDays($fatura->data_vencimento)
                            : 0,
                        'estado' => $fatura->estado,
                    ];
                })
                ->filter(fn($f) => $f['valor_pendente'] > 0)
                ->values();

            // ── Adiantamentos FA pendentes de pagamento ───────────────────
            $adiantamentosPendentes = (clone $documentosQuery)
                ->where('tipo_documento', 'FA')
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

            $totalPendente = $faturasPendentes->sum('valor_pendente') + $adiantamentosPendentes->sum('valor_pendente');
            $totalAtrasado = $faturasPendentes->where('dias_atraso', '>', 0)->sum('valor_pendente') +
                            $adiantamentosPendentes->where('dias_atraso', '>', 0)->sum('valor_pendente');

            return [
                'resumo' => [
                    'total_pendente'           => $totalPendente,
                    'total_atrasado'           => $totalAtrasado,
                    'quantidade_faturas'       => $faturasPendentes->count(),
                    'quantidade_adiantamentos' => $adiantamentosPendentes->count(),
                ],
                'faturas_pendentes'       => $faturasPendentes,
                'adiantamentos_pendentes' => $adiantamentosPendentes,
                'modo' => $modo,
            ];

        } catch (\Exception $e) {
            Log::error('[RELATORIOS SERVICE] Erro no relatório de pagamentos:', [
                'error' => $e->getMessage(),
            ]);

            return [
                'resumo' => [
                    'total_pendente'           => 0,
                    'total_atrasado'           => 0,
                    'quantidade_faturas'       => 0,
                    'quantidade_adiantamentos' => 0,
                ],
                'faturas_pendentes'       => [],
                'adiantamentos_pendentes' => [],
                'modo' => $modo,
            ];
        }
    }

/**
 * Relatório detalhado de vendas
 */
public function relatorioVendas($dataInicio = null, $dataFim = null, $filtros = [])
{
    $this->verificarAcessoUsuario();

    $modo = $this->getModo();
    Log::info('[RELATORIOS SERVICE] Iniciando relatório de vendas', [
        'data_inicio' => $dataInicio,
        'data_fim'    => $dataFim,
        'filtros'     => $filtros,
        'modo'        => $modo,
    ]);

    $query = $this->queryVendas()->with(['cliente', 'itens.produto', 'documentoFiscal']);

    if ($dataInicio) {
        $query->whereDate('data_venda', '>=', $dataInicio);
    }
    if ($dataFim) {
        $query->whereDate('data_venda', '<=', $dataFim);
    }
    if (!empty($filtros['cliente_id'])) {
        $query->where('cliente_id', $filtros['cliente_id']);
    }
    if (!empty($filtros['apenas_vendas'])) {
        $query->whereHas('documentoFiscal', function ($q) {
            $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
        });
    }
    if (!empty($filtros['estado_pagamento'])) {
        $query->where('estado_pagamento', $filtros['estado_pagamento']);
    }

    $vendas = $query->orderBy('data_venda', 'desc')->get();

    Log::info('[RELATORIOS SERVICE] Vendas encontradas', ['quantidade' => $vendas->count()]);

    $totalPeriodo     = $vendas->sum('total');
    $quantidadeVendas = $vendas->count();
    $ticketMedio      = $quantidadeVendas > 0 ? $totalPeriodo / $quantidadeVendas : 0;
    $clientesUnicos   = $vendas->pluck('cliente_id')->filter()->unique()->count();
    $produtosVendidos = $vendas->flatMap(fn($v) => $v->itens->pluck('produto_id'))->filter()->unique()->count();

    // ✅ Estas 4 linhas é que faltavam — sem elas as variáveis não existem
    $totalBaseTributavel = $vendas->sum('base_tributavel');
    $totalIva            = $vendas->sum('total_iva');
    $totalRetencao       = $vendas->sum(fn($v) => $v->documentoFiscal->total_retencao ?? 0);
    $totalServicos       = $vendas->flatMap(fn($v) => $v->itens)
        ->filter(fn($item) => optional($item->produto)->tipo === 'servico')
        ->count();

    $vendasPorStatus = [
        'pagas'      => $vendas->where('estado_pagamento', 'paga')->count(),
        'pendentes'  => $vendas->whereIn('estado_pagamento', ['pendente', 'parcial'])->count(),
        'canceladas' => $vendas->where('estado_pagamento', 'cancelada')->count(),
    ];

    return [
        'vendas' => $vendas->map(function ($venda) {
            return [
                'id'               => $venda->id,
                'numero_documento' => $venda->numero_documento ?? null,
                'cliente'          => $venda->cliente->nome ?? $venda->cliente_nome ?? 'Cliente não identificado',
                'data'             => $venda->data_venda,
                'hora'             => $venda->hora_venda,
                'total'            => $venda->total,
                'base_tributavel'  => $venda->base_tributavel,
                'total_iva'        => $venda->total_iva,
                'estado_pagamento' => $venda->estado_pagamento,
                'tipo_documento'   => $venda->documentoFiscal?->tipo_documento,
            ];
        }),

        // ✅ mantém 'kpis' — é o que RelatorioVendasComponent.tsx (gráficos) usa
        'kpis' => [
            'total_vendas'      => $totalPeriodo,     // valor em Kz
            'quantidade_vendas' => $quantidadeVendas,
            'ticket_medio'      => round($ticketMedio, 2),
            'clientes_periodo'  => $clientesUnicos,
            'produtos_vendidos' => $produtosVendidos,
            'vendas_por_status' => $vendasPorStatus,
        ],

        // ✅ acrescenta 'totais' — é o que relatorioExport.ts (PDF/Excel) precisa
        'totais' => [
            'total_valor'           => $totalPeriodo,
            'total_vendas'          => $quantidadeVendas,  // aqui é contagem
            'total_base_tributavel' => $totalBaseTributavel,
            'total_iva'             => $totalIva,
            'total_retencao'        => $totalRetencao,
            'total_servicos'        => $totalServicos,
            'ticket_medio'          => round($ticketMedio, 2),
            'clientes_periodo'      => $clientesUnicos,
            'produtos_vendidos'     => $produtosVendidos,
            'vendas_por_status'     => $vendasPorStatus,
        ],

        'periodo' => [
            'data_inicio' => $dataInicio,
            'data_fim'    => $dataFim,
        ],
        'modo' => $modo,
    ];
}

    // ... Todos os outros métodos de relatório mantidos, apenas adicionando 
    // $modo = $this->getModo() e usando $modo no retorno ...

    // =====================================================================
    // OBSERVAÇÃO: Os métodos relatorioCompras, relatorioFaturacao, 
    // relatorioStock, relatorioMovimentosStock, relatorioPagamentosPendentes,
    // relatorioProformas, exportarRelatorioExcel seguem o mesmo padrão.
    // Todos eles devem ser atualizados com:
    // 1. $this->verificarAcessoUsuario()
    // 2. $modo = $this->getModo()
    // 3. Usar $modo no retorno
    // =====================================================================

// app/Services/RelatoriosService.php

/**
 * Relatório detalhado de faturação/documentos fiscais
 */
public function relatorioFaturacao($dataInicio = null, $dataFim = null, $filtros = [])
{
    $this->verificarAcessoUsuario();

    $modo = $this->getModo();
    Log::info('[RELATORIOS SERVICE] Iniciando relatório de faturação', [
        'data_inicio' => $dataInicio,
        'data_fim'    => $dataFim,
        'filtros'     => $filtros,
        'modo'        => $modo,
    ]);

    $query = $this->queryDocumentosFiscais()->with(['cliente']);

    if ($dataInicio) {
        $query->whereDate('data_emissao', '>=', $dataInicio);
    }
    if ($dataFim) {
        $query->whereDate('data_emissao', '<=', $dataFim);
    }

    if (!empty($filtros['tipo'])) {
        $query->where('tipo_documento', $filtros['tipo']);
    }
    if (!empty($filtros['cliente_id'])) {
        $query->where('cliente_id', $filtros['cliente_id']);
    }
    if (!empty($filtros['estado'])) {
        $query->where('estado', $filtros['estado']);
    }

    $documentos = $query->orderBy('data_emissao', 'desc')->get();

    Log::info('[RELATORIOS SERVICE] Documentos encontrados', ['quantidade' => $documentos->count()]);

    // Apenas documentos de venda real (exclui FP - Proformas)
    $documentosVenda = $documentos->filter(function ($doc) {
        return !in_array($doc->tipo_documento, ['FP']);
    });

    $porTipo = $documentosVenda->groupBy('tipo_documento')->map(function ($grupo) {
        return [
            'quantidade'    => $grupo->count(),
            'total_liquido' => $grupo->sum('total_liquido'),
            'total_base'    => $grupo->sum('base_tributavel'),
            'total_iva'     => $grupo->sum('total_iva'),
            'total_retencao' => $grupo->sum('total_retencao'),
        ];
    });

    $porEstado = $documentosVenda->groupBy('estado')->map(fn($g) => $g->count());

    $faturacaoTotal    = $documentosVenda->sum('total_liquido');
    $faturacaoPaga     = $documentosVenda->whereIn('estado', ['paga'])->sum('total_liquido');
    $faturacaoPendente = $documentosVenda->whereIn('estado', ['emitido', 'parcialmente_paga'])->sum('total_liquido');

    $faturacaoPorMes = $documentosVenda->groupBy(function ($doc) {
        return Carbon::parse($doc->data_emissao)->format('Y-m');
    })->map(function ($grupo, $mes) {
        return [
            'mes'        => $mes,
            'total'      => $grupo->sum('total_liquido'),
            'quantidade' => $grupo->count(),
        ];
    })->values();

    return [
        'faturacao_total'    => $faturacaoTotal,
        'faturacao_paga'     => $faturacaoPaga,
        'faturacao_pendente' => $faturacaoPendente,
        'faturacao_por_mes'  => $faturacaoPorMes,
        'por_tipo'           => $porTipo,
        'por_estado'         => $porEstado,
        'periodo' => [
            'data_inicio' => $dataInicio,
            'data_fim'    => $dataFim,
        ],
        'modo' => $modo,
    ];
}

    /**
     * Relatório de proformas
     */
    public function relatorioProformas($dataInicio = null, $dataFim = null, $clienteId = null, $apenasPendentes = false)
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de proformas', ['modo' => $modo]);

        try {
            $query = $this->queryDocumentosFiscais()->where('tipo_documento', 'FP')->with(['cliente']);

            if ($dataInicio && $dataFim) {
                $query->whereBetween('data_emissao', [$dataInicio, $dataFim]);
            } elseif ($dataInicio) {
                $query->whereDate('data_emissao', '>=', $dataInicio);
            } elseif ($dataFim) {
                $query->whereDate('data_emissao', '<=', $dataFim);
            }

            if ($clienteId) {
                $query->where('cliente_id', $clienteId);
            }
            if ($apenasPendentes) {
                $query->where('estado', 'emitido');
            }

            $proformas = $query->orderBy('data_emissao', 'desc')->get();

            return [
                'total'       => $proformas->count(),
                'valor_total' => $proformas->sum('total_liquido'),
                'proformas'   => $proformas->map(fn($p) => [
                    'id'               => $p->id,
                    'numero_documento' => $p->numero_documento,
                    'cliente'          => $p->cliente?->nome ?? $p->cliente_nome ?? 'Consumidor Final',
                    'data_emissao'     => $p->data_emissao,
                    'total_liquido'    => $p->total_liquido,
                    'estado'           => $p->estado,
                ]),
                'modo' => $modo,
            ];

        } catch (\Exception $e) {
            Log::error('[RELATORIOS SERVICE] Erro no relatório de proformas:', [
                'error' => $e->getMessage(),
            ]);

            return [
                'total'       => 0,
                'valor_total' => 0,
                'proformas'   => [],
                'modo' => $modo,
            ];
        }
    }

    /**
     * Exportar relatório para Excel
     */
    public function exportarRelatorioExcel(string $tipo, $dataInicio = null, $dataFim = null, $filtros = [])
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[RELATORIOS SERVICE] Exportando Excel', [
            'tipo'        => $tipo,
            'data_inicio' => $dataInicio,
            'data_fim'    => $dataFim,
            'modo'        => $modo,
        ]);

        $arquivo = now()->format('Ymd_His') . "_relatorio_{$tipo}.xlsx";

        // ⭐ A classe anônima precisa receber o modo para usar os models corretos
        return Excel::download(new class($tipo, $dataInicio, $dataFim, $filtros, $modo) implements
            \Maatwebsite\Excel\Concerns\FromCollection,
            \Maatwebsite\Excel\Concerns\WithHeadings,
            \Maatwebsite\Excel\Concerns\WithMapping
        {
            protected $tipo;
            protected $dataInicio;
            protected $dataFim;
            protected $filtros;
            protected $modo;

            public function __construct($tipo, $dataInicio, $dataFim, $filtros, $modo)
            {
                $this->tipo       = $tipo;
                $this->dataInicio = $dataInicio;
                $this->dataFim    = $dataFim;
                $this->filtros    = $filtros;
                $this->modo       = $modo;
            }

            protected function isColectivo(): bool
            {
                return $this->modo === 'colectivo';
            }

            protected function queryVendas()
            {
                if ($this->isColectivo()) {
                    return SharedVenda::doTenant();
                }
                return TenantVenda::query();
            }

            protected function queryCompras()
            {
                if ($this->isColectivo()) {
                    return SharedCompra::doTenant();
                }
                return TenantCompra::query();
            }

            protected function queryDocumentosFiscais()
            {
                if ($this->isColectivo()) {
                    return SharedDocumentoFiscal::doTenant();
                }
                return TenantDocumentoFiscal::query();
            }

            protected function queryProdutos()
            {
                if ($this->isColectivo()) {
                    return SharedProduto::doTenant();
                }
                return TenantProduto::query();
            }

            protected function queryMovimentosStock()
            {
                if ($this->isColectivo()) {
                    return SharedMovimentoStock::doTenant();
                }
                return TenantMovimentoStock::query();
            }

            public function collection()
            {
                try {
                    switch ($this->tipo) {
                        case 'vendas':
                            $query = $this->queryVendas()->with('cliente', 'itens.produto', 'documentoFiscal');
                            if ($this->dataInicio) $query->whereDate('data_venda', '>=', $this->dataInicio);
                            if ($this->dataFim)    $query->whereDate('data_venda', '<=', $this->dataFim);
                            return $query->orderBy('data_venda', 'desc')->get();

                        case 'compras':
                            $query = $this->queryCompras()->with('fornecedor', 'itens.produto');
                            if ($this->dataInicio) $query->whereDate('data', '>=', $this->dataInicio);
                            if ($this->dataFim)    $query->whereDate('data', '<=', $this->dataFim);
                            return $query->orderBy('data', 'desc')->get();

                        case 'faturacao':
                        case 'documentos':
                            $query = $this->queryDocumentosFiscais()->with('cliente');
                            if ($this->dataInicio) $query->whereDate('data_emissao', '>=', $this->dataInicio);
                            if ($this->dataFim)    $query->whereDate('data_emissao', '<=', $this->dataFim);
                            return $query->orderBy('data_emissao', 'desc')->get();

                        case 'stock':
                            return $this->queryProdutos()->with('categoria')
                                ->where('tipo', 'produto')
                                ->orderBy('nome')
                                ->get();

                        case 'proformas':
                            $query = $this->queryDocumentosFiscais()->where('tipo_documento', 'FP')->with('cliente');
                            if ($this->dataInicio) $query->whereDate('data_emissao', '>=', $this->dataInicio);
                            if ($this->dataFim)    $query->whereDate('data_emissao', '<=', $this->dataFim);
                            return $query->orderBy('data_emissao', 'desc')->get();

                        case 'movimentos_stock':
                            $query = $this->queryMovimentosStock()->with([
                                'produto' => fn($q) => $q->withTrashed()->select('id', 'nome', 'codigo'),
                                'user'    => fn($q) => $q->select('id', 'name'),
                            ]);
                            if ($this->dataInicio) $query->whereDate('created_at', '>=', $this->dataInicio);
                            if ($this->dataFim)    $query->whereDate('created_at', '<=', $this->dataFim);
                            if (!empty($this->filtros['produto_id'])) {
                                $query->where('produto_id', $this->filtros['produto_id']);
                            }
                            if (!empty($this->filtros['tipo'])) {
                                $query->where('tipo', $this->filtros['tipo']);
                            }
                            if (!empty($this->filtros['tipo_movimento'])) {
                                $query->where('tipo_movimento', $this->filtros['tipo_movimento']);
                            }
                            return $query->orderBy('created_at', 'desc')->get();

                        default:
                            return collect([]);
                    }
                } catch (\Exception $e) {
                    Log::error('[RELATORIOS SERVICE] Erro na exportação:', [
                        'tipo'  => $this->tipo,
                        'error' => $e->getMessage(),
                    ]);
                    return collect([]);
                }
            }

            public function headings(): array
            {
                // ... mantido igual ...
                switch ($this->tipo) {
                    case 'vendas':
                        return ['ID', 'Nº Documento', 'Cliente', 'Data', 'Hora', 'Base Tributável', 'IVA', 'Total', 'Estado Pagamento'];
                    case 'compras':
                        return ['ID', 'Fornecedor', 'Data', 'Total', 'Itens', 'Documento'];
                    case 'faturacao':
                    case 'documentos':
                        return ['ID', 'Nº Documento', 'Tipo', 'Cliente', 'Data Emissão', 'Base Tributável', 'IVA', 'Total Líquido', 'Estado'];
                    case 'stock':
                        return ['ID', 'Nome', 'Categoria', 'Stock Atual', 'Stock Mínimo', 'Preço Compra', 'Preço Venda', 'Custo Médio', 'Valor Total Stock', 'Margem Lucro (%)', 'Em Risco'];
                    case 'proformas':
                        return ['ID', 'Nº Documento', 'Cliente', 'Data Emissão', 'Total', 'Estado'];
                    case 'movimentos_stock':
                        return ['ID', 'Produto', 'Código', 'Tipo', 'Tipo Movimento', 'Quantidade', 'Stock Anterior', 'Stock Novo', 'Custo Médio', 'Referência', 'Observação', 'Utilizador', 'Data/Hora'];
                    default:
                        return [];
                }
            }

            public function map($row): array
            {
                // ... mantido igual ...
                try {
                    switch ($this->tipo) {
                        case 'vendas':
                            return [
                                $row->id,
                                $row->numero_documento,
                                $row->cliente->nome ?? $row->cliente_nome ?? 'N/A',
                                $row->data_venda,
                                $row->hora_venda,
                                $row->base_tributavel,
                                $row->total_iva,
                                $row->total,
                                $row->estado_pagamento,
                            ];
                        case 'compras':
                            return [
                                $row->id,
                                $row->fornecedor->nome ?? 'N/A',
                                $row->data,
                                $row->total,
                                $row->itens->count(),
                                $row->numero_documento,
                            ];
                        case 'faturacao':
                        case 'documentos':
                            return [
                                $row->id,
                                $row->numero_documento,
                                $row->tipo_documento,
                                $row->cliente->nome ?? $row->cliente_nome ?? 'N/A',
                                $row->data_emissao,
                                $row->base_tributavel,
                                $row->total_iva,
                                $row->total_liquido,
                                $row->estado,
                            ];
                        case 'stock':
                            $custo  = $row->custo_medio ?? $row->preco_compra ?? 0;
                            $margem = $custo > 0 ? (($row->preco_venda - $custo) / $custo) * 100 : 0;
                            return [
                                $row->id,
                                $row->nome,
                                $row->categoria?->nome ?? 'Sem categoria',
                                $row->estoque_atual,
                                $row->estoque_minimo,
                                $row->preco_compra,
                                $row->preco_venda,
                                $custo,
                                $row->estoque_atual * $custo,
                                round($margem, 2),
                                $row->estoque_atual <= $row->estoque_minimo ? 'SIM' : 'NÃO',
                            ];
                        case 'proformas':
                            return [
                                $row->id,
                                $row->numero_documento,
                                $row->cliente->nome ?? $row->cliente_nome ?? 'N/A',
                                $row->data_emissao,
                                $row->total_liquido,
                                $row->estado,
                            ];
                        case 'movimentos_stock':
                            return [
                                $row->id,
                                $row->produto?->nome ?? 'N/A',
                                $row->produto?->codigo ?? 'N/A',
                                $row->tipo,
                                $row->tipo_movimento,
                                abs($row->quantidade),
                                $row->estoque_anterior,
                                $row->estoque_novo,
                                $row->custo_medio,
                                $row->referencia,
                                $row->observacao,
                                $row->user?->name ?? 'Sistema',
                                $row->created_at?->format('Y-m-d H:i:s'),
                            ];
                        default:
                            return [];
                    }
                } catch (\Exception $e) {
                    Log::error('[RELATORIOS SERVICE] Erro no mapeamento Excel:', [
                        'tipo'  => $this->tipo,
                        'error' => $e->getMessage(),
                    ]);
                    return [];
                }
            }
        }, $arquivo, ExcelFormat::XLSX);
    }
}
