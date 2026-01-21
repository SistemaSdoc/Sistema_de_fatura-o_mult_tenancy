<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Str;
use App\Http\Resources\UserResource;

class UserController extends Controller
{
    /**
     * LISTAR USUÁRIOS
     */
    public function index()
    {
        $this->authorize('viewAny', User::class);

        $users = User::latest()->get();
        return UserResource::collection($users);
    }

    /**
     * CRIAR USUÁRIO
     */
    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $dados = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email', // removido tenant
            'password' => 'required|string|min:6',
            'role'     => 'required|in:admin,operador,caixa',
        ]);

        $user = User::create([
            'id'       => (string) Str::uuid(),
            'name'     => $dados['name'],
            'email'    => $dados['email'],
            'password' => $dados['password'], // mutator do modelo criptografa
            'role'     => $dados['role'],
        ]);

        return response()->json([
            'message' => 'Usuário criado com sucesso',
            'user'    => new UserResource($user),
        ], 201);
    }

    /**
     * ATUALIZAR USUÁRIO
     */
    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('update', $user);

        $dados = $request->validate([
            'name'     => 'sometimes|required|string|max:255',
            'email'    => "sometimes|required|email|unique:users,email,{$user->id}", // removido tenant
            'password' => 'sometimes|nullable|string|min:6',
            'role'     => 'sometimes|required|in:admin,operador,caixa',
        ]);

        if (isset($dados['password']) && empty($dados['password'])) {
            unset($dados['password']);
        }

        $user->update($dados);

        return response()->json([
            'message' => 'Usuário atualizado com sucesso',
            'user'    => new UserResource($user),
        ]);
    }

    /**
     * DELETAR USUÁRIO
     */
    public function destroy(string $id, Request $request)
    {
        $user = User::findOrFail($id);
        $this->authorize('delete', $user);

        // Impedir auto-delete
        if ($request->user()->id === $user->id) {
            return response()->json([
                'message' => 'Não pode apagar o próprio usuário'
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'Usuário deletado com sucesso',
        ]);
    }
}
