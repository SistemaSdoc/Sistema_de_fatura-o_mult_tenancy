<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use Illuminate\Http\Request;
use App\Services\CompraService;

class CompraController extends Controller
{
    protected $compraService;

    public function __construct(CompraService $compraService)
    {
        $this->compraService = $compraService;

        // Aplica automaticamente as policies do modelo Compra
        $this->authorizeResource(Compra::class, 'compra');
    }

    /**
     * Listar todas as compras
     */
    public function index()
    {
        $this->authorize('viewAny', Compra::class);

        $compras = $this->compraService->listarCompras();

        return response()->json([
            'message' => 'Lista de compras carregada com sucesso',
            'compras' => $compras
        ]);
    }

    /**
     * Mostrar uma compra específica
     */
    public function show(Compra $compra)
    {
        $this->authorize('view', $compra);

        $compraDetalhe = $this->compraService->buscarCompra($compra->id);

        return response()->json([
            'message' => 'Compra carregada com sucesso',
            'compra' => $compraDetalhe
        ]);
    }

    /**
     * Criar nova compra
     */
    public function store(Request $request)
    {
        $this->authorize('create', Compra::class);

        $dados = $request->validate([
            'fornecedor_id' => 'required|uuid|exists:fornecedores,id',
            'data' => 'required|date',
            'tipo_documento' => 'nullable|string|max:50',
            'numero_documento' => 'nullable|string|max:50',
            'data_emissao' => 'nullable|date',
            'validado_fiscalmente' => 'nullable|boolean',
            'itens' => 'required|array|min:1',
            'itens.*.produto_id' => 'required|uuid|exists:produtos,id',
            'itens.*.quantidade' => 'required|integer|min:1',
            'itens.*.preco_compra' => 'required|numeric|min:0',
        ]);

        $compra = $this->compraService->criarCompra($dados);

        return response()->json([
            'message' => 'Compra criada com sucesso',
            'compra' => $compra
        ]);
    }
}
