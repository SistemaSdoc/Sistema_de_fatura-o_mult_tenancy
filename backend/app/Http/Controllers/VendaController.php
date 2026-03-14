<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Venda;
use App\Models\Cliente;
use App\Models\Produto;
use App\Services\VendaService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class VendaController extends Controller
{
    protected $vendaService;

    public function __construct(VendaService $vendaService)
    {
        $this->vendaService = $vendaService;
        $this->authorizeResource(Venda::class, 'venda');
    }

    /**
     * Dados para criar nova venda
     */
    public function create()
    {
        $clientes = Cliente::where('status', 'ativo')->get();

        // Separar produtos e serviços para melhor exibição
        $produtos = Produto::where('status', 'ativo')->get();

        return response()->json([
            'clientes' => $clientes,
            'produtos' => $produtos,
            'estatisticas' => [
                'total_produtos' => $produtos->where('tipo', 'produto')->count(),
                'total_servicos' => $produtos->where('tipo', 'servico')->count(),
            ]
        ]);
    }

    /**
     * Listar TODAS as vendas com filtros melhorados
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Venda::class);

        // Carrega vendas com todos os relacionamentos necessários
        $query = Venda::with([
            'cliente',
            'user',
            'itens.produto',
            'documentoFiscal' => function ($q) {
                $q->with(['recibos', 'notasCredito', 'notasDebito']);
            }
        ]);

        // ===== FILTROS MELHORADOS E ORGANIZADOS =====

        // Filtro por status da venda
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        // Filtro por estado de pagamento
        if ($request->has('estado_pagamento') && !empty($request->estado_pagamento)) {
            $query->where('estado_pagamento', $request->estado_pagamento);
        }

        // Filtro por tipo de documento fiscal
        if ($request->has('tipo_documento') && !empty($request->tipo_documento)) {
            $query->whereHas('documentoFiscal', function ($q) use ($request) {
                $q->where('tipo_documento', $request->tipo_documento);
            });
        }

        // Filtro por tipo de item (produto/serviço)
        if ($request->has('tipo_item') && !empty($request->tipo_item)) {
            $query->whereHas('itens.produto', function ($q) use ($request) {
                $q->where('tipo', $request->tipo_item);
            });
        }

        // Filtro por cliente (ID ou nome)
        if ($request->has('cliente_id') && !empty($request->cliente_id)) {
            $query->where('cliente_id', $request->cliente_id);
        }

        if ($request->has('cliente_nome') && !empty($request->cliente_nome)) {
            $query->where('cliente_nome', 'like', '%' . $request->cliente_nome . '%');
        }

        // Filtro por período (data)
        if ($request->has('data_inicio') && !empty($request->data_inicio)) {
            $query->whereDate('data_venda', '>=', Carbon::parse($request->data_inicio)->format('Y-m-d'));
        }

        if ($request->has('data_fim') && !empty($request->data_fim)) {
            $query->whereDate('data_venda', '<=', Carbon::parse($request->data_fim)->format('Y-m-d'));
        }

        // Filtro por valor mínimo/máximo
        if ($request->has('valor_min') && is_numeric($request->valor_min)) {
            $query->where('total', '>=', $request->valor_min);
        }

        if ($request->has('valor_max') && is_numeric($request->valor_max)) {
            $query->where('total', '<=', $request->valor_max);
        }

        // Filtro por número do documento
        if ($request->has('numero_documento') && !empty($request->numero_documento)) {
            $query->where('numero_documento', 'like', '%' . $request->numero_documento . '%');
        }

        // Filtros booleanos/pré-definidos
        if ($request->has('faturadas') && $request->faturadas === 'true') {
            $query->where('status', 'faturada');
        }

        if ($request->has('apenas_vendas') && $request->apenas_vendas === 'true') {
            $query->whereHas('documentoFiscal', function ($q) {
                $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
            });
        }

        if ($request->has('apenas_nao_vendas') && $request->apenas_nao_vendas === 'true') {
            $query->whereHas('documentoFiscal', function ($q) {
                $q->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']);
            });
        }

        if ($request->has('pendentes') && $request->pendentes === 'true') {
            $query->whereIn('estado_pagamento', ['pendente', 'parcial']);
        }

        if ($request->has('com_retencao') && $request->com_retencao === 'true') {
            $query->where('total_retencao', '>', 0);
        }

        // Ordenação
        $orderBy = $request->get('order_by', 'data_venda');
        $orderDir = $request->get('order_dir', 'desc');

        if (in_array($orderBy, ['data_venda', 'created_at', 'total', 'numero_documento'])) {
            $query->orderBy($orderBy, $orderDir);
        } else {
            $query->orderBy('data_venda', 'desc');
        }

        // Paginação
        $perPage = $request->get('per_page', 15);
        $vendas = $query->paginate($perPage);

        return response()->json([
            'message' => 'Lista de vendas carregada',
            'vendas' => $vendas->map(function ($venda) {
                return $this->formatarVenda($venda);
            }),
            'pagination' => [
                'current_page' => $vendas->currentPage(),
                'last_page' => $vendas->lastPage(),
                'per_page' => $vendas->perPage(),
                'total' => $vendas->total(),
            ]
        ]);
    }

    /**
     * Mostrar venda específica
     */
    public function show(Venda $venda)
    {
        $this->authorize('view', $venda);

        $venda->load(['cliente', 'user', 'itens.produto', 'documentoFiscal.recibos']);

        return response()->json([
            'message' => 'Venda carregada',
            'venda' => $this->formatarVenda($venda, true),
        ]);
    }

    /**
     * Criar nova venda
     */
    public function store(Request $request)
    {
        $this->authorize('create', Venda::class);

        Log::info('VendaController::store - Request recebida', [
            'all' => $request->all(),
            'tipo_documento' => $request->input('tipo_documento'),
            'faturar' => $request->input('faturar')
        ]);

        // Validação
        $dados = $request->validate([
            'cliente_id' => 'nullable|uuid|exists:clientes,id',
            'cliente_nome' => 'nullable|string|max:255',
            'cliente_nif' => 'nullable|string|max:20',
            'itens' => 'required|array|min:1',
            'itens.*.produto_id' => 'required|uuid|exists:produtos,id',
            'itens.*.quantidade' => 'required|integer|min:1',
            'itens.*.preco_venda' => 'required|numeric|min:0',
            'itens.*.desconto' => 'nullable|numeric|min:0',
            'itens.*.taxa_retencao' => 'nullable|numeric|min:0|max:100',
            'faturar' => 'nullable|boolean',
            'tipo_documento' => 'nullable|in:FT,FR,FP,FA',
            'dados_pagamento' => 'nullable|array',
            'dados_pagamento.metodo' => 'required_with:dados_pagamento|in:transferencia,multibanco,dinheiro,cheque,cartao',
            'dados_pagamento.valor' => 'required_with:dados_pagamento|numeric|min:0',
            'dados_pagamento.referencia' => 'nullable|string|max:255',
            'observacoes' => 'nullable|string|max:1000',
        ]);

        // VALIDAÇÃO PARA CLIENTE AVULSO
        if (empty($dados['cliente_id']) && empty($dados['cliente_nome'])) {
            return response()->json([
                'message' => 'É necessário informar um cliente (selecionado ou avulso).'
            ], 422);
        }

        $venda = $this->vendaService->criarVenda(
            $dados,
            $dados['faturar'] ?? false,
            $dados['tipo_documento'] ?? 'FT'
        );

        Log::info('VendaController::store - Venda criada', [
            'venda_id' => $venda->id,
            'tipo_documento_gerado' => $venda->documentoFiscal?->tipo_documento ?? 'N/A',
        ]);

        return response()->json([
            'message' => 'Venda criada com sucesso',
            'venda' => $this->formatarVenda($venda->load('itens.produto', 'documentoFiscal')),
        ]);
    }

    /**
     * Cancelar venda
     */
    public function cancelar(Venda $venda, Request $request)
    {
        $this->authorize('cancel', $venda);

        $request->validate([
            'motivo' => 'required|string|max:500'
        ]);

        if ($venda->estado_pagamento === 'paga') {
            return response()->json([
                'message' => 'Não é possível cancelar uma venda já paga. Cancele o documento fiscal primeiro.'
            ], 422);
        }

        $vendaCancelada = $this->vendaService->cancelarVenda($venda->id, $request->motivo);

        return response()->json([
            'message' => 'Venda cancelada com sucesso',
            'venda' => $this->formatarVenda($vendaCancelada),
        ]);
    }

    /**
     * Gerar recibo para venda (FT pendente)
     */
    public function gerarRecibo(Venda $venda, Request $request)
    {
        $this->authorize('update', $venda);

        $dados = $request->validate([
            'valor' => 'required|numeric|min:0.01',
            'metodo_pagamento' => 'required|in:transferencia,multibanco,dinheiro,cheque,cartao',
            'data_pagamento' => 'nullable|date',
            'referencia' => 'nullable|string|max:100'
        ]);

        $resultado = $this->vendaService->processarPagamento($venda->id, $dados);

        return response()->json([
            'message' => 'Recibo gerado com sucesso',
            'recibo' => $resultado['recibo'],
            'venda' => $this->formatarVenda($resultado['venda']),
        ]);
    }

    /**
     * Estatísticas para dashboard (AGORA COM FILTROS DE DATA)
     */
    public function estatisticas(Request $request)
    {
        $this->authorize('viewAny', Venda::class);

        $query = Venda::query();

        // Aplicar filtros de data se fornecidos
        if ($request->has('data_inicio') && !empty($request->data_inicio)) {
            $query->whereDate('data_venda', '>=', Carbon::parse($request->data_inicio)->format('Y-m-d'));
        }

        if ($request->has('data_fim') && !empty($request->data_fim)) {
            $query->whereDate('data_venda', '<=', Carbon::parse($request->data_fim)->format('Y-m-d'));
        }

        // Se não houver filtros de data, usar ano/mês como fallback
        if (!$request->has('data_inicio') && !$request->has('data_fim')) {
            $ano = $request->get('ano', Carbon::now()->year);
            $mes = $request->get('mes');

            $query->whereYear('data_venda', $ano);
            if ($mes) {
                $query->whereMonth('data_venda', $mes);
            }
        }

        $estatisticas = [
            'total_vendas' => $query->sum('total'),
            'total_vendas_mes' => $query->clone()->whereHas('documentoFiscal', fn($q) => $q->whereIn('tipo_documento', ['FT', 'FR']))->sum('total'),
            'total_proformas' => $query->clone()->whereHas('documentoFiscal', fn($q) => $q->where('tipo_documento', 'FP'))->sum('total'),
            'total_adiantamentos' => $query->clone()->whereHas('documentoFiscal', fn($q) => $q->where('tipo_documento', 'FA'))->sum('total'),
            'total_retencao' => $query->sum('total_retencao'),
            'total_iva' => $query->sum('total_iva'),

            'quantidade_vendas' => $query->clone()->whereHas('documentoFiscal', fn($q) => $q->whereIn('tipo_documento', ['FT', 'FR']))->count(),
            'quantidade_pendentes' => $query->clone()->whereIn('estado_pagamento', ['pendente', 'parcial'])->count(),
            'quantidade_pagas' => $query->clone()->where('estado_pagamento', 'paga')->count(),

            'vendas_por_dia' => $query->clone()
                ->select(DB::raw('DATE(data_venda) as data'), DB::raw('SUM(total) as total'))
                ->groupBy('data')
                ->orderBy('data')
                ->get(),
        ];

        return response()->json($estatisticas);
    }

    /**
     * Exportar relatório (JÁ TEM FILTROS DE DATA)
     */
    public function relatorio(Request $request)
    {
        $this->authorize('viewAny', Venda::class);

        $tipo = $request->get('tipo', 'vendas'); // vendas, proformas, adiantamentos

        $query = Venda::with(['cliente', 'documentoFiscal']);

        if ($tipo === 'vendas') {
            $query->whereHas('documentoFiscal', fn($q) => $q->whereIn('tipo_documento', ['FT', 'FR']));
        } elseif ($tipo === 'proformas') {
            $query->whereHas('documentoFiscal', fn($q) => $q->where('tipo_documento', 'FP'));
        } elseif ($tipo === 'adiantamentos') {
            $query->whereHas('documentoFiscal', fn($q) => $q->where('tipo_documento', 'FA'));
        }

        // Aplicar filtros de data
        if ($request->has('data_inicio')) {
            $query->whereDate('data_venda', '>=', $request->data_inicio);
        }
        if ($request->has('data_fim')) {
            $query->whereDate('data_venda', '<=', $request->data_fim);
        }

        $vendas = $query->orderBy('data_venda', 'desc')->get();

        return response()->json([
            'relatorio' => $vendas->map(fn($v) => [
                'data' => $v->data_venda,
                'numero' => $v->numero_documento,
                'cliente' => $v->cliente_nome ?? $v->cliente?->nome ?? 'Consumidor Final',
                'tipo' => $v->tipo_documento_nome,
                'total' => $v->total,
                'estado' => $v->estado_pagamento,
            ]),
            'total_geral' => $vendas->sum('total'),
        ]);
    }

    /**
     * Formatar venda para resposta (evita duplicação de código)
     */
    private function formatarVenda(Venda $venda, bool $detalhado = false): array
    {
        $servicos = $venda->itens->filter(function ($item) {
            return $item->produto && $item->produto->tipo === 'servico';
        });

        $totalRetencaoServicos = $servicos->sum('valor_retencao');

        $dados = [
            'id' => $venda->id,
            'numero' => $venda->documentoFiscal?->numero_documento ?? $venda->numero ?? 'N/A',
            'serie' => $venda->documentoFiscal?->serie ?? $venda->serie ?? 'A',
            'numero_documento' => $venda->documentoFiscal?->numero_documento ?? $venda->numero_documento ?? 'N/A',
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
            'user' => $venda->user ? [
                'id' => $venda->user->id,
                'name' => $venda->user->name,
            ] : null,
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
            'eh_venda' => $venda->eh_venda,
            'estado_pagamento' => $venda->estado_pagamento,
            'paga' => $venda->estado_pagamento === 'paga',
            'valor_pendente' => $venda->valor_pendente,
            'valor_pago' => $venda->valor_pago,
            'pode_receber_pagamento' => $venda->pode_receber_pagamento,
            'pode_ser_cancelada' => $venda->pode_ser_cancelada,
            'observacoes' => $venda->observacoes,
        ];

        if ($venda->documentoFiscal) {
            $dados['documento_fiscal'] = [
                'id' => $venda->documentoFiscal->id,
                'numero_documento' => $venda->documentoFiscal->numero_documento,
                'tipo_documento' => $venda->documentoFiscal->tipo_documento,
                'tipo_documento_nome' => $venda->documentoFiscal->tipo_documento_nome,
                'data_emissao' => $venda->documentoFiscal->data_emissao,
                'hora_emissao' => $venda->documentoFiscal->hora_emissao,
                'data_vencimento' => $venda->documentoFiscal->data_vencimento,
                'estado' => $venda->documentoFiscal->estado,
                'hash_fiscal' => $venda->documentoFiscal->hash_fiscal,
                'retencao_total' => (float) ($venda->documentoFiscal->total_retencao ?? 0),
                'recibos' => $venda->documentoFiscal->recibos->map(fn($r) => [
                    'id' => $r->id,
                    'numero' => $r->numero_documento,
                    'valor' => (float) $r->total_liquido,
                    'metodo_pagamento' => $r->metodo_pagamento,
                    'data_emissao' => $r->data_emissao,
                ]),
            ];
        }

        if ($detalhado) {
            $dados['itens'] = $venda->itens->map(function ($item) {
                return [
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
                    'valor_iva' => (float) $item->valor_iva,
                    'taxa_iva' => (float) $item->taxa_iva,
                    'valor_retencao' => (float) ($item->valor_retencao ?? 0),
                    'taxa_retencao' => (float) ($item->taxa_retencao ?? 0),
                    'subtotal' => (float) $item->subtotal,
                    'eh_servico' => $item->produto && $item->produto->tipo === 'servico',
                ];
            });

            $dados['totais_por_tipo'] = [
                'produtos' => [
                    'quantidade' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'produto')->count(),
                    'total' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'produto')->sum('subtotal'),
                ],
                'servicos' => [
                    'quantidade' => $servicos->count(),
                    'total' => $servicos->sum('subtotal'),
                    'retencao' => $totalRetencaoServicos,
                ],
            ];
        }

        return $dados;
    }
}
