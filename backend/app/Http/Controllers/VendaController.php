<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Venda;
use App\Models\Cliente;
use App\Models\Produto;
use App\Services\VendaService;
use Carbon\Carbon;

/**
 * VendaController
 *
 * Delega toda a lógica de negócio ao VendaService.
 * O controller faz apenas: validação de request, autorização e resposta JSON.
 */
class VendaController extends Controller
{
    public function __construct(protected VendaService $vendaService)
    {
        $this->authorizeResource(Venda::class, 'venda');
    }

    /* =====================================================================
     | DADOS PARA CRIAÇÃO
     | ================================================================== */

    public function create()
    {
        $clientes = Cliente::where('status', 'ativo')->get();
        $produtos = Produto::where('status', 'ativo')->get();

        return response()->json([
            'clientes'      => $clientes,
            'produtos'      => $produtos,
            'estatisticas'  => [
                'total_produtos' => $produtos->where('tipo', 'produto')->count(),
                'total_servicos' => $produtos->where('tipo', 'servico')->count(),
            ],
        ]);
    }

    /* =====================================================================
     | LISTAGEM
     | ================================================================== */

    public function index(Request $request)
    {
        $this->authorize('viewAny', Venda::class);

        $query = Venda::with([
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
            $query->whereHas('documentoFiscal', fn ($q) => $q->where('tipo_documento', $request->tipo_documento));
        }
        if ($request->filled('tipo_item')) {
            $query->whereHas('itens.produto', fn ($q) => $q->where('tipo', $request->tipo_item));
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
            $query->whereHas('documentoFiscal', fn ($q) => $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']));
        }
        if ($request->boolean('apenas_nao_vendas')) {
            $query->whereHas('documentoFiscal', fn ($q) => $q->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']));
        }

        // Ordenação segura
        $orderBy  = in_array($request->order_by, ['data_venda', 'created_at', 'total', 'numero_documento'])
            ? $request->order_by
            : 'data_venda';
        $orderDir = $request->order_dir === 'asc' ? 'asc' : 'desc';
        $query->orderBy($orderBy, $orderDir);

        $vendas = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'message'    => 'Lista de vendas carregada',
            'vendas'     => $vendas->map(fn ($v) => $this->formatarVenda($v)),
            'pagination' => [
                'current_page' => $vendas->currentPage(),
                'last_page'    => $vendas->lastPage(),
                'per_page'     => $vendas->perPage(),
                'total'        => $vendas->total(),
            ],
        ]);
    }

    /* =====================================================================
     | DETALHE
     | ================================================================== */

    public function show(Venda $venda)
    {
        $this->authorize('view', $venda);
        $venda->load(['cliente', 'user', 'itens.produto', 'documentoFiscal.recibos']);

        return response()->json([
            'message' => 'Venda carregada',
            'venda'   => $this->formatarVenda($venda, true),
        ]);
    }

    /* =====================================================================
     | CRIAR VENDA
     | ================================================================== */

    public function store(Request $request)
    {
        $this->authorize('create', Venda::class);

        $dados = $request->validate([
            'cliente_id'                  => 'nullable|uuid|exists:clientes,id',
            'cliente_nome'                => 'nullable|string|max:255',
            'cliente_nif'                 => 'nullable|string|max:20',
            'itens'                       => 'required|array|min:1',
            'itens.*.produto_id'          => 'required|uuid|exists:produtos,id',
            'itens.*.quantidade'          => 'required|integer|min:1',
            'itens.*.preco_venda'         => 'required|numeric|min:0',
            'itens.*.desconto'            => 'nullable|numeric|min:0',
            'itens.*.taxa_iva'            => 'nullable|numeric|in:0,5,14',
            'itens.*.taxa_retencao'       => 'nullable|numeric|in:0,2,5,6.5,10,15',
            'itens.*.codigo_isencao'      => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
            'faturar'                     => 'nullable|boolean',
            'tipo_documento'              => 'nullable|in:FT,FR,FP,FA',
            'dados_pagamento'             => 'nullable|array',
            'dados_pagamento.metodo'      => 'required_with:dados_pagamento|in:transferencia,multibanco,dinheiro,cheque,cartao',
            'dados_pagamento.valor'       => 'required_with:dados_pagamento|numeric|min:0',
            'dados_pagamento.referencia'  => 'nullable|string|max:255',
            'observacoes'                 => 'nullable|string|max:1000',
        ]);

        if (empty($dados['cliente_id']) && empty($dados['cliente_nome'])) {
            return response()->json(['message' => 'É necessário informar um cliente (cadastrado ou avulso).'], 422);
        }

        try {
            $venda = $this->vendaService->criarVenda(
                $dados,
                (bool) ($dados['faturar'] ?? false),
                $dados['tipo_documento'] ?? 'FT'
            );

            return response()->json([
                'message' => 'Venda criada com sucesso',
                'venda'   => $this->formatarVenda($venda->load('itens.produto', 'documentoFiscal')),
            ]);

        } catch (\Exception $e) {
            Log::error('[VENDA STORE ERROR]', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /* =====================================================================
     | CANCELAR
     | ================================================================== */

    public function cancelar(Venda $venda, Request $request)
    {
        $this->authorize('cancel', $venda);

        $request->validate(['motivo' => 'required|string|max:500']);

        if ($venda->estado_pagamento === 'paga') {
            return response()->json([
                'message' => 'Não é possível cancelar uma venda já paga. Cancele o documento fiscal primeiro.',
            ], 422);
        }

        try {
            $vendaCancelada = $this->vendaService->cancelarVenda($venda->id, $request->motivo);

            return response()->json([
                'message' => 'Venda cancelada com sucesso',
                'venda'   => $this->formatarVenda($vendaCancelada),
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /* =====================================================================
     | GERAR RECIBO
     | ================================================================== */

    public function gerarRecibo(Venda $venda, Request $request)
    {
        $this->authorize('update', $venda);

        $dados = $request->validate([
            'valor'             => 'required|numeric|min:0.01',
            'metodo_pagamento'  => 'required|in:transferencia,multibanco,dinheiro,cheque,cartao',
            'data_pagamento'    => 'nullable|date',
            'referencia'        => 'nullable|string|max:100',
        ]);

        try {
            $resultado = $this->vendaService->processarPagamento($venda->id, $dados);

            return response()->json([
                'message' => 'Recibo gerado com sucesso',
                'recibo'  => $resultado['recibo'],
                'venda'   => $this->formatarVenda($resultado['venda']),
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /* =====================================================================
     | ESTATÍSTICAS
     | ================================================================== */

    public function estatisticas(Request $request)
    {
        $this->authorize('viewAny', Venda::class);

        $query = Venda::query();

        if ($request->filled('data_inicio')) {
            $query->whereDate('data_venda', '>=', Carbon::parse($request->data_inicio));
        }
        if ($request->filled('data_fim')) {
            $query->whereDate('data_venda', '<=', Carbon::parse($request->data_fim));
        }

        // Se sem filtros de data, usa o ano/mês
        if (! $request->filled('data_inicio') && ! $request->filled('data_fim')) {
            $ano = $request->get('ano', Carbon::now()->year);
            $mes = $request->get('mes');
            $query->whereYear('data_venda', $ano);
            if ($mes) {
                $query->whereMonth('data_venda', $mes);
            }
        }

        return response()->json([
            'total_vendas'       => (float) $query->sum('total'),
            'total_retencao'     => (float) $query->sum('total_retencao'),
            'total_iva'          => (float) $query->sum('total_iva'),
            'quantidade_vendas'  => (clone $query)->whereHas('documentoFiscal', fn ($q) => $q->whereIn('tipo_documento', ['FT', 'FR']))->count(),
            'quantidade_pendentes' => (clone $query)->whereIn('estado_pagamento', ['pendente', 'parcial'])->count(),
            'quantidade_pagas'   => (clone $query)->where('estado_pagamento', 'paga')->count(),
            'vendas_por_dia'     => (clone $query)->select(
                DB::raw('DATE(data_venda) as data'),
                DB::raw('SUM(total) as total')
            )->groupBy('data')->orderBy('data')->get(),
        ]);
    }

    /* =====================================================================
     | RELATÓRIO
     | ================================================================== */

    public function relatorio(Request $request)
    {
        $this->authorize('viewAny', Venda::class);

        $tipo  = $request->get('tipo', 'vendas');

        $query = Venda::with(['cliente', 'documentoFiscal']);

        match ($tipo) {
            'vendas'        => $query->whereHas('documentoFiscal', fn ($q) => $q->whereIn('tipo_documento', ['FT', 'FR'])),
            'proformas'     => $query->whereHas('documentoFiscal', fn ($q) => $q->where('tipo_documento', 'FP')),
            'adiantamentos' => $query->whereHas('documentoFiscal', fn ($q) => $q->where('tipo_documento', 'FA')),
            default         => null,
        };

        if ($request->filled('data_inicio')) {
            $query->whereDate('data_venda', '>=', $request->data_inicio);
        }
        if ($request->filled('data_fim')) {
            $query->whereDate('data_venda', '<=', $request->data_fim);
        }

        $vendas = $query->orderBy('data_venda', 'desc')->get();

        return response()->json([
            'relatorio'   => $vendas->map(fn ($v) => [
                'data'    => $v->data_venda,
                'numero'  => $v->numero_documento,
                'cliente' => $v->cliente_nome ?? $v->cliente?->nome ?? 'Consumidor Final',
                'tipo'    => $v->tipo_documento_nome,
                'total'   => (float) $v->total,
                'estado'  => $v->estado_pagamento,
            ]),
            'total_geral' => (float) $vendas->sum('total'),
        ]);
    }

    /* =====================================================================
     | HELPER PRIVADO — FORMATAR VENDA
     | ================================================================== */

    private function formatarVenda(Venda $venda, bool $detalhado = false): array
    {
        $servicos              = $venda->itens->filter(fn ($i) => $i->produto?->tipo === 'servico');
        $totalRetencaoServicos = $servicos->sum('valor_retencao');

        $dados = [
            'id'                         => $venda->id,
            'numero_documento'           => $venda->documentoFiscal?->numero_documento ?? $venda->numero_documento ?? 'N/A',
            'serie'                      => $venda->documentoFiscal?->serie ?? $venda->serie ?? 'A',
            'tipo_documento'             => $venda->documentoFiscal?->tipo_documento ?? 'venda',
            'tipo_documento_nome'        => $venda->tipo_documento_nome,
            'cliente_id'                 => $venda->cliente_id,
            'cliente'                    => $venda->cliente ? [
                'id'       => $venda->cliente->id,
                'nome'     => $venda->cliente->nome,
                'nif'      => $venda->cliente->nif,
                'tipo'     => $venda->cliente->tipo,
                'telefone' => $venda->cliente->telefone,
                'email'    => $venda->cliente->email,
                'endereco' => $venda->cliente->endereco,
            ] : null,
            'cliente_nome'               => $venda->cliente_nome,
            'cliente_nif'                => $venda->cliente_nif,
            'user'                       => $venda->user
                ? ['id' => $venda->user->id, 'name' => $venda->user->name]
                : null,
            'data_venda'                 => $venda->data_venda,
            'hora_venda'                 => $venda->hora_venda,
            'created_at'                 => $venda->created_at,
            'total'                      => (float) $venda->total,
            'base_tributavel'            => (float) $venda->base_tributavel,
            'total_iva'                  => (float) $venda->total_iva,
            'total_retencao'             => (float) $venda->total_retencao,
            'total_retencao_servicos'    => (float) $totalRetencaoServicos,
            'tem_servicos'               => $servicos->count() > 0,
            'quantidade_servicos'        => $servicos->count(),
            'status'                     => $venda->status,
            'faturado'                   => ! is_null($venda->documentoFiscal),
            'estado_pagamento'           => $venda->estado_pagamento,
            'paga'                       => $venda->estado_pagamento === 'paga',
            'valor_pendente'             => $venda->valor_pendente,
            'valor_pago'                 => $venda->valor_pago,
            'pode_receber_pagamento'     => $venda->pode_receber_pagamento,
            'pode_ser_cancelada'         => $venda->pode_ser_cancelada,
            'observacoes'                => $venda->observacoes,
        ];

        // Documento fiscal resumido
        if ($venda->documentoFiscal) {
            $df = $venda->documentoFiscal;
            $dados['documento_fiscal'] = [
                'id'                  => $df->id,
                'numero_documento'    => $df->numero_documento,
                'tipo_documento'      => $df->tipo_documento,
                'tipo_documento_nome' => $df->tipo_documento_nome,
                'data_emissao'        => $df->data_emissao,
                'hora_emissao'        => $df->hora_emissao,
                'data_vencimento'     => $df->data_vencimento,
                'estado'              => $df->estado,
                'hash_fiscal'         => $df->hash_fiscal,
                // AGT: QR Code para exibição no frontend
                'qr_code'             => $df->qr_code,
                'retencao_total'      => (float) ($df->total_retencao ?? 0),
                'recibos'             => $df->recibos->map(fn ($r) => [
                    'id'                => $r->id,
                    'numero'            => $r->numero_documento,
                    'valor'             => (float) $r->total_liquido,
                    'metodo_pagamento'  => $r->metodo_pagamento,
                    'data_emissao'      => $r->data_emissao,
                ]),
            ];
        }

        // Itens detalhados (apenas no show())
        if ($detalhado) {
            $dados['itens'] = $venda->itens->map(fn ($item) => [
                'id'              => $item->id,
                'produto_id'      => $item->produto_id,
                'produto'         => $item->produto ? [
                    'id'     => $item->produto->id,
                    'nome'   => $item->produto->nome,
                    'codigo' => $item->produto->codigo,
                    'tipo'   => $item->produto->tipo,
                ] : null,
                'descricao'       => $item->descricao,
                'quantidade'      => (int) $item->quantidade,
                'preco_venda'     => (float) $item->preco_venda,
                'desconto'        => (float) ($item->desconto ?? 0),
                'base_tributavel' => (float) $item->base_tributavel,
                'taxa_iva'        => (float) $item->taxa_iva,
                'valor_iva'       => (float) $item->valor_iva,
                'codigo_isencao'  => $item->codigo_isencao,
                'taxa_retencao'   => (float) ($item->taxa_retencao ?? 0),
                'valor_retencao'  => (float) ($item->valor_retencao ?? 0),
                'subtotal'        => (float) $item->subtotal,
                'eh_servico'      => $item->produto?->tipo === 'servico',
            ]);

            $dados['totais_por_tipo'] = [
                'produtos' => [
                    'quantidade' => $venda->itens->filter(fn ($i) => $i->produto?->tipo === 'produto')->count(),
                    'total'      => (float) $venda->itens->filter(fn ($i) => $i->produto?->tipo === 'produto')->sum('subtotal'),
                ],
                'servicos' => [
                    'quantidade' => $servicos->count(),
                    'total'      => (float) $servicos->sum('subtotal'),
                    'retencao'   => (float) $totalRetencaoServicos,
                ],
            ];
        }

        return $dados;
    }
}