<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Venda;
use App\Models\Cliente;
use App\Models\Produto;
use App\Services\VendaService;

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
        $clientes = Cliente::all();
        $produtos = Produto::all();

        return response()->json([
            'clientes' => $clientes,
            'produtos' => $produtos
        ]);
    }

    /**
     * Listar TODAS as vendas (abertas, faturadas e canceladas)
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Venda::class);

        // Carrega vendas com todos os relacionamentos necessários
        $query = Venda::with([
            'cliente',
            'user',
            'itens.produto',
            'fatura'  // <-- Importante: carrega a fatura associada
        ]);

        // Filtro opcional por status (se quiser filtrar no frontend)
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filtro opcional para mostrar apenas faturadas
        if ($request->has('faturadas') && $request->input('faturadas') === 'true') {
            $query->where('status', 'faturada');
        }

        $vendas = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'message' => 'Lista de vendas carregada',
            'vendas' => $vendas->map(function ($venda) {
                return [
                    'id' => $venda->id,

                    // Dados da fatura (se existir)
                    'numero' => $venda->fatura?->numero ?? $venda->numero ?? 'N/A',
                    'serie' => $venda->fatura?->serie ?? $venda->serie ?? 'A',
                    'tipo_documento' => $venda->fatura?->tipo_documento ?? 'venda',

                    // Cliente
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

                    // Usuário
                    'user' => $venda->user ? [
                        'id' => $venda->user->id,
                        'name' => $venda->user->name,
                        'email' => $venda->user->email,
                    ] : null,

                    // Datas
                    'data_venda' => $venda->data_venda,
                    'hora_venda' => $venda->hora_venda,
                    'created_at' => $venda->created_at,

                    // Valores
                    'total' => $venda->total,
                    'base_tributavel' => $venda->base_tributavel,
                    'total_iva' => $venda->total_iva,
                    'total_retencao' => $venda->total_retencao,

                    // Status
                    'status' => $venda->status,
                    'faturado' => !is_null($venda->fatura),

                    // Dados da fatura completa (se existir)
                    'fatura' => $venda->fatura ? [
                        'id' => $venda->fatura->id,
                        'numero' => $venda->fatura->numero,
                        'serie' => $venda->fatura->serie,
                        'tipo_documento' => $venda->fatura->tipo_documento,
                        'data_emissao' => $venda->fatura->data_emissao,
                        'hora_emissao' => $venda->fatura->hora_emissao,
                        'data_vencimento' => $venda->fatura->data_vencimento,
                        'estado' => $venda->fatura->estado,
                        'hash_fiscal' => $venda->fatura->hash_fiscal,
                        'motivo_anulacao' => $venda->fatura->motivo_anulacao,
                    ] : null,

                    // Itens
                    'itens' => $venda->itens->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'produto_id' => $item->produto_id,
                            'produto' => $item->produto ? [
                                'id' => $item->produto->id,
                                'nome' => $item->produto->nome,
                                'codigo' => $item->produto->codigo,
                            ] : null,
                            'descricao' => $item->descricao,
                            'quantidade' => $item->quantidade,
                            'preco_venda' => $item->preco_venda,
                            'desconto' => $item->desconto,
                            'base_tributavel' => $item->base_tributavel,
                            'valor_iva' => $item->valor_iva,
                            'valor_retencao' => $item->valor_retencao,
                            'subtotal' => $item->subtotal,
                        ];
                    }),
                ];
            }),
        ]);
    }

    /**
     * Mostrar venda específica
     */
    public function show(Venda $venda)
    {
        $this->authorize('view', $venda);

        $venda->load(['cliente', 'user', 'itens.produto', 'fatura']);

        return response()->json([
            'message' => 'Venda carregada',
            'venda' => [
                'id' => $venda->id,

                // Dados da fatura
                'numero' => $venda->fatura?->numero ?? $venda->numero ?? 'N/A',
                'serie' => $venda->fatura?->serie ?? $venda->serie ?? 'A',
                'tipo_documento' => $venda->fatura?->tipo_documento ?? 'venda',

                // Cliente
                'cliente' => $venda->cliente ? [
                    'id' => $venda->cliente->id,
                    'nome' => $venda->cliente->nome,
                    'nif' => $venda->cliente->nif,
                    'tipo' => $venda->cliente->tipo,
                    'telefone' => $venda->cliente->telefone,
                    'email' => $venda->cliente->email,
                    'endereco' => $venda->cliente->endereco,
                ] : null,

                // Usuário
                'user' => $venda->user ? [
                    'id' => $venda->user->id,
                    'name' => $venda->user->name,
                    'email' => $venda->user->email,
                ] : null,

                // Datas
                'data_venda' => $venda->data_venda,
                'hora_venda' => $venda->hora_venda,

                // Valores
                'total' => $venda->total,
                'base_tributavel' => $venda->base_tributavel,
                'total_iva' => $venda->total_iva,
                'total_retencao' => $venda->total_retencao,

                // Status
                'status' => $venda->status,
                'faturado' => !is_null($venda->fatura),

                // Fatura completa
                'fatura' => $venda->fatura ? [
                    'id' => $venda->fatura->id,
                    'numero' => $venda->fatura->numero,
                    'serie' => $venda->fatura->serie,
                    'tipo_documento' => $venda->fatura->tipo_documento,
                    'data_emissao' => $venda->fatura->data_emissao,
                    'hora_emissao' => $venda->fatura->hora_emissao,
                    'estado' => $venda->fatura->estado,
                    'hash_fiscal' => $venda->fatura->hash_fiscal,
                ] : null,

                // Itens
                'itens' => $venda->itens->map(function ($item) {
                    return [
                        'produto' => $item->produto,
                        'quantidade' => $item->quantidade,
                        'preco_venda' => $item->preco_venda,
                        'desconto' => $item->desconto,
                        'subtotal' => $item->subtotal,
                        'base_tributavel' => $item->base_tributavel,
                        'valor_iva' => $item->valor_iva,
                        'valor_retencao' => $item->valor_retencao,
                    ];
                }),
            ],
        ]);
    }

    /**
     * Criar nova venda
     */
    public function store(Request $request)
    {
        $this->authorize('create', Venda::class);

        $dados = $request->validate([
            'cliente_id' => 'nullable|uuid|exists:clientes,id',
            'cliente_nome' => 'required_without:cliente_id|string|max:255',
            'itens' => 'required|array|min:1',
            'itens.*.produto_id' => 'required|uuid|exists:produtos,id',
            'itens.*.quantidade' => 'required|integer|min:1',
            'itens.*.preco_venda' => 'required|numeric|min:0',
            'itens.*.desconto' => 'nullable|numeric|min:0',
            'faturar' => 'nullable|boolean',
        ]);

        $venda = $this->vendaService->criarVenda($dados, $dados['faturar'] ?? false);

        return response()->json([
            'message' => 'Venda criada com sucesso',
            'venda' => [
                'id' => $venda->id,
                'numero' => $venda->numero,
                'serie' => $venda->serie,
                'cliente' => $venda->cliente,
                'user' => $venda->user,
                'data_venda' => $venda->data_venda,
                'hora_venda' => $venda->hora_venda,
                'total' => $venda->total,
                'base_tributavel' => $venda->base_tributavel,
                'total_iva' => $venda->total_iva,
                'total_retencao' => $venda->total_retencao,
                'status' => $venda->status,
                'itens' => $venda->itens->map(function ($item) {
                    return [
                        'produto' => $item->produto,
                        'quantidade' => $item->quantidade,
                        'preco_venda' => $item->preco_venda,
                        'desconto' => $item->desconto,
                        'subtotal' => $item->subtotal,
                        'base_tributavel' => $item->base_tributavel,
                        'valor_iva' => $item->valor_iva,
                        'valor_retencao' => $item->valor_retencao,
                    ];
                }),
            ],
        ]);
    }

    /**
     * Cancelar venda
     */
    public function cancelar(Venda $venda)
    {
        $this->authorize('cancel', $venda);

        $vendaCancelada = $this->vendaService->cancelarVenda($venda->id);

        return response()->json([
            'message' => 'Venda cancelada com sucesso',
            'venda' => [
                'id' => $vendaCancelada->id,
                'status' => $vendaCancelada->status,
            ],
        ]);
    }
}
