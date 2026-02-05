<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;

class ClienteController extends Controller
{
    public function __construct()
    {
        // Aplica automaticamente as policies do modelo Cliente
        $this->authorizeResource(Cliente::class, 'cliente');
    }

    /**
     * Listar todos os clientes
     */
    public function index()
    {
        $this->authorize('viewAny', Cliente::class);

        $clientes = Cliente::all();

        return response()->json([
            'message' => 'Lista de clientes carregada com sucesso',
            'clientes' => $clientes
        ]);
    }

    /**
     * Mostrar cliente específico
     */
    public function show(Cliente $cliente)
    {
        $this->authorize('view', $cliente);

        return response()->json([
            'message' => 'Cliente carregado com sucesso',
            'cliente' => $cliente
        ]);
    }

    /**
     * Criar novo cliente
     */
    public function store(Request $request)
    {
        $this->authorize('create', Cliente::class);

        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'nif' => 'nullable|string|max:50|unique:clientes,nif',
            'tipo' => 'nullable|in:consumidor_final,empresa',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:clientes,email',
            'endereco' => 'nullable|string',
            'data_registro' => 'nullable|date',
        ]);

        // Valor padrão para data de registro
        $dados['data_registro'] = $dados['data_registro'] ?? now();

        $cliente = Cliente::create($dados);

        return response()->json([
            'message' => 'Cliente criado com sucesso',
            'cliente' => $cliente
        ]);
    }

    /**
     * Atualizar cliente
     */
    public function update(Request $request, Cliente $cliente)
    {
        $this->authorize('update', $cliente);

        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'nif' => 'sometimes|nullable|string|max:50|unique:clientes,nif,' . $cliente->id,
            'tipo' => 'nullable|in:consumidor_final,empresa',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:clientes,email,' . $cliente->id,
            'endereco' => 'nullable|string',
            'data_registro' => 'nullable|date',
        ]);

        $cliente->update($dados);

        return response()->json([
            'message' => 'Cliente atualizado com sucesso',
            'cliente' => $cliente
        ]);
    }

    /**
     * Deletar cliente
     */
    public function destroy(Cliente $cliente)
    {
        $this->authorize('delete', $cliente);

        $cliente->delete();

        return response()->json([
            'message' => 'Cliente deletado com sucesso'
        ]);
    }
}
