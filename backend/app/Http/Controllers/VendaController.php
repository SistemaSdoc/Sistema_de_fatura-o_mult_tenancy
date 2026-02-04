<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Venda;
use App\Models\Cliente;
use App\Models\Produto;
use App\Models\Pagamento;
use App\Services\VendaService;

class VendaController extends Controller
{
    protected $vendaService;

    public function __construct(VendaService $vendaService)
    {
        $this->vendaService = $vendaService;
        $this->authorizeResource(Venda::class, 'venda');
    }



public function create() {
    
    
    $clientes = Cliente::all();
    $produtos = Produto::all();
    return response()->json([
        'clientes' => $clientes,
        'produtos' => $produtos
    ]);
}


    /**
     * Listar todas as vendas
     */
    public function index()
    {
        $this->authorize('viewAny', Venda::class);

        $vendas = $this->vendaService->relatorioVendas();

        return response()->json([
            'message' => 'Lista de vendas carregada',
            'data' => $vendas->map(function ($venda) {
                return [
                    'id' => $venda->id,
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

        return response()->json([
            'message' => 'Venda carregada',
            'venda' => [
                'id' => $venda->id,
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
     * Criar nova venda
     */
    public function store(Request $request)
    {
        $this->authorize('create', Venda::class);

        $dados = $request->validate([
            'cliente_id' => 'nullable|uuid|exists:clientes,id',
            'itens' => 'required|array|min:1',
            'itens.*.produto_id' => 'required|uuid|exists:produtos,id', // agora passamos apenas o ID
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
