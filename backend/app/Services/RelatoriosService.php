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

// Excel imports
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

// Imports para gráficos
use PhpOffice\PhpSpreadsheet\Chart\Chart;
use PhpOffice\PhpSpreadsheet\Chart\DataSeries;
use PhpOffice\PhpSpreadsheet\Chart\DataSeriesValues;
use PhpOffice\PhpSpreadsheet\Chart\Legend;
use PhpOffice\PhpSpreadsheet\Chart\PlotArea;
use PhpOffice\PhpSpreadsheet\Chart\Title;

class RelatoriosService
{
    protected StockService $stockService;
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    // Cores da marca FaturaJá
    public const COR_PRIMARIA   = '123859';
    public const COR_SECUNDARIA = 'F9941F';

    public function __construct()
    {
        $this->stockService = app(\App\Services\StockService::class);

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
     | VERIFICAÇÃO DE ACESSO
     | ================================================================== */

    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[RelatoriosService] Verificando acesso');

        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[RelatoriosService] Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        $this->modo = $this->empresa->modo ?? 'colectivo';

        $landlordUser = Auth::guard('landlord')->user();

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
     | DASHBOARD
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
     | RELATÓRIOS EXISTENTES
     | ================================================================== */

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

    public function relatorioPagamentosPendentes()
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de pagamentos pendentes', ['modo' => $modo]);

        try {
            $hoje = now();
            $documentosQuery = $this->queryDocumentosFiscais();

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

            'kpis' => [
                'total_vendas'      => $totalPeriodo,
                'quantidade_vendas' => $quantidadeVendas,
                'ticket_medio'      => round($ticketMedio, 2),
                'clientes_periodo'  => $clientesUnicos,
                'produtos_vendidos' => $produtosVendidos,
                'vendas_por_status' => $vendasPorStatus,
            ],

            'totais' => [
                'total_valor'           => $totalPeriodo,
                'total_vendas'          => $quantidadeVendas,
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

    /* =====================================================================
     | NOVO RELATÓRIO DE DESEMPENHO (DETALHADO + RESUMO COMPARATIVO)
     | ================================================================== */

    public function relatorioDesempenho($dataInicio = null, $dataFim = null, $filtros = [])
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de desempenho', [
            'data_inicio' => $dataInicio,
            'data_fim'    => $dataFim,
            'filtros'     => $filtros,
            'modo'        => $modo,
        ]);

        // 1. Buscar documentos fiscais (faturas, recibos, proformas, adiantamentos) no período
        $query = $this->queryDocumentosFiscais()
            ->with(['cliente', 'items.produto'])
            ->whereIn('tipo_documento', ['FT', 'FR', 'FP', 'FA']);

        if ($dataInicio) {
            $query->whereDate('data_emissao', '>=', $dataInicio);
        }
        if ($dataFim) {
            $query->whereDate('data_emissao', '<=', $dataFim);
        }
        if (!empty($filtros['cliente_id'])) {
            $query->where('cliente_id', $filtros['cliente_id']);
        }
        if (!empty($filtros['tipo_documento'])) {
            $query->where('tipo_documento', $filtros['tipo_documento']);
        }

        $documentos = $query->orderBy('data_emissao', 'desc')->get();

        // 2. Detalhe – cada linha = um item de documento (produto/serviço)
        $detalhe = collect();
        foreach ($documentos as $doc) {
            if ($doc->items->isEmpty()) {
                $detalhe->push([
                    'documento'    => $doc->numero_documento,
                    'tipo_doc'     => $doc->tipo_documento,
                    'cliente'      => $doc->cliente->nome ?? $doc->cliente_nome ?? 'Consumidor Final',
                    'produto'      => 'N/A',
                    'quantidade'   => 1,
                    'preco_unit'   => $doc->total_liquido,
                    'total_item'   => $doc->total_liquido,
                    'data_emissao' => $doc->data_emissao,
                    'estado'       => $doc->estado,
                    'pagamento'    => $doc->estado_pagamento ?? 'não aplicável',
                ]);
            } else {
                foreach ($doc->items as $item) {
                    $detalhe->push([
                        'documento'    => $doc->numero_documento,
                        'tipo_doc'     => $doc->tipo_documento,
                        'cliente'      => $doc->cliente->nome ?? $doc->cliente_nome ?? 'Consumidor Final',
                        'produto'      => $item->produto->nome ?? 'Item sem nome',
                        'quantidade'   => $item->quantidade ?? 1,
                        'preco_unit'   => $item->preco_unitario ?? 0,
                        'total_item'   => $item->total ?? ($item->quantidade * $item->preco_unitario),
                        'data_emissao' => $doc->data_emissao,
                        'estado'       => $doc->estado,
                        'pagamento'    => $doc->estado_pagamento ?? 'não aplicável',
                    ]);
                }
            }
        }

        // 3. Resumo do período
        $totalFaturado = $documentos->sum('total_liquido');
        $totalPago     = $documentos->where('estado', 'paga')->sum('total_liquido');
        $totalPendente = $documentos->whereIn('estado', ['emitido', 'parcialmente_paga'])->sum('total_liquido');
        $totalCancelado= $documentos->where('estado', 'cancelada')->sum('total_liquido');
        $numDocumentos = $documentos->count();
        $numClientes   = $documentos->pluck('cliente_id')->filter()->unique()->count();
        $ticketMedio   = $numDocumentos > 0 ? $totalFaturado / $numDocumentos : 0;
        $numProdutos   = $detalhe->pluck('produto')->filter()->unique()->count();

        // 4. Comparação com período anterior (mesmo intervalo, mês anterior)
        $inicioAnterior = $dataInicio ? Carbon::parse($dataInicio)->subMonth() : null;
        $fimAnterior    = $dataFim ? Carbon::parse($dataFim)->subMonth() : null;
        $faturamentoAnterior = 0;
        if ($inicioAnterior && $fimAnterior) {
            $faturamentoAnterior = $this->queryDocumentosFiscais()
                ->whereIn('tipo_documento', ['FT', 'FR', 'FA'])
                ->whereBetween('data_emissao', [$inicioAnterior, $fimAnterior])
                ->sum('total_liquido');
        }

        $variacao = $faturamentoAnterior > 0
            ? (($totalFaturado - $faturamentoAnterior) / $faturamentoAnterior) * 100
            : ($totalFaturado > 0 ? 100 : 0);

        // 5. Evolução mensal
        $evolucaoMensal = $documentos->groupBy(function ($doc) {
            return Carbon::parse($doc->data_emissao)->format('Y-m');
        })->map(function ($grupo, $mes) {
            return [
                'mes'         => $mes,
                'total'       => $grupo->sum('total_liquido'),
                'quantidade'  => $grupo->count(),
                'clientes'    => $grupo->pluck('cliente_id')->unique()->count(),
            ];
        })->values();

        // 6. Funil simplificado
        $funil = [
            'propostas'  => $documentos->where('tipo_documento', 'FP')->where('estado', 'emitido')->count(),
            'negociacao' => $documentos->whereIn('tipo_documento', ['FT', 'FR'])->whereIn('estado', ['emitido', 'parcialmente_paga'])->count(),
            'ganhas'     => $documentos->where('estado', 'paga')->count(),
            'perdidas'   => $documentos->where('estado', 'cancelada')->count(),
        ];

        // 7. Agrupar por tipo de documento
        $porTipo = $documentos->groupBy('tipo_documento')->map(function ($grupo) {
            return [
                'quantidade' => $grupo->count(),
                'total'      => $grupo->sum('total_liquido'),
                'pago'       => $grupo->where('estado', 'paga')->sum('total_liquido'),
            ];
        });

        // 8. Resumo final
        $resumo = [
            'total_faturado'         => $totalFaturado,
            'total_pago'             => $totalPago,
            'total_pendente'         => $totalPendente,
            'total_cancelado'        => $totalCancelado,
            'numero_documentos'      => $numDocumentos,
            'clientes_ativos'        => $numClientes,
            'produtos_diferentes'    => $numProdutos,
            'ticket_medio'           => round($ticketMedio, 2),
            'faturamento_anterior'   => $faturamentoAnterior,
            'variacao_percentual'    => round($variacao, 2),
            'evolucao_mensal'        => $evolucaoMensal,
            'funil'                  => $funil,
            'por_tipo_documento'     => $porTipo,
        ];

        return [
            'detalhe' => $detalhe,
            'resumo'  => $resumo,
            'periodo' => [
                'inicio' => $dataInicio,
                'fim'    => $dataFim,
            ],
            'modo' => $modo,
        ];
    }

    /* =====================================================================
     | RELATÓRIOS ADICIONAIS (STOCK, COMPRAS)
     | ================================================================== */

    public function relatorioStock($filtros = [])
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de stock', [
            'filtros' => $filtros,
            'modo'    => $modo,
        ]);

        $query = $this->queryProdutos()->with(['categoria'])->where('tipo', 'produto');

        if (!empty($filtros['categoria_id'])) {
            $query->where('categoria_id', $filtros['categoria_id']);
        }
        if (!empty($filtros['apenas_ativos'])) {
            $query->where('status', 'ativo');
        }
        if (!empty($filtros['estoque_baixo'])) {
            $query->whereColumn('estoque_atual', '<=', 'estoque_minimo');
        }
        if (!empty($filtros['sem_estoque'])) {
            $query->where('estoque_atual', '<=', 0);
        }

        $produtos = $query->orderBy('nome')->get();

        $valorTotalStock = $produtos->sum(fn($p) => $p->estoque_atual * ($p->custo_medio ?? $p->preco_compra ?? 0));
        $totalProdutos = $produtos->count();
        $produtosEmFalta = $produtos->where('estoque_atual', '<=', 0)->count();
        $produtosBaixoEstoque = $produtos->whereColumn('estoque_atual', '<=', 'estoque_minimo')->count();

        $porCategoria = $produtos->groupBy('categoria.nome')->map(function ($grupo) {
            return [
                'quantidade' => $grupo->count(),
                'valor_total' => $grupo->sum(fn($p) => $p->estoque_atual * ($p->custo_medio ?? $p->preco_compra ?? 0)),
            ];
        });

        return [
            'resumo' => [
                'total_produtos'        => $totalProdutos,
                'valor_total_stock'     => $valorTotalStock,
                'produtos_em_falta'     => $produtosEmFalta,
                'produtos_baixo_estoque'=> $produtosBaixoEstoque,
                'por_categoria'         => $porCategoria,
            ],
            'produtos' => $produtos->map(function ($p) {
                $custo = $p->custo_medio ?? $p->preco_compra ?? 0;
                $margem = $custo > 0 ? (($p->preco_venda - $custo) / $custo) * 100 : 0;
                return [
                    'id'               => $p->id,
                    'nome'             => $p->nome,
                    'codigo'           => $p->codigo,
                    'categoria'        => $p->categoria->nome ?? 'Sem categoria',
                    'estoque_atual'    => $p->estoque_atual,
                    'estoque_minimo'   => $p->estoque_minimo,
                    'preco_compra'     => $p->preco_compra,
                    'preco_venda'      => $p->preco_venda,
                    'custo_medio'      => $custo,
                    'valor_total'      => $p->estoque_atual * $custo,
                    'margem_lucro'     => round($margem, 2),
                    'status'           => $p->status,
                ];
            }),
            'modo' => $modo,
        ];
    }

    public function relatorioCompras($dataInicio = null, $dataFim = null, $fornecedorId = null)
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de compras', [
            'data_inicio' => $dataInicio,
            'data_fim'    => $dataFim,
            'fornecedor_id' => $fornecedorId,
            'modo'        => $modo,
        ]);

        $query = $this->queryCompras()->with(['fornecedor', 'itens.produto']);

        if ($dataInicio) {
            $query->whereDate('data', '>=', $dataInicio);
        }
        if ($dataFim) {
            $query->whereDate('data', '<=', $dataFim);
        }
        if ($fornecedorId) {
            $query->where('fornecedor_id', $fornecedorId);
        }

        $compras = $query->orderBy('data', 'desc')->get();

        $totalCompras = $compras->sum('total');
        $quantidadeCompras = $compras->count();
        $fornecedoresUnicos = $compras->pluck('fornecedor_id')->filter()->unique()->count();
        $produtosComprados = $compras->flatMap(fn($c) => $c->itens->pluck('produto_id'))->filter()->unique()->count();

        return [
            'resumo' => [
                'total_compras'       => $totalCompras,
                'quantidade_compras'  => $quantidadeCompras,
                'fornecedores_unicos' => $fornecedoresUnicos,
                'produtos_comprados'  => $produtosComprados,
                'ticket_medio'        => $quantidadeCompras > 0 ? $totalCompras / $quantidadeCompras : 0,
            ],
            'compras' => $compras->map(function ($compra) {
                return [
                    'id'                 => $compra->id,
                    'numero_documento'   => $compra->numero_documento,
                    'fornecedor'         => $compra->fornecedor->nome ?? 'N/A',
                    'data'               => $compra->data,
                    'total'              => $compra->total,
                    'base_tributavel'    => $compra->base_tributavel,
                    'total_iva'          => $compra->total_iva,
                    'itens'              => $compra->itens->count(),
                ];
            }),
            'periodo' => [
                'data_inicio' => $dataInicio,
                'data_fim'    => $dataFim,
            ],
            'modo' => $modo,
        ];
    }

    /* =====================================================================
     | EXPORTAÇÃO EXCEL
     | ================================================================== */

    public function exportarRelatorioExcel(string $tipo, $dataInicio = null, $dataFim = null, $filtros = [])
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        $empresaNome = $this->getEmpresa()?->nome_comercial ?? $this->getEmpresa()?->nome ?? '';

        Log::info('[RELATORIOS SERVICE] Exportando Excel', [
            'tipo'        => $tipo,
            'data_inicio' => $dataInicio,
            'data_fim'    => $dataFim,
            'modo'        => $modo,
        ]);

        $arquivo = now()->format('Ymd_His') . "_relatorio_{$tipo}.xlsx";

        if ($tipo === 'desempenho') {
            return Excel::download(
                new RelatorioDesempenhoExport($dataInicio, $dataFim, $filtros, $modo, $empresaNome),
                $arquivo,
                ExcelFormat::XLSX
            );
        }

        return Excel::download(
            new RelatorioExport($tipo, $dataInicio, $dataFim, $filtros, $modo, $empresaNome),
            $arquivo,
            ExcelFormat::XLSX
        );
    }

    public function exportarDesempenhoExcel($dataInicio = null, $dataFim = null, $filtros = [])
    {
        return $this->exportarRelatorioExcel('desempenho', $dataInicio, $dataFim, $filtros);
    }

    /* =====================================================================
     | NOVO: EXPORTAÇÃO COMPLETA COM GRÁFICOS E APRESENTAÇÃO MELHORADA
     | ================================================================== */

    public function exportarCompleto($dataInicio = null, $dataFim = null)
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        $empresa = $this->getEmpresa();
        $empresaNome = $empresa?->nome_comercial ?? $empresa?->nome ?? '';

        $arquivo = now()->format('Ymd_His') . '_relatorio_completo.xlsx';

        return Excel::download(
            new RelatorioCompletoExport($dataInicio, $dataFim, $modo, $empresaNome, $empresa),
            $arquivo,
            ExcelFormat::XLSX
        );
    }
}

/* =====================================================================
 | CLASSE DE EXPORTAÇÃO PARA RELATÓRIOS SIMPLES (UMA FOLHA)
 | ================================================================== */

class RelatorioExport implements
    FromCollection,
    WithHeadings,
    WithMapping,
    WithStyles,
    WithColumnWidths,
    WithEvents,
    WithTitle
{
    protected string $tipo;
    protected $dataInicio;
    protected $dataFim;
    protected array $filtros;
    protected string $modo;
    protected string $empresaNome;
    protected int $totalLinhas = 0;

    public function __construct($tipo, $dataInicio, $dataFim, $filtros, $modo, $empresaNome = '')
    {
        $this->tipo        = $tipo;
        $this->dataInicio  = $dataInicio;
        $this->dataFim     = $dataFim;
        $this->filtros     = $filtros ?? [];
        $this->modo        = $modo;
        $this->empresaNome = $empresaNome;
    }

    protected function isColectivo(): bool
    {
        return $this->modo === 'colectivo';
    }

    protected function queryVendas()
    {
        return $this->isColectivo() ? SharedVenda::doTenant() : TenantVenda::query();
    }

    protected function queryCompras()
    {
        return $this->isColectivo() ? SharedCompra::doTenant() : TenantCompra::query();
    }

    protected function queryDocumentosFiscais()
    {
        return $this->isColectivo() ? SharedDocumentoFiscal::doTenant() : TenantDocumentoFiscal::query();
    }

    protected function queryProdutos()
    {
        return $this->isColectivo() ? SharedProduto::doTenant() : TenantProduto::query();
    }

    protected function queryMovimentosStock()
    {
        return $this->isColectivo() ? SharedMovimentoStock::doTenant() : TenantMovimentoStock::query();
    }

    public function collection()
    {
        try {
            $dados = match ($this->tipo) {
                'vendas' => (function () {
                    $query = $this->queryVendas()->with('cliente', 'itens.produto', 'documentoFiscal');
                    if ($this->dataInicio) $query->whereDate('data_venda', '>=', $this->dataInicio);
                    if ($this->dataFim)    $query->whereDate('data_venda', '<=', $this->dataFim);
                    return $query->orderBy('data_venda', 'desc')->get();
                })(),

                'compras' => (function () {
                    $query = $this->queryCompras()->with('fornecedor', 'itens.produto');
                    if ($this->dataInicio) $query->whereDate('data', '>=', $this->dataInicio);
                    if ($this->dataFim)    $query->whereDate('data', '<=', $this->dataFim);
                    return $query->orderBy('data', 'desc')->get();
                })(),

                'faturacao', 'documentos' => (function () {
                    $query = $this->queryDocumentosFiscais()->with('cliente');
                    if ($this->dataInicio) $query->whereDate('data_emissao', '>=', $this->dataInicio);
                    if ($this->dataFim)    $query->whereDate('data_emissao', '<=', $this->dataFim);
                    return $query->orderBy('data_emissao', 'desc')->get();
                })(),

                'stock' => $this->queryProdutos()->with('categoria')
                    ->where('tipo', 'produto')
                    ->orderBy('nome')
                    ->get(),

                'proformas' => (function () {
                    $query = $this->queryDocumentosFiscais()->where('tipo_documento', 'FP')->with('cliente');
                    if ($this->dataInicio) $query->whereDate('data_emissao', '>=', $this->dataInicio);
                    if ($this->dataFim)    $query->whereDate('data_emissao', '<=', $this->dataFim);
                    return $query->orderBy('data_emissao', 'desc')->get();
                })(),

                'movimentos_stock' => (function () {
                    $query = $this->queryMovimentosStock()->with([
                        'produto' => fn($q) => $q->withTrashed()->select('id', 'nome', 'codigo'),
                        'user'    => fn($q) => $q->select('id', 'name'),
                    ]);
                    if ($this->dataInicio) $query->whereDate('created_at', '>=', $this->dataInicio);
                    if ($this->dataFim)    $query->whereDate('created_at', '<=', $this->dataFim);
                    if (!empty($this->filtros['produto_id']))     $query->where('produto_id', $this->filtros['produto_id']);
                    if (!empty($this->filtros['tipo']))           $query->where('tipo', $this->filtros['tipo']);
                    if (!empty($this->filtros['tipo_movimento'])) $query->where('tipo_movimento', $this->filtros['tipo_movimento']);
                    return $query->orderBy('created_at', 'desc')->get();
                })(),

                default => collect([]),
            };

            $this->totalLinhas = $dados->count();
            return $dados;
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
        return match ($this->tipo) {
            'vendas' => ['ID', 'Nº Documento', 'Cliente', 'Data', 'Hora', 'Base Tributável', 'IVA', 'Total', 'Estado Pagamento'],
            'compras' => ['ID', 'Fornecedor', 'Data', 'Total', 'Itens', 'Documento'],
            'faturacao', 'documentos' => ['ID', 'Nº Documento', 'Tipo', 'Cliente', 'Data Emissão', 'Base Tributável', 'IVA', 'Total Líquido', 'Estado'],
            'stock' => ['ID', 'Nome', 'Categoria', 'Stock Atual', 'Stock Mínimo', 'Preço Compra', 'Preço Venda', 'Custo Médio', 'Valor Total Stock', 'Margem Lucro (%)', 'Em Risco'],
            'proformas' => ['ID', 'Nº Documento', 'Cliente', 'Data Emissão', 'Total', 'Estado'],
            'movimentos_stock' => ['ID', 'Produto', 'Código', 'Tipo', 'Tipo Movimento', 'Quantidade', 'Stock Anterior', 'Stock Novo', 'Custo Médio', 'Referência', 'Observação', 'Utilizador', 'Data/Hora'],
            default => [],
        };
    }

    public function map($row): array
    {
        try {
            return match ($this->tipo) {
                'vendas' => [
                    $row->id,
                    $row->numero_documento,
                    $row->cliente->nome ?? $row->cliente_nome ?? 'N/A',
                    $row->data_venda,
                    $row->hora_venda,
                    (float) $row->base_tributavel,
                    (float) $row->total_iva,
                    (float) $row->total,
                    $row->estado_pagamento,
                ],
                'compras' => [
                    $row->id,
                    $row->fornecedor->nome ?? 'N/A',
                    $row->data,
                    (float) $row->total,
                    $row->itens->count(),
                    $row->numero_documento,
                ],
                'faturacao', 'documentos' => [
                    $row->id,
                    $row->numero_documento,
                    $row->tipo_documento,
                    $row->cliente->nome ?? $row->cliente_nome ?? 'N/A',
                    $row->data_emissao,
                    (float) $row->base_tributavel,
                    (float) $row->total_iva,
                    (float) $row->total_liquido,
                    $row->estado,
                ],
                'stock' => (function () use ($row) {
                    $custo  = $row->custo_medio ?? $row->preco_compra ?? 0;
                    $margem = $custo > 0 ? (($row->preco_venda - $custo) / $custo) * 100 : 0;
                    return [
                        $row->id,
                        $row->nome,
                        $row->categoria?->nome ?? 'Sem categoria',
                        $row->estoque_atual,
                        $row->estoque_minimo,
                        (float) $row->preco_compra,
                        (float) $row->preco_venda,
                        (float) $custo,
                        (float) ($row->estoque_atual * $custo),
                        round($margem, 2),
                        $row->estoque_atual <= $row->estoque_minimo ? 'SIM' : 'NÃO',
                    ];
                })(),
                'proformas' => [
                    $row->id,
                    $row->numero_documento,
                    $row->cliente->nome ?? $row->cliente_nome ?? 'N/A',
                    $row->data_emissao,
                    (float) $row->total_liquido,
                    $row->estado,
                ],
                'movimentos_stock' => [
                    $row->id,
                    $row->produto?->nome ?? 'N/A',
                    $row->produto?->codigo ?? 'N/A',
                    $row->tipo,
                    $row->tipo_movimento,
                    abs($row->quantidade),
                    $row->estoque_anterior,
                    $row->estoque_novo,
                    (float) $row->custo_medio,
                    $row->referencia,
                    $row->observacao,
                    $row->user?->name ?? 'Sistema',
                    $row->created_at?->format('Y-m-d H:i:s'),
                ],
                default => [],
            };
        } catch (\Exception $e) {
            Log::error('[RELATORIOS SERVICE] Erro no mapeamento Excel:', [
                'tipo'  => $this->tipo,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    public function title(): string
    {
        $titulos = [
            'vendas'            => 'Vendas',
            'compras'           => 'Compras',
            'faturacao'         => 'Faturação',
            'documentos'        => 'Documentos',
            'stock'             => 'Stock',
            'proformas'         => 'Proformas',
            'movimentos_stock'  => 'Movimentos de Stock',
        ];
        return $titulos[$this->tipo] ?? 'Relatório';
    }

    public function columnWidths(): array
    {
        $larguras = [];
        $letras = range('A', 'Z');
        foreach ($this->headings() as $i => $titulo) {
            $letra = $letras[$i];
            $larguras[$letra] = $this->larguraParaTitulo($titulo);
        }
        return $larguras;
    }

    protected function larguraParaTitulo(string $titulo): int
    {
        return match (true) {
            $titulo === 'ID' => 8,
            str_contains($titulo, 'Nº Documento') => 18,
            str_contains($titulo, 'Código') => 12,
            str_contains($titulo, 'Referência') => 16,
            in_array($titulo, ['Nome', 'Cliente', 'Fornecedor', 'Produto', 'Categoria', 'Observação']) => 28,
            str_contains($titulo, 'Data') => 14,
            $titulo === 'Hora' => 10,
            str_contains($titulo, 'Estado') || $titulo === 'Em Risco' => 16,
            $titulo === 'Tipo' || str_contains($titulo, 'Tipo ') => 16,
            str_contains($titulo, 'Utilizador') => 18,
            default => 16,
        };
    }

    protected function colunasMonetarias(): array
    {
        $colunas = [];
        foreach ($this->headings() as $i => $titulo) {
            if (preg_match('/Total|Base Tributável|IVA|Preço|Custo|Valor/i', $titulo)) {
                $colunas[] = range('A', 'Z')[$i];
            }
        }
        return $colunas;
    }

    protected function colunasPercentuais(): array
    {
        $colunas = [];
        foreach ($this->headings() as $i => $titulo) {
            if (str_contains($titulo, 'Margem')) {
                $colunas[] = range('A', 'Z')[$i];
            }
        }
        return $colunas;
    }

    protected function colunasInteiras(): array
    {
        $colunas = [];
        foreach ($this->headings() as $i => $titulo) {
            if (preg_match('/^(Stock|Quantidade|Itens)/i', $titulo)) {
                $colunas[] = range('A', 'Z')[$i];
            }
        }
        return $colunas;
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        $numColunas = count($this->headings());
        $ultimaColuna = range('A', 'Z')[$numColunas - 1] ?? 'A';

        return [
            1 => [
                'font' => [
                    'bold'  => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size'  => 11,
                ],
                'fill' => [
                    'fillType'   => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => RelatoriosService::COR_PRIMARIA],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical'   => Alignment::VERTICAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color'       => ['rgb' => RelatoriosService::COR_PRIMARIA],
                    ],
                ],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $numColunas = count($this->headings());
                $ultimaColuna = range('A', 'Z')[$numColunas - 1] ?? 'A';
                $ultimaLinhaDados = $this->totalLinhas + 1;

                $sheet->freezePane('A2');
                $sheet->setAutoFilter("A1:{$ultimaColuna}1");
                $sheet->getRowDimension(1)->setRowHeight(22);

                if ($this->totalLinhas > 0) {
                    $sheet->getStyle("A1:{$ultimaColuna}{$ultimaLinhaDados}")
                        ->getBorders()->getAllBorders()
                        ->setBorderStyle(Border::BORDER_THIN)
                        ->getColor()->setRGB('D9D9D9');

                    for ($linha = 2; $linha <= $ultimaLinhaDados; $linha++) {
                        if ($linha % 2 === 0) {
                            $sheet->getStyle("A{$linha}:{$ultimaColuna}{$linha}")
                                ->getFill()
                                ->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setRGB('F5F7FA');
                        }
                    }
                }

                foreach ($this->colunasMonetarias() as $col) {
                    $sheet->getStyle("{$col}2:{$col}{$ultimaLinhaDados}")
                        ->getNumberFormat()
                        ->setFormatCode('#,##0.00" Kz"');
                }
                foreach ($this->colunasPercentuais() as $col) {
                    $sheet->getStyle("{$col}2:{$col}{$ultimaLinhaDados}")
                        ->getNumberFormat()
                        ->setFormatCode('0.00"%"');
                }
                foreach ($this->colunasInteiras() as $col) {
                    $sheet->getStyle("{$col}2:{$col}{$ultimaLinhaDados}")
                        ->getNumberFormat()
                        ->setFormatCode('#,##0');
                }

                if ($this->totalLinhas > 0) {
                    $linhaTotais = $ultimaLinhaDados + 1;
                    $sheet->setCellValue("A{$linhaTotais}", 'TOTAL');
                    $sheet->mergeCells("A{$linhaTotais}:" . ($this->primeiraColunaMonetaria() ?: 'A') . "{$linhaTotais}");

                    foreach ($this->colunasMonetarias() as $col) {
                        $sheet->setCellValue(
                            "{$col}{$linhaTotais}",
                            "=SUM({$col}2:{$col}{$ultimaLinhaDados})"
                        );
                        $sheet->getStyle("{$col}{$linhaTotais}")
                            ->getNumberFormat()
                            ->setFormatCode('#,##0.00" Kz"');
                    }

                    $sheet->getStyle("A{$linhaTotais}:{$ultimaColuna}{$linhaTotais}")->applyFromArray([
                        'font' => ['bold' => true],
                        'fill' => [
                            'fillType'   => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'FCE9D6'],
                        ],
                        'borders' => [
                            'top' => [
                                'borderStyle' => Border::BORDER_MEDIUM,
                                'color'       => ['rgb' => RelatoriosService::COR_PRIMARIA],
                            ],
                        ],
                    ]);
                }

                $linhaRodape = $ultimaLinhaDados + 3;
                $textoRodape = trim(($this->empresaNome ? $this->empresaNome . ' — ' : '') .
                    'Relatório gerado em ' . now()->format('d/m/Y H:i'));
                $sheet->setCellValue("A{$linhaRodape}", $textoRodape);
                $sheet->getStyle("A{$linhaRodape}")->getFont()->setItalic(true)->setSize(9)
                    ->getColor()->setRGB('808080');
            },
        ];
    }

    protected function primeiraColunaMonetaria(): ?string
    {
        $monetarias = $this->colunasMonetarias();
        if (empty($monetarias)) {
            return null;
        }
        $letras = range('A', 'Z');
        $indice = array_search($monetarias[0], $letras);
        return $indice > 0 ? $letras[$indice - 1] : null;
    }
}

/* =====================================================================
 | CLASSE DE EXPORTAÇÃO PARA RELATÓRIO DE DESEMPENHO (MÚLTIPLAS FOLHAS)
 | ================================================================== */

class RelatorioDesempenhoExport implements WithMultipleSheets, WithTitle
{
    protected $dataInicio;
    protected $dataFim;
    protected array $filtros;
    protected string $modo;
    protected string $empresaNome;

    public function __construct($dataInicio, $dataFim, $filtros, $modo, $empresaNome)
    {
        $this->dataInicio  = $dataInicio;
        $this->dataFim     = $dataFim;
        $this->filtros     = $filtros;
        $this->modo        = $modo;
        $this->empresaNome = $empresaNome;
    }

    public function title(): string
    {
        return 'Desempenho';
    }

    public function sheets(): array
    {
        return [
            'Detalhe' => new RelatorioDesempenhoDetalheSheet(
                $this->dataInicio,
                $this->dataFim,
                $this->filtros,
                $this->modo,
                $this->empresaNome
            ),
            'Resumo' => new ResumoDesempenhoSheet(
                $this->dataInicio,
                $this->dataFim,
                $this->filtros,
                $this->modo,
                $this->empresaNome
            ),
        ];
    }
}

/**
 * Folha de DETALHE do relatório de desempenho
 */
class RelatorioDesempenhoDetalheSheet implements FromArray, WithHeadings, WithTitle, WithColumnWidths, WithStyles, WithEvents
{
    protected $dataInicio;
    protected $dataFim;
    protected array $filtros;
    protected string $modo;
    protected string $empresaNome;
    protected array $dados = [];
    protected int $totalLinhas = 0;

    public function __construct($dataInicio, $dataFim, $filtros, $modo, $empresaNome)
    {
        $this->dataInicio  = $dataInicio;
        $this->dataFim     = $dataFim;
        $this->filtros     = $filtros;
        $this->modo        = $modo;
        $this->empresaNome = $empresaNome;
        $this->dados       = $this->obterDados();
        $this->totalLinhas = count($this->dados);
    }

    protected function obterDados(): array
    {
        $service = app(RelatoriosService::class);
        $resultado = $service->relatorioDesempenho($this->dataInicio, $this->dataFim, $this->filtros);
        $detalhe = $resultado['detalhe'] ?? collect();

        return $detalhe->map(function ($item) {
            return [
                $item['documento'],
                $item['tipo_doc'],
                $item['cliente'],
                $item['produto'],
                $item['quantidade'],
                $item['preco_unit'],
                $item['total_item'],
                $item['data_emissao'],
                $item['estado'],
                $item['pagamento'],
            ];
        })->toArray();
    }

    public function title(): string
    {
        return 'Detalhe';
    }

    public function headings(): array
    {
        return [
            'Documento', 'Tipo', 'Cliente', 'Produto/Serviço', 'Qtd',
            'Preço Unit.', 'Total Item', 'Data Emissão', 'Estado', 'Pagamento'
        ];
    }

    public function array(): array
    {
        return $this->dados;
    }

    public function columnWidths(): array
    {
        return [
            'A' => 18,
            'B' => 10,
            'C' => 28,
            'D' => 30,
            'E' => 8,
            'F' => 14,
            'G' => 14,
            'H' => 14,
            'I' => 14,
            'J' => 16,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        return [
            1 => [
                'font' => [
                    'bold'  => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size'  => 11,
                ],
                'fill' => [
                    'fillType'   => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => RelatoriosService::COR_PRIMARIA],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical'   => Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $ultimaColuna = 'J';
                $ultimaLinhaDados = $this->totalLinhas + 1;

                $sheet->freezePane('A2');
                $sheet->setAutoFilter("A1:{$ultimaColuna}1");
                $sheet->getRowDimension(1)->setRowHeight(22);

                if ($this->totalLinhas > 0) {
                    $sheet->getStyle("A1:{$ultimaColuna}{$ultimaLinhaDados}")
                        ->getBorders()->getAllBorders()
                        ->setBorderStyle(Border::BORDER_THIN)
                        ->getColor()->setRGB('D9D9D9');

                    for ($linha = 2; $linha <= $ultimaLinhaDados; $linha++) {
                        if ($linha % 2 === 0) {
                            $sheet->getStyle("A{$linha}:{$ultimaColuna}{$linha}")
                                ->getFill()
                                ->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setRGB('F5F7FA');
                        }
                    }
                }

                $sheet->getStyle("F2:F{$ultimaLinhaDados}")
                    ->getNumberFormat()->setFormatCode('#,##0.00" Kz"');
                $sheet->getStyle("G2:G{$ultimaLinhaDados}")
                    ->getNumberFormat()->setFormatCode('#,##0.00" Kz"');

                if ($this->totalLinhas > 0) {
                    $linhaTotais = $ultimaLinhaDados + 1;
                    $sheet->setCellValue("A{$linhaTotais}", 'TOTAL');
                    $sheet->mergeCells("A{$linhaTotais}:E{$linhaTotais}");
                    $sheet->setCellValue("F{$linhaTotais}", "=SUM(F2:F{$ultimaLinhaDados})");
                    $sheet->setCellValue("G{$linhaTotais}", "=SUM(G2:G{$ultimaLinhaDados})");
                    $sheet->getStyle("F{$linhaTotais}:G{$linhaTotais}")
                        ->getNumberFormat()->setFormatCode('#,##0.00" Kz"');

                    $sheet->getStyle("A{$linhaTotais}:{$ultimaColuna}{$linhaTotais}")->applyFromArray([
                        'font' => ['bold' => true],
                        'fill' => [
                            'fillType'   => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'FCE9D6'],
                        ],
                        'borders' => [
                            'top' => [
                                'borderStyle' => Border::BORDER_MEDIUM,
                                'color'       => ['rgb' => RelatoriosService::COR_PRIMARIA],
                            ],
                        ],
                    ]);
                }

                $linhaRodape = $ultimaLinhaDados + 3;
                $textoRodape = trim(($this->empresaNome ? $this->empresaNome . ' — ' : '') .
                    'Relatório gerado em ' . now()->format('d/m/Y H:i'));
                $sheet->setCellValue("A{$linhaRodape}", $textoRodape);
                $sheet->getStyle("A{$linhaRodape}")->getFont()->setItalic(true)->setSize(9)
                    ->getColor()->setRGB('808080');
            },
        ];
    }
}

/**
 * Folha de RESUMO do relatório de desempenho
 */
class ResumoDesempenhoSheet implements FromArray, WithHeadings, WithTitle, WithColumnWidths, WithStyles
{
    protected $dataInicio;
    protected $dataFim;
    protected array $filtros;
    protected string $modo;
    protected string $empresaNome;

    public function __construct($dataInicio, $dataFim, $filtros, $modo, $empresaNome)
    {
        $this->dataInicio  = $dataInicio;
        $this->dataFim     = $dataFim;
        $this->filtros     = $filtros;
        $this->modo        = $modo;
        $this->empresaNome = $empresaNome;
    }

    public function title(): string
    {
        return 'Resumo';
    }

    public function headings(): array
    {
        return ['Indicador', 'Valor'];
    }

    public function array(): array
    {
        $service = app(RelatoriosService::class);
        $resultado = $service->relatorioDesempenho($this->dataInicio, $this->dataFim, $this->filtros);
        $resumo = $resultado['resumo'];

        $linhas = [
            ['=== PERÍODO ===', ''],
            ['Data Início', $this->dataInicio ?? 'Sem filtro'],
            ['Data Fim', $this->dataFim ?? 'Sem filtro'],
            ['', ''],
            ['=== RESUMO FINANCEIRO ===', ''],
            ['Total Faturado', number_format($resumo['total_faturado'], 2, ',', '.') . ' Kz'],
            ['Total Pago', number_format($resumo['total_pago'], 2, ',', '.') . ' Kz'],
            ['Total Pendente', number_format($resumo['total_pendente'], 2, ',', '.') . ' Kz'],
            ['Total Cancelado', number_format($resumo['total_cancelado'], 2, ',', '.') . ' Kz'],
            ['', ''],
            ['=== MÉTRICAS ===', ''],
            ['Nº Documentos', $resumo['numero_documentos']],
            ['Clientes Ativos', $resumo['clientes_ativos']],
            ['Produtos Diferentes', $resumo['produtos_diferentes']],
            ['Ticket Médio', number_format($resumo['ticket_medio'], 2, ',', '.') . ' Kz'],
            ['', ''],
            ['=== COMPARAÇÃO COM PERÍODO ANTERIOR ===', ''],
            ['Faturamento Período Anterior', number_format($resumo['faturamento_anterior'], 2, ',', '.') . ' Kz'],
            ['Variação %', $resumo['variacao_percentual'] . '%'],
            ['', ''],
            ['=== FUNIL DE VENDAS ===', ''],
            ['Propostas (Proformas emitidas)', $resumo['funil']['propostas']],
            ['Em Negociação (Faturas pendentes)', $resumo['funil']['negociacao']],
            ['Ganhas (Pagas)', $resumo['funil']['ganhas']],
            ['Perdidas (Canceladas)', $resumo['funil']['perdidas']],
            ['', ''],
            ['=== EVOLUÇÃO MENSAL ===', ''],
        ];

        foreach ($resumo['evolucao_mensal'] as $mes) {
            $linhas[] = [
                $mes['mes'],
                "Total: " . number_format($mes['total'], 2, ',', '.') . " Kz | Qtd: {$mes['quantidade']} | Clientes: {$mes['clientes']}"
            ];
        }

        $linhas[] = ['', ''];
        $linhas[] = ['=== POR TIPO DE DOCUMENTO ===', ''];
        foreach ($resumo['por_tipo_documento'] as $tipo => $dados) {
            $linhas[] = [
                $tipo,
                "Qtd: {$dados['quantidade']} | Total: " . number_format($dados['total'], 2, ',', '.') . ' Kz | Pago: ' . number_format($dados['pago'], 2, ',', '.') . ' Kz'
            ];
        }

        return $linhas;
    }

    public function columnWidths(): array
    {
        return [
            'A' => 30,
            'B' => 60,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => RelatoriosService::COR_PRIMARIA]],
            ],
        ];
    }
}

/* =====================================================================
 | NOVAS CLASSES PARA EXPORTAÇÃO COMPLETA (COM ESTILOS MELHORADOS)
 | ================================================================== */

/**
 * Exportação do relatório completo (múltiplas folhas + gráficos)
 */
class RelatorioCompletoExport implements WithMultipleSheets
{
    protected $dataInicio;
    protected $dataFim;
    protected string $modo;
    protected string $empresaNome;
    protected ?Empresa $empresa;

    public function __construct($dataInicio, $dataFim, $modo, $empresaNome, $empresa = null)
    {
        $this->dataInicio  = $dataInicio;
        $this->dataFim     = $dataFim;
        $this->modo        = $modo;
        $this->empresaNome = $empresaNome;
        $this->empresa     = $empresa;
    }

    public function sheets(): array
    {
        $service = app(RelatoriosService::class);
        $vendas      = $service->relatorioVendas($this->dataInicio, $this->dataFim);
        $faturacao   = $service->relatorioFaturacao($this->dataInicio, $this->dataFim);
        $pagamentos  = $service->relatorioPagamentosPendentes();
        $movimentos  = $service->relatorioMovimentosStock($this->dataInicio, $this->dataFim);
        $proformas   = $service->relatorioProformas($this->dataInicio, $this->dataFim);

        return [
            'Capa'      => new CompletoCapaSheet($this->empresa, $this->dataInicio, $this->dataFim),
            'Resumo'    => new CompletoResumoSheet($vendas, $faturacao, $pagamentos, $movimentos, $this->empresaNome),
            'Vendas'    => new CompletoVendasSheet($vendas, $this->empresaNome),
            'Documentos'=> new CompletoDocumentosSheet($faturacao, $proformas, $this->empresaNome),
            'Pagamentos'=> new CompletoPagamentosSheet($pagamentos, $this->empresaNome),
            'Movimentos'=> new CompletoMovimentosSheet($movimentos, $this->empresaNome),
            'Gráficos'  => new CompletoGraficosSheet($faturacao, $vendas, $this->empresaNome),
        ];
    }
}

/* ===== FOLHA: CAPA (COM LOGO E TIMES NEW ROMAN) ===== */
class CompletoCapaSheet implements FromArray, WithHeadings, WithTitle, WithEvents, WithStyles
{
    protected $empresa;
    protected $dataInicio;
    protected $dataFim;

    public function __construct($empresa, $dataInicio, $dataFim)
    {
        $this->empresa    = $empresa;
        $this->dataInicio = $dataInicio;
        $this->dataFim    = $dataFim;
    }

    public function title(): string { return 'Capa'; }

    public function headings(): array { return []; }

    public function array(): array
    {
        $periodo = 'Sem filtro';
        if ($this->dataInicio && $this->dataFim) {
            $periodo = Carbon::parse($this->dataInicio)->format('d/m/Y') . ' a ' . Carbon::parse($this->dataFim)->format('d/m/Y');
        } elseif ($this->dataInicio) {
            $periodo = 'a partir de ' . Carbon::parse($this->dataInicio)->format('d/m/Y');
        } elseif ($this->dataFim) {
            $periodo = 'até ' . Carbon::parse($this->dataFim)->format('d/m/Y');
        }

        return [
            ['', ''],
            ['', ''],
            ['', ''],
            ['', 'RELATÓRIO COMPLETO DE DESEMPENHO'],
            ['', ''],
            ['', $this->empresa?->nome ?? ''],
            ['', ''],
            ['', 'Período: ' . $periodo],
            ['', 'Data de emissão: ' . now()->format('d/m/Y H:i')],
            ['', ''],
            ['', 'Este relatório contém as seguintes folhas:'],
            ['', ''],
            ['', '• Resumo – indicadores principais'],
            ['', '• Vendas – detalhe de todas as vendas'],
            ['', '• Documentos – resumo por tipo de documento fiscal'],
            ['', '• Pagamentos – situação de pagamentos pendentes'],
            ['', '• Movimentos – movimentos de stock detalhados'],
            ['', '• Gráficos – análises visuais dos dados'],
            ['', ''],
            ['', 'Desenvolvido por FaturaJá'],
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        return [];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // Times New Roman em toda a folha
                $sheet->getStyle($sheet->calculateWorksheetDimension())
                    ->getFont()->setName('Times New Roman');

                // Ajustes de altura
                $sheet->getRowDimension(4)->setRowHeight(30);
                $sheet->getRowDimension(6)->setRowHeight(20);
                $sheet->getRowDimension(8)->setRowHeight(18);
                $sheet->getRowDimension(9)->setRowHeight(18);
                $sheet->getRowDimension(20)->setRowHeight(16);

                // Larguras
                $sheet->getColumnDimension('A')->setWidth(10);
                $sheet->getColumnDimension('B')->setWidth(60);

                // Título principal
                $sheet->getStyle('B4')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 18,
                        'color' => ['rgb' => RelatoriosService::COR_PRIMARIA],
                    ],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Nome da empresa
                $sheet->getStyle('B6')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 14,
                        'color' => ['rgb' => RelatoriosService::COR_SECUNDARIA],
                    ],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Lista de folhas
                $sheet->getStyle('B11')->getFont()->setBold(true)->setSize(12);
                $sheet->getStyle('B13:B18')->getFont()->setSize(11);

                // Rodapé
                $sheet->getStyle('B20')->applyFromArray([
                    'font' => ['italic' => true, 'size' => 10, 'color' => ['rgb' => '808080']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Inserir logo da empresa (se existir)
                if ($this->empresa && !empty($this->empresa->logo)) {
                    try {
                        $logoPath = $this->empresa->logo;
                        $fullPath = null;
                        if (\Storage::disk('public')->exists($logoPath)) {
                            $fullPath = \Storage::disk('public')->path($logoPath);
                        } elseif (\Storage::disk('local')->exists($logoPath)) {
                            $fullPath = \Storage::disk('local')->path($logoPath);
                        } elseif (file_exists(public_path($logoPath))) {
                            $fullPath = public_path($logoPath);
                        }

                        if ($fullPath && file_exists($fullPath)) {
                            $drawing = new \PhpOffice\PhpSpreadsheet\Worksheet\Drawing();
                            $drawing->setPath($fullPath);
                            $drawing->setCoordinates('B2');
                            $drawing->setWidth(120);
                            $drawing->setHeight(80);
                            $drawing->setWorksheet($sheet);
                        }
                    } catch (\Exception $e) {
                        Log::warning('Erro ao inserir logo na capa', ['error' => $e->getMessage()]);
                    }
                }
            },
        ];
    }
}

/* ===== FOLHA: RESUMO ===== */
class CompletoResumoSheet implements FromArray, WithHeadings, WithTitle, WithStyles, WithEvents
{
    protected $vendas, $faturacao, $pagamentos, $movimentos, $empresaNome;

    public function __construct($vendas, $faturacao, $pagamentos, $movimentos, $empresaNome)
    {
        $this->vendas     = $vendas;
        $this->faturacao  = $faturacao;
        $this->pagamentos = $pagamentos;
        $this->movimentos = $movimentos;
        $this->empresaNome = $empresaNome;
    }

    public function title(): string { return 'Resumo'; }

    public function headings(): array { return ['Indicador', 'Valor']; }

    public function array(): array
    {
        $totaisV = $this->vendas['totais'] ?? [];
        $resumoP = $this->pagamentos['resumo'] ?? [];
        $resumoM = $this->movimentos['resumo'] ?? [];
        $f = $this->faturacao;

        return [
            ['RESUMO FINANCEIRO', ''],
            ['Total Vendas', number_format($totaisV['total_valor'] ?? 0, 2, ',', '.') . ' Kz'],
            ['Nº Vendas', $totaisV['total_vendas'] ?? 0],
            ['Base Tributável', number_format($totaisV['total_base_tributavel'] ?? 0, 2, ',', '.') . ' Kz'],
            ['Total IVA', number_format($totaisV['total_iva'] ?? 0, 2, ',', '.') . ' Kz'],
            ['Retenções', number_format($totaisV['total_retencao'] ?? 0, 2, ',', '.') . ' Kz'],
            ['', ''],
            ['FATURAÇÃO', ''],
            ['Faturação Total', number_format($f['faturacao_total'] ?? 0, 2, ',', '.') . ' Kz'],
            ['Faturação Paga', number_format($f['faturacao_paga'] ?? 0, 2, ',', '.') . ' Kz'],
            ['Faturação Pendente', number_format($f['faturacao_pendente'] ?? 0, 2, ',', '.') . ' Kz'],
            ['', ''],
            ['PAGAMENTOS PENDENTES', ''],
            ['Total Pendente', number_format($resumoP['total_pendente'] ?? 0, 2, ',', '.') . ' Kz'],
            ['Total Atrasado', number_format($resumoP['total_atrasado'] ?? 0, 2, ',', '.') . ' Kz'],
            ['Qtd Faturas Pendentes', $resumoP['quantidade_faturas'] ?? 0],
            ['Qtd Adiantamentos Pendentes', $resumoP['quantidade_adiantamentos'] ?? 0],
            ['', ''],
            ['MOVIMENTOS DE STOCK', ''],
            ['Total Movimentos', $resumoM['total_movimentos'] ?? 0],
            ['Entradas (unid.)', $resumoM['total_entradas'] ?? 0],
            ['Saídas (unid.)', $resumoM['total_saidas'] ?? 0],
            ['Balanço', $resumoM['balanco'] ?? 0],
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => RelatoriosService::COR_PRIMARIA]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->getStyle($sheet->calculateWorksheetDimension())->getFont()->setName('Times New Roman');

                $linhas = count($this->array()) + 1;
                if ($linhas > 1) {
                    $sheet->getStyle("A1:B{$linhas}")
                        ->getBorders()->getAllBorders()
                        ->setBorderStyle(Border::BORDER_THIN)
                        ->getColor()->setRGB('D9D9D9');

                    for ($i = 2; $i <= $linhas; $i++) {
                        if ($i % 2 == 0) {
                            $sheet->getStyle("A{$i}:B{$i}")
                                ->getFill()->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setRGB('F5F7FA');
                        }
                    }
                }
                $sheet->getStyle('A1:B1')->getFont()->setBold(true);
                $sheet->getStyle('A2:B' . $linhas)->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            },
        ];
    }
}

/* ===== FOLHA: VENDAS ===== */
class CompletoVendasSheet implements FromArray, WithHeadings, WithTitle, WithStyles, WithEvents
{
    protected $vendas, $empresaNome;

    public function __construct($vendas, $empresaNome)
    {
        $this->vendas     = $vendas;
        $this->empresaNome = $empresaNome;
    }

    public function title(): string { return 'Vendas'; }

    public function headings(): array
    {
        return ['ID', 'Nº Documento', 'Cliente', 'Data', 'Hora', 'Base Tributável', 'IVA', 'Total', 'Estado Pagamento'];
    }

    public function array(): array
    {
        $linhas = [];
        foreach (($this->vendas['vendas'] ?? []) as $v) {
            $linhas[] = [
                $v['id'] ?? '',
                $v['numero_documento'] ?? '',
                $v['cliente'] ?? '',
                $v['data'] ?? '',
                $v['hora'] ?? '',
                $v['base_tributavel'] ?? 0,
                $v['total_iva'] ?? 0,
                $v['total'] ?? 0,
                $v['estado_pagamento'] ?? '',
            ];
        }
        return $linhas;
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => RelatoriosService::COR_PRIMARIA]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->getStyle($sheet->calculateWorksheetDimension())->getFont()->setName('Times New Roman');

                $dados = $this->array();
                $linhas = count($dados) + 1;
                $ultimaColuna = 'I';
                if ($linhas > 1) {
                    $sheet->getStyle("A1:{$ultimaColuna}{$linhas}")
                        ->getBorders()->getAllBorders()
                        ->setBorderStyle(Border::BORDER_THIN)
                        ->getColor()->setRGB('D9D9D9');

                    for ($i = 2; $i <= $linhas; $i++) {
                        if ($i % 2 == 0) {
                            $sheet->getStyle("A{$i}:{$ultimaColuna}{$i}")
                                ->getFill()->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setRGB('F5F7FA');
                        }
                    }

                    // Formatação monetária
                    $sheet->getStyle("F2:I{$linhas}")->getNumberFormat()->setFormatCode('#,##0.00" Kz"');
                    $sheet->getStyle("G2:G{$linhas}")->getNumberFormat()->setFormatCode('#,##0.00" Kz"');
                }
                $sheet->getStyle('A1:I1')->getFont()->setBold(true);
            },
        ];
    }
}

/* ===== FOLHA: DOCUMENTOS FISCAIS ===== */
class CompletoDocumentosSheet implements FromArray, WithHeadings, WithTitle, WithStyles, WithEvents
{
    protected $faturacao, $proformas, $empresaNome;

    public function __construct($faturacao, $proformas, $empresaNome)
    {
        $this->faturacao = $faturacao;
        $this->proformas = $proformas;
        $this->empresaNome = $empresaNome;
    }

    public function title(): string { return 'Documentos'; }

    public function headings(): array
    {
        return ['Tipo', 'Quantidade', 'Total Líquido', 'Base', 'IVA', 'Retenção'];
    }

    public function array(): array
    {
        $linhas = [];
        $porTipo = $this->faturacao['por_tipo'] ?? [];
        foreach ($porTipo as $tipo => $dados) {
            $linhas[] = [
                $tipo,
                $dados['quantidade'] ?? 0,
                $dados['total_liquido'] ?? 0,
                $dados['total_base'] ?? 0,
                $dados['total_iva'] ?? 0,
                $dados['total_retencao'] ?? 0,
            ];
        }
        $linhas[] = ['PROFORMAS', $this->proformas['total'] ?? 0, $this->proformas['valor_total'] ?? 0, '', '', ''];
        return $linhas;
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => RelatoriosService::COR_PRIMARIA]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->getStyle($sheet->calculateWorksheetDimension())->getFont()->setName('Times New Roman');

                $dados = $this->array();
                $linhas = count($dados) + 1;
                $ultimaColuna = 'F';
                if ($linhas > 1) {
                    $sheet->getStyle("A1:{$ultimaColuna}{$linhas}")
                        ->getBorders()->getAllBorders()
                        ->setBorderStyle(Border::BORDER_THIN)
                        ->getColor()->setRGB('D9D9D9');

                    for ($i = 2; $i <= $linhas; $i++) {
                        if ($i % 2 == 0) {
                            $sheet->getStyle("A{$i}:{$ultimaColuna}{$i}")
                                ->getFill()->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setRGB('F5F7FA');
                        }
                    }
                    // Moeda nas colunas C, D, E, F
                    $sheet->getStyle("C2:F{$linhas}")->getNumberFormat()->setFormatCode('#,##0.00" Kz"');
                }
                $sheet->getStyle('A1:F1')->getFont()->setBold(true);
            },
        ];
    }
}

/* ===== FOLHA: PAGAMENTOS PENDENTES ===== */
class CompletoPagamentosSheet implements FromArray, WithHeadings, WithTitle, WithStyles, WithEvents
{
    protected $pagamentos, $empresaNome;

    public function __construct($pagamentos, $empresaNome)
    {
        $this->pagamentos = $pagamentos;
        $this->empresaNome = $empresaNome;
    }

    public function title(): string { return 'Pagamentos'; }

    public function headings(): array
    {
        return ['Documento', 'Cliente', 'Valor Pendente', 'Dias Atraso', 'Estado'];
    }

    public function array(): array
    {
        $linhas = [];
        foreach (($this->pagamentos['faturas_pendentes'] ?? []) as $f) {
            $linhas[] = [
                $f['numero_documento'] ?? '',
                $f['cliente'] ?? '',
                $f['valor_pendente'] ?? 0,
                $f['dias_atraso'] ?? 0,
                $f['estado'] ?? '',
            ];
        }
        return $linhas;
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => RelatoriosService::COR_PRIMARIA]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->getStyle($sheet->calculateWorksheetDimension())->getFont()->setName('Times New Roman');

                $dados = $this->array();
                $linhas = count($dados) + 1;
                $ultimaColuna = 'E';
                if ($linhas > 1) {
                    $sheet->getStyle("A1:{$ultimaColuna}{$linhas}")
                        ->getBorders()->getAllBorders()
                        ->setBorderStyle(Border::BORDER_THIN)
                        ->getColor()->setRGB('D9D9D9');

                    for ($i = 2; $i <= $linhas; $i++) {
                        if ($i % 2 == 0) {
                            $sheet->getStyle("A{$i}:{$ultimaColuna}{$i}")
                                ->getFill()->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setRGB('F5F7FA');
                        }
                    }
                    $sheet->getStyle("C2:C{$linhas}")->getNumberFormat()->setFormatCode('#,##0.00" Kz"');
                }
                $sheet->getStyle('A1:E1')->getFont()->setBold(true);
            },
        ];
    }
}

/* ===== FOLHA: MOVIMENTOS STOCK ===== */
class CompletoMovimentosSheet implements FromArray, WithHeadings, WithTitle, WithStyles, WithEvents
{
    protected $movimentos, $empresaNome;

    public function __construct($movimentos, $empresaNome)
    {
        $this->movimentos = $movimentos;
        $this->empresaNome = $empresaNome;
    }

    public function title(): string { return 'Movimentos'; }

    public function headings(): array
    {
        return ['Produto', 'Tipo', 'Tipo Movimento', 'Quantidade', 'Stock Ant.', 'Stock Novo', 'Data'];
    }

    public function array(): array
    {
        $linhas = [];
        foreach (($this->movimentos['movimentos'] ?? []) as $m) {
            $linhas[] = [
                $m['produto_nome'] ?? '',
                $m['tipo'] ?? '',
                $m['tipo_movimento'] ?? '',
                $m['quantidade'] ?? 0,
                $m['estoque_anterior'] ?? 0,
                $m['estoque_novo'] ?? 0,
                $m['data'] ?? '',
            ];
        }
        return $linhas;
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => RelatoriosService::COR_PRIMARIA]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->getStyle($sheet->calculateWorksheetDimension())->getFont()->setName('Times New Roman');

                $dados = $this->array();
                $linhas = count($dados) + 1;
                $ultimaColuna = 'G';
                if ($linhas > 1) {
                    $sheet->getStyle("A1:{$ultimaColuna}{$linhas}")
                        ->getBorders()->getAllBorders()
                        ->setBorderStyle(Border::BORDER_THIN)
                        ->getColor()->setRGB('D9D9D9');

                    for ($i = 2; $i <= $linhas; $i++) {
                        if ($i % 2 == 0) {
                            $sheet->getStyle("A{$i}:{$ultimaColuna}{$i}")
                                ->getFill()->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setRGB('F5F7FA');
                        }
                    }
                }
                $sheet->getStyle('A1:G1')->getFont()->setBold(true);
            },
        ];
    }
}

/* ===== FOLHA: GRÁFICOS (COM CORREÇÃO DO TÍTULO) ===== */
class CompletoGraficosSheet implements FromArray, WithHeadings, WithTitle, WithStyles, WithEvents
{
    protected $faturacao;
    protected $vendas;
    protected $empresaNome;

    public function __construct($faturacao, $vendas, $empresaNome)
    {
        $this->faturacao = $faturacao;
        $this->vendas    = $vendas;
        $this->empresaNome = $empresaNome;
    }

    public function title(): string { return 'Gráficos'; }

    public function headings(): array
    {
        return ['Mês', 'Faturação (Kz)'];
    }

    public function array(): array
    {
        $meses = $this->faturacao['faturacao_por_mes'] ?? [];
        $dados = [];
        foreach ($meses as $m) {
            $dados[] = [$m['mes'], $m['total']];
        }
        if (empty($dados)) {
            $dados = [['Sem dados', 0]];
        }
        return $dados;
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Times New Roman');
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => RelatoriosService::COR_PRIMARIA]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->getStyle($sheet->calculateWorksheetDimension())->getFont()->setName('Times New Roman');

                $colunas = $this->array();
                $linhas = count($colunas) + 1;

                if ($linhas < 2) return;

                $sheet->getStyle("A2:B{$linhas}")
                    ->getNumberFormat()
                    ->setFormatCode('#,##0.00" Kz"');

                // ========== GRÁFICO DE BARRAS ==========
                $dataSeriesLabels = [
                    new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, 'Gráficos!$B$1', null, 1),
                ];
                $xAxisTickValues = [
                    new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, 'Gráficos!$A$2:$A$' . $linhas, null, $linhas - 1),
                ];
                $dataSeriesValues = [
                    new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_NUMBER, 'Gráficos!$B$2:$B$' . $linhas, null, $linhas - 1),
                ];

                $series = new DataSeries(
                    DataSeries::TYPE_BARCHART,
                    DataSeries::GROUPING_CLUSTERED,
                    range(0, count($dataSeriesValues) - 1),
                    $dataSeriesLabels,
                    $xAxisTickValues,
                    $dataSeriesValues
                );
                $series->setPlotDirection(DataSeries::DIRECTION_COL);

                $plotArea = new PlotArea(null, [$series]);
                $legend = new Legend(Legend::POSITION_RIGHT, null, false);
                $title = new Title('Faturação Mensal (Kz)');

                $chart = new Chart('chart1', $title, $legend, $plotArea, true, 0, null, null);
                $chart->setTopLeftPosition('D1');
                $chart->setBottomRightPosition('M15');
                $sheet->addChart($chart);

                // ========== GRÁFICO DE PIZZA ==========
                $tipos = $this->faturacao['por_tipo'] ?? [];
                $labels = [];
                $values = [];
                foreach ($tipos as $tipo => $dados) {
                    $labels[] = $tipo;
                    $values[] = $dados['total_liquido'] ?? 0;
                }

                if (count($labels) > 0) {
                    $sheet->setCellValue('D16', 'Tipo');
                    $sheet->setCellValue('E16', 'Total');
                    $row = 17;
                    foreach ($labels as $i => $label) {
                        $sheet->setCellValue("D{$row}", $label);
                        $sheet->setCellValue("E{$row}", $values[$i]);
                        $row++;
                    }

                    $dataSeriesLabelsPie = [
                        new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, 'Gráficos!$E$16', null, 1),
                    ];
                    $xAxisTickValuesPie = [
                        new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, 'Gráficos!$D$17:$D$' . ($row-1), null, $row-17),
                    ];
                    $dataSeriesValuesPie = [
                        new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_NUMBER, 'Gráficos!$E$17:$E$' . ($row-1), null, $row-17),
                    ];

                    $seriesPie = new DataSeries(
                        DataSeries::TYPE_PIECHART,
                        null,
                        range(0, count($dataSeriesValuesPie) - 1),
                        $dataSeriesLabelsPie,
                        $xAxisTickValuesPie,
                        $dataSeriesValuesPie
                    );

                    $plotAreaPie = new PlotArea(null, [$seriesPie]);
                    $legendPie = new Legend(Legend::POSITION_RIGHT, null, false);
                    $titlePie = new Title('Distribuição por Tipo de Documento');

                    $chartPie = new Chart('chart2', $titlePie, $legendPie, $plotAreaPie, true, 0, null, null);
                    $chartPie->setTopLeftPosition('D18');
                    $chartPie->setBottomRightPosition('M35');
                    $sheet->addChart($chartPie);
                }

                // Bordas para a tabela de dados
                $sheet->getStyle("A1:B{$linhas}")
                    ->getBorders()->getAllBorders()
                    ->setBorderStyle(Border::BORDER_THIN)
                    ->getColor()->setRGB('D9D9D9');

                // Zebra na tabela de dados
                for ($i = 2; $i <= $linhas; $i++) {
                    if ($i % 2 == 0) {
                        $sheet->getStyle("A{$i}:B{$i}")
                            ->getFill()->setFillType(Fill::FILL_SOLID)
                            ->getStartColor()->setRGB('F5F7FA');
                    }
                }

                // Larguras
                foreach (range('A', 'M') as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }

                // Rodapé
                $sheet->setCellValue('A37', 'Relatório gerado por FaturaJá - www.faturaja.ao');
                $sheet->getStyle('A37')->getFont()->setItalic(true)->setSize(8)->getColor()->setRGB('808080');
            },
        ];
    }
}