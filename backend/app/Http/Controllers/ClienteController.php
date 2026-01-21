<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Cliente;

class ClienteController extends Controller
{
    // LISTAR CLIENTES
    public function index()
    {
        return response()->json(Cliente::all());
    }

    // CRIAR CLIENTE
    public function store(Request $request)
    {
        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'nif' => 'nullable|string|unique:clientes',
            'tipo' => 'required|in:consumidor_final,empresa',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|unique:clientes',
            'endereco' => 'nullable|string|max:255',
        ]);

        $cliente = Cliente::create($dados);
        return response()->json($cliente, 201);
    }

    // MOSTRAR CLIENTE
    public function show($id)
    {
        $cliente = Cliente::findOrFail($id);
        return response()->json($cliente);
    }

    // ATUALIZAR CLIENTE
    public function update(Request $request, $id)
    {
        $cliente = Cliente::findOrFail($id);

        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'nif' => 'nullable|string|unique:clientes,nif,' . $cliente->id,
            'tipo' => 'sometimes|required|in:consumidor_final,empresa',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|unique:clientes,email,' . $cliente->id,
            'endereco' => 'nullable|string|max:255',
        ]);

        $cliente->update($dados);
        return response()->json($cliente);
    }

    // DELETAR CLIENTE
    public function destroy($id)
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->delete();
        return response()->json(null, 204);
    }
}
