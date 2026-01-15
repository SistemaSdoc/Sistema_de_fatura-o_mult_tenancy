<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TenantUser;
use Illuminate\Support\Str;
use App\Http\Resources\TenantUserResource;

class TenantUserController extends Controller
{
    /**
     * LISTAR USUÁRIOS DO TENANT
     */
    public function index()
    {
        $this->authorize('viewAny', TenantUser::class);

        $users = TenantUser::latest()->get();
        return TenantUserResource::collection($users);
    }

    /**
     * CRIAR USUÁRIO
     */
    public function store(Request $request)
    {
        $this->authorize('create', TenantUser::class);

        $dados = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:tenant.users,email',
            'password' => 'required|string|min:6',
            'role'  => 'required|in:admin,operador,caixa',
        ]);

        $user = TenantUser::create([
            'id'       => (string) Str::uuid(),
            'name'     => $dados['name'],
            'email'    => $dados['email'],
            'password' => $dados['password'], // mutator criptografa
            'role'     => $dados['role'],
        ]);

        return response()->json([
            'message' => 'Usuário criado com sucesso',
            'user'    => new TenantUserResource($user),
        ], 201);
    }

    /**
     * ATUALIZAR USUÁRIO
     */
    public function update(Request $request, string $id)
    {
        $user = TenantUser::findOrFail($id);
        $this->authorize('update', $user);

        $dados = $request->validate([
            'name'  => 'sometimes|required|string|max:255',
            'email' => "sometimes|required|email|unique:tenant.users,email,{$user->id}",
            'password' => 'sometimes|nullable|string|min:6',
            'role'  => 'sometimes|required|in:admin,operador,caixa',
        ]);

        if (isset($dados['password']) && empty($dados['password'])) {
            unset($dados['password']);
        }

        $user->update($dados);

        return response()->json([
            'message' => 'Usuário atualizado com sucesso',
            'user'    => new TenantUserResource($user),
        ]);
    }

    /**
     * DELETAR USUÁRIO
     */
    public function destroy(string $id, Request $request)
    {
        $user = TenantUser::findOrFail($id);
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
