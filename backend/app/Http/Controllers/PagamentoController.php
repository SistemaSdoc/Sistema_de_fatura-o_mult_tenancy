<?php

namespace App\Http\Controllers;

use App\Models\Pagamento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PagamentoController extends Controller
{
    public function __construct()
    {
        // Aplica automaticamente as policies do modelo Pagamento
        $this->authorizeResource(Pagamento::class, 'pagamento');
    }

    /**
     * Listar todos os pagamentos
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Pagamento::class);

        $query = Pagamento::with('user', 'fatura')->orderBy('data_pagamento', 'desc');

        // Filtros opcionais
        if ($request->has('fatura_id')) {
            $query->where('fatura_id', $request->fatura_id);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('metodo')) {
            $query->where('metodo', $request->metodo);
        }

        $pagamentos = $query->get();

        return response()->json([
            'message' => 'Lista de pagamentos carregada com sucesso',
            'pagamentos' => $pagamentos
        ]);
    }

    /**
     * Mostrar pagamento específico
     */
    public function show(Pagamento $pagamento)
    {
        $this->authorize('view', $pagamento);

        return response()->json([
            'message' => 'Pagamento carregado com sucesso',
            'pagamento' => $pagamento->load('user', 'fatura')
        ]);
    }

    /**
     * Criar novo pagamento
     */
    public function store(Request $request)
    {
        $this->authorize('create', Pagamento::class);

        $dados = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'fatura_id' => 'required|uuid|exists:faturas,id',
            'metodo' => 'required|in:dinheiro,cartao,transferencia',
            'valor_pago' => 'required|numeric|min:0',
            'troco' => 'nullable|numeric|min:0',
            'referencia' => 'nullable|string|max:255',
            'data_pagamento' => 'required|date',
            'hora_pagamento' => 'required|date_format:H:i:s',
        ]);

        $dados['troco'] = $dados['troco'] ?? 0;

        $pagamento = Pagamento::create($dados);

        return response()->json([
            'message' => 'Pagamento registrado com sucesso',
            'pagamento' => $pagamento->load('user', 'fatura')
        ]);
    }

    /**
     * Atualizar pagamento
     */
    public function update(Request $request, Pagamento $pagamento)
    {
        $this->authorize('update', $pagamento);

        $dados = $request->validate([
            'user_id' => 'sometimes|required|uuid|exists:users,id',
            'fatura_id' => 'sometimes|required|uuid|exists:faturas,id',
            'metodo' => 'sometimes|required|in:dinheiro,cartao,transferencia',
            'valor_pago' => 'sometimes|required|numeric|min:0',
            'troco' => 'nullable|numeric|min:0',
            'referencia' => 'nullable|string|max:255',
            'data_pagamento' => 'sometimes|required|date',
            'hora_pagamento' => 'sometimes|required|date_format:H:i:s',
        ]);

        if (!isset($dados['troco'])) {
            $dados['troco'] = $pagamento->troco ?? 0;
        }

        $pagamento->update($dados);

        return response()->json([
            'message' => 'Pagamento atualizado com sucesso',
            'pagamento' => $pagamento->load('user', 'fatura')
        ]);
    }

    /**
     * Deletar pagamento
     */
    public function destroy(Pagamento $pagamento)
    {
        $this->authorize('delete', $pagamento);

        $pagamento->delete();

        return response()->json([
            'message' => 'Pagamento deletado com sucesso'
        ]);
    }
}
