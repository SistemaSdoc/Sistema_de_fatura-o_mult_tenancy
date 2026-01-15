<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Fornecedor;

class FornecedorController extends Controller
{
    public function index()
    {
        return response()->json(Fornecedor::all());
    }

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

    public function show($id)
    {
        $fornecedor = Fornecedor::findOrFail($id);
        return response()->json($fornecedor);
    }

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

    public function destroy($id)
    {
        $fornecedor = Fornecedor::findOrFail($id);
        $fornecedor->delete();
        return response()->json(null, 204);
    }
}
