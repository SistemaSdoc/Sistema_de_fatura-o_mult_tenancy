<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
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
     * Listar todos os usuários (com filtros opcionais) - REQUER AUTH
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
     * Mostrar usuário específico - REQUER AUTH
     */
    public function show(User $user)
    {
        $this->authorize('view', $user);

        return response()->json([
            'message' => 'Usuário carregado com sucesso',
            'user' => $user
        ]);
    }

    /**
     * Criar novo usuário - PÚBLICO (não requer autenticação)
     */
    public function store(Request $request)
    {
        // NÃO verifica autorização - qualquer um pode criar conta
        // $this->authorize('create', User::class);

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

        // Se usuário estiver logado, usa empresa dele, senão fica null
        if (!isset($dados['empresa_id'])) {
            $dados['empresa_id'] = Auth::check() ? Auth::user()->empresa_id : null;
        }

        $user = User::create($dados);

        return response()->json([
            'message' => 'Usuário criado com sucesso',
            'user' => $user
        ], 201);
    }

    /**
     * Atualizar usuário - REQUER AUTH
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
     * Deletar usuário - REQUER AUTH
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
     * Atualizar último login (audit) - REQUER AUTH
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
