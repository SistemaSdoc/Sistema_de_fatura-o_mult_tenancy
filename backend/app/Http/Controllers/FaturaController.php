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
    }

    // Listar todas as faturas
    public function index()
    {
        $faturas = Fatura::all();
        return response()->json($faturas);
    }

    // Gerar fatura para uma venda
    public function gerarFatura(Request $request)
    {
        $dados = $request->validate([
            'venda_id' => 'required|uuid',
        ]);

        // Verifica se a venda existe
        $fatura = $this->faturaService->gerarFatura($dados['venda_id']);

        if (!$fatura) {
            return response()->json([
                'message' => 'Venda não encontrada ou fatura não pôde ser gerada.'
            ], 404);
        }

        return response()->json($fatura, 201);
    }

    // Mostrar fatura específica
    public function show($id)
    {
        $fatura = Fatura::find($id);

        if (!$fatura) {
            return response()->json(['message' => 'Fatura não encontrada'], 404);
        }

        return response()->json($fatura);
    }

    // Excluir fatura
    public function destroy($id)
    {
        $fatura = Fatura::find($id);

        if (!$fatura) {
            return response()->json(['message' => 'Fatura não encontrada'], 404);
        }

        $fatura->delete();
        return response()->json(null, 204);
    }
}
