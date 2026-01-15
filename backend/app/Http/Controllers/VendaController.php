<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Services\VendaService;
use App\Services\FaturaService;
use App\Models\Venda;
use App\Http\Resources\VendaResource;
use App\Http\Resources\FaturaResource;

class VendaController extends Controller
{
    protected $vendaService;
    protected $faturaService;

    public function __construct(VendaService $vendaService, FaturaService $faturaService)
    {
        $this->vendaService = $vendaService;
        $this->faturaService = $faturaService;
    }

    /**
     * LISTAR TODAS AS VENDAS
     */
    public function index()
    {
        $vendas = Venda::with(['cliente', 'user', 'itens'])->latest()->get();
        return VendaResource::collection($vendas);
    }

    /**
     * MOSTRAR UMA VENDA ESPECÍFICA
     */
    public function show(string $id)
    {
        $venda = Venda::with(['cliente', 'user', 'itens', 'fatura'])->findOrFail($id);
        return new VendaResource($venda);
    }

    /**
     * CRIAR VENDA + GERAR FATURA
     */
  public function store(Request $request)
{
    $request->validate([
        'cliente_id' => 'required|uuid',
        'user_id' => 'required|uuid',
        'itens' => 'required|array|min:1',
        'itens.*.produto_id' => 'required|uuid',
        'itens.*.quantidade' => 'required|integer|min:1',
    ]);

    // Validar manualmente no banco tenant
    $tenantConnection = 'tenant';

    $cliente = DB::connection($tenantConnection)->table('clientes')->find($request->cliente_id);
    if (!$cliente) {
        return response()->json(['message' => 'Cliente não encontrado'], 422);
    }

    $user = DB::connection($tenantConnection)->table('users')->find($request->user_id);
    if (!$user) {
        return response()->json(['message' => 'Usuário não encontrado'], 422);
    }

    foreach ($request->itens as $item) {
        $produto = DB::connection($tenantConnection)->table('produtos')->find($item['produto_id']);
        if (!$produto) {
            return response()->json(['message' => "Produto {$item['produto_id']} não encontrado"], 422);
        }
    }

    // Depois chama o Service
    $venda = $this->vendaService->criarVenda($request->all());
    $fatura = $this->faturaService->gerarFatura($venda);

    return response()->json([
        'venda' => $venda,
        'fatura' => $fatura,
    ]);
}

}
