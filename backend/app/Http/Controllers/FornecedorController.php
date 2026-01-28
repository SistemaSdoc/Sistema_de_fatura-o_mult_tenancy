<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Fornecedor;

class FornecedorController extends Controller
{
    // LISTAR FORNECEDORES
public function index()
{
    $fornecedores = Fornecedor::paginate(10);

    return response()->json([
        'data' => $fornecedores->items(),
        'meta' => [
            'current_page' => $fornecedores->currentPage(),
            'last_page' => $fornecedores->lastPage(),
            'per_page' => $fornecedores->perPage(),
            'total' => $fornecedores->total(),
        ]
    ]);
}


    // CRIAR FORNECEDOR
    public function store(Request $request)
    {
        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'nif' => 'nullable|string',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'endereco' => 'nullable|string|max:255',
        ]);

        // Validação manual de unicidade
        if ($dados['nif'] && Fornecedor::where('nif', $dados['nif'])->exists()) {
            return response()->json(['message' => 'NIF já existe'], 422);
        }

        if ($dados['email'] && Fornecedor::where('email', $dados['email'])->exists()) {
            return response()->json(['message' => 'Email já existe'], 422);
        }

        $fornecedor = Fornecedor::create($dados);
        return response()->json($fornecedor, 201);
    }

    // MOSTRAR FORNECEDOR
    public function show($id)
    {
        $fornecedor = Fornecedor::findOrFail($id);
        return response()->json($fornecedor);
    }

    // ATUALIZAR FORNECEDOR
    public function update(Request $request, $id)
    {
        $fornecedor = Fornecedor::findOrFail($id);

        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'nif' => 'nullable|string',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'endereco' => 'nullable|string|max:255',
        ]);

        // Validação manual de unicidade
        if (isset($dados['nif']) && $dados['nif'] !== $fornecedor->nif &&
            Fornecedor::where('nif', $dados['nif'])->exists()
        ) {
            return response()->json(['message' => 'NIF já existe'], 422);
        }

        if (isset($dados['email']) && $dados['email'] !== $fornecedor->email &&
            Fornecedor::where('email', $dados['email'])->exists()
        ) {
            return response()->json(['message' => 'Email já existe'], 422);
        }

        $fornecedor->update($dados);
        return response()->json($fornecedor);
    }

    // DELETAR FORNECEDOR
    public function destroy($id)
    {
        $fornecedor = Fornecedor::findOrFail($id);
        $fornecedor->delete();
        return response()->json(null, 204);
    }
}
