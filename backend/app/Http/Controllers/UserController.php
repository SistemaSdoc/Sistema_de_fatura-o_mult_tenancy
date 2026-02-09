<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    public function __construct()
    {
        // Aplica automaticamente as policies do modelo User
        $this->authorizeResource(User::class, 'user');
    }

    /**
     * Retorna o usuário logado (formato simplificado)
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'message' => 'Usuário logado carregado com sucesso',
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ]);
    }

    /**
     * Listar todos os usuários (com filtros opcionais)
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $query = User::query();

        // Filtrar por empresa (se o usuário não for admin, limita à empresa dele)
        if (Auth::user()->role !== 'admin') {
            $query->where('empresa_id', Auth::user()->empresa_id);
        }

        // Filtro por status ativo/inativo
        if ($request->has('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        // Filtro por role
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->orderBy('name')->get();

        return response()->json([
            'message' => 'Lista de usuários carregada com sucesso',
            'users' => $users
        ]);
    }

    /**
     * Mostrar usuário específico
     */
    public function show(User $user)
    {
        return response()->json([
            'message' => 'Usuário carregado com sucesso',
            'user' => $user
        ]);
    }

    /**
     * Criar novo usuário
     */
    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $dados = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,operador,contablista',
            'ativo' => 'nullable|boolean',
            'empresa_id' => 'nullable|uuid|exists:empresas,id',
        ]);

        $dados['password'] = Hash::make($dados['password']);
        $dados['ativo'] = $dados['ativo'] ?? true;

        // Define empresa_id do usuário logado se não fornecido
        if (!isset($dados['empresa_id'])) {
            $dados['empresa_id'] = Auth::user()->empresa_id;
        }

        $user = User::create($dados);

        return response()->json([
            'message' => 'Usuário criado com sucesso',
            'user' => $user
        ]);
    }

    /**
     * Atualizar usuário
     */
    public function update(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $dados = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|required|in:admin,operador,contablista',
            'ativo' => 'nullable|boolean',
            'empresa_id' => 'nullable|uuid|exists:empresas,id',
        ]);

        if (!empty($dados['password'])) {
            $dados['password'] = Hash::make($dados['password']);
        } else {
            unset($dados['password']);
        }

        $user->update($dados);

        return response()->json([
            'message' => 'Usuário atualizado com sucesso',
            'user' => $user
        ]);
    }

    /**
     * Deletar usuário
     */
    public function destroy(User $user)
    {
        $this->authorize('delete', $user);

        $user->delete();

        return response()->json([
            'message' => 'Usuário deletado com sucesso'
        ]);
    }

    /**
     * Atualizar último login (audit)
     */
    public function atualizarUltimoLogin(User $user)
    {
        $this->authorize('update', $user);

        $user->ultimo_login = now();
        $user->save();

        return response()->json([
            'message' => 'Último login atualizado com sucesso',
            'user' => $user
        ]);
    }
}
