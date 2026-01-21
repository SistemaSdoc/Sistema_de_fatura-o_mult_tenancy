<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\VendaService;
use App\Services\FaturaService;
use App\Models\Venda;
use App\Http\Resources\VendaResource;
use App\Http\Resources\FaturaResource;

class VendaController extends Controller
{
    protected VendaService $vendaService;
    protected FaturaService $faturaService;

    public function __construct(
        VendaService $vendaService,
        FaturaService $faturaService
    ) {
        $this->vendaService = $vendaService;
        $this->faturaService = $faturaService;
    }

    /**
     * LISTAR VENDAS
     */
    public function index()
    {
        $this->authorize('viewAny', Venda::class);

        $vendas = Venda::with(['cliente', 'user', 'itens', 'fatura'])
            ->latest()
            ->get();

        return VendaResource::collection($vendas);
    }

    /**
     * MOSTRAR VENDA
     */
    public function show(string $id)
    {
        $venda = Venda::with(['cliente', 'user', 'itens', 'fatura'])
            ->findOrFail($id);

        $this->authorize('view', $venda);

        return new VendaResource($venda);
    }

    /**
     * CRIAR VENDA + FATURA
     */
    public function store(Request $request)
    {
        $this->authorize('create', Venda::class);

        $dados = $request->validate([
            'cliente_id' => 'required|uuid',
            'itens'      => 'required|array|min:1',
            'itens.*.produto_id' => 'required|uuid',
            'itens.*.quantidade' => 'required|integer|min:1',
        ]);

        $user = $request->user(); // 🔐 vem do token

        return DB::transaction(function () use ($dados, $user) {

            // valida cliente
            if (!DB::table('clientes')->find($dados['cliente_id'])) {
                abort(422, 'Cliente não encontrado');
            }

            // valida produtos
            foreach ($dados['itens'] as $item) {
                if (!DB::table('produtos')->find($item['produto_id'])) {
                    abort(422, "Produto {$item['produto_id']} não encontrado");
                }
            }

            $venda = $this->vendaService->criarVenda([
                ...$dados,
                'user_id' => $user->id,
            ]);

            $fatura = $this->faturaService->gerarFatura($venda);

            return response()->json([
                'venda'  => new VendaResource($venda),
                'fatura' => new FaturaResource($fatura),
            ], 201);
        });
    }
}
