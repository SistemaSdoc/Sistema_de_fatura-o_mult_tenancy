<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Fatura;
use App\Services\FaturaService;

class FaturaController extends Controller
{
    protected $faturaService;

    public function __construct(FaturaService $faturaService)
    {
        $this->faturaService = $faturaService;
        $this->authorizeResource(Fatura::class, 'fatura');
    }

    /**
     * Listar todas as faturas
     */
    public function index()
    {
        $this->authorize('viewAny', Fatura::class);

        $faturas = $this->faturaService->listarFaturas();

        return response()->json([
            'message' => 'Lista de faturas carregada com sucesso',
            'faturas' => $faturas
        ]);
    }

    /**
     * Mostrar fatura específica
     */
    public function show(Fatura $fatura)
    {
        $this->authorize('view', $fatura);

        $fatura = $this->faturaService->buscarFatura($fatura->id);

        return response()->json([
            'message' => 'Fatura carregada com sucesso',
            'fatura' => $fatura
        ]);
    }

    /**
     * Gerar fatura a partir de uma venda
     */
    public function gerar(Request $request)
    {
        $this->authorize('create', Fatura::class);

        $dados = $request->validate([
            'venda_id' => 'required|uuid|exists:vendas,id',
            'tipo_documento' => 'nullable|in:FT,FR,NC,ND'
        ]);

        $fatura = $this->faturaService->gerarFatura(
            $dados['venda_id'],
            $dados['tipo_documento'] ?? 'FT'
        );

        return response()->json([
            'message' => 'Fatura gerada com sucesso',
            'fatura' => $fatura
        ]);
    }

    /**
     * Anular fatura
     */
    public function anular(Fatura $fatura, Request $request)
    {
        $this->authorize('delete', $fatura);

        $motivo = $request->validate([
            'motivo' => 'required|string|max:255'
        ])['motivo'];

        $fatura->update([
            'estado' => 'anulado',
            'motivo_anulacao' => $motivo
        ]);

        return response()->json([
            'message' => 'Fatura anulada com sucesso',
            'fatura' => $fatura
        ]);
    }
}
