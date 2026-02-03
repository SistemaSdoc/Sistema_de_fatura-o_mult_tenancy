<?php

namespace App\Http\Controllers;

use App\Models\Fornecedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FornecedorController extends Controller
{
    public function __construct()
    {
        // Aplica automaticamente as policies do modelo Fornecedor
        $this->authorizeResource(Fornecedor::class, 'fornecedor');
    }

    /**
     * Listar todos os fornecedores
     */
    public function index()
    {
        $this->authorize('viewAny', Fornecedor::class);

        $fornecedores = Fornecedor::all();

        return response()->json([
            'message' => 'Lista de fornecedores carregada com sucesso',
            'fornecedores' => $fornecedores
        ]);
    }

    /**
     * Mostrar fornecedor específico
     */
    public function show(Fornecedor $fornecedor)
    {
        return response()->json([
            'message' => 'Fornecedor carregado com sucesso',
            'fornecedor' => $fornecedor
        ]);
    }

    /**
     * Criar novo fornecedor
     */
    public function store(Request $request)
    {
        $this->authorize('create', Fornecedor::class);

        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'nif' => 'required|string|max:50|unique:fornecedores,nif',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:fornecedores,email',
            'endereco' => 'nullable|string',
            'tipo' => 'nullable|in:Nacional,Internacional',
            'status' => 'nullable|in:ativo,inativo',
        ]);

        // Relacionar fornecedor ao usuário autenticado
        $dados['user_id'] = Auth::id();

        // Valores padrão
        $dados['tipo'] = $dados['tipo'] ?? 'Nacional';
        $dados['status'] = $dados['status'] ?? 'ativo';

        $fornecedor = Fornecedor::create($dados);

        return response()->json([
            'message' => 'Fornecedor criado com sucesso',
            'fornecedor' => $fornecedor
        ]);
    }

    /**
     * Atualizar fornecedor
     */
    public function update(Request $request, Fornecedor $fornecedor)
    {
        $this->authorize('update', $fornecedor);

        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'nif' => 'sometimes|required|string|max:50|unique:fornecedores,nif,' . $fornecedor->id,
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:fornecedores,email,' . $fornecedor->id,
            'endereco' => 'nullable|string',
            'tipo' => 'nullable|in:Nacional,Internacional',
            'status' => 'nullable|in:ativo,inativo',
        ]);

        $fornecedor->update($dados);

        return response()->json([
            'message' => 'Fornecedor atualizado com sucesso',
            'fornecedor' => $fornecedor
        ]);
    }

    /**
     * Deletar fornecedor
     */
    public function destroy(Fornecedor $fornecedor)
    {
        $this->authorize('delete', $fornecedor);

        $fornecedor->delete();

        return response()->json([
            'message' => 'Fornecedor deletado com sucesso'
        ]);
    }
}
