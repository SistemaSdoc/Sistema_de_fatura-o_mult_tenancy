<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Fatura;
use App\Services\FaturaService;

class FaturaController extends Controller
{
    protected $faturaService;

    public function __construct(FaturaService $faturaService)
    {
        $this->faturaService = $faturaService;

        // Aplica a policy de Fatura em todas as ações do CRUD
        $this->authorizeResource(Fatura::class, 'fatura');
    }

    // LISTAR TODAS AS FATURAS
    public function index()
    {
        $faturas = Fatura::all();
        return response()->json($faturas);
    }

    // GERAR FATURA PARA UMA VENDA
    public function gerarFatura(Request $request)
    {
        $dados = $request->validate([
            'venda_id' => 'required|uuid',
        ]);

        $fatura = $this->faturaService->gerarFatura($dados['venda_id']);

        if (!$fatura) {
            return response()->json([
                'message' => 'Venda não encontrada ou fatura não pôde ser gerada.'
            ], 404);
        }

        return response()->json($fatura, 201);
    }

    // MOSTRAR FATURA
    public function show(Fatura $fatura)
    {
        return response()->json($fatura);
    }

    // EXCLUIR FATURA
    public function destroy(Fatura $fatura)
    {
        $fatura->delete();
        return response()->json(null, 204);
    }
}