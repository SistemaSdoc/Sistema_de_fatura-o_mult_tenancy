<?php

namespace App\Http\Controllers;

use App\Models\Tenant\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Retorna o utilizador autenticado (sem relação empresa)
     */
    public function me(Request $request)
    {
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        return response()->json([
            'message' => 'Utilizador carregado com sucesso',
            'user'    => $user,
        ]);
    }

    /**
     * Lista todos os utilizadores – apenas administradores.
     */
    public function index(Request $request)
    {
        $currentUser = $this->getAuthenticatedUser();

        if (!$currentUser) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        if ($currentUser->role !== 'admin') {
            return response()->json([
                'message' => 'Acesso negado. Apenas administradores podem listar utilizadores.',
                'users'   => [],
            ], 403);
        }

        $query = User::query();

        if ($request->has('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->orderBy('name')->get();

        return response()->json([
            'message' => 'Lista de utilizadores carregada com sucesso',
            'users'   => $users,
        ]);
    }

    /**
     * Mostrar um utilizador específico.
     */
    public function show(User $user)
    {
        $currentUser = $this->getAuthenticatedUser();

        if (!$currentUser) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        if ($currentUser->role !== 'admin' && $currentUser->id !== $user->id) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        return response()->json([
            'message' => 'Utilizador carregado com sucesso',
            'user'    => $user,
        ]);
    }

    /**
     * Criar um novo utilizador – apenas administradores.
     */
    public function store(Request $request)
    {
        $currentUser = $this->getAuthenticatedUser();

        if (!$currentUser) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        if ($currentUser->role !== 'admin') {
            return response()->json(['message' => 'Apenas administradores podem criar utilizadores'], 403);
        }

        $dados = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => ['required', Rule::in(['admin', 'operador', 'contablista'])],
            'ativo'    => 'nullable|boolean',
        ]);

        $dados['ativo'] = $dados['ativo'] ?? true;
        $dados['password'] = Hash::make($dados['password']);

        $user = User::create($dados);

        return response()->json([
            'message' => 'Utilizador criado com sucesso',
            'user'    => $user,
        ], 201);
    }

    /**
     * Atualizar um utilizador – apenas administradores ou o próprio.
     */
    public function update(Request $request, User $user)
    {
        $currentUser = $this->getAuthenticatedUser();

        if (!$currentUser) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        if ($currentUser->role !== 'admin' && $currentUser->id !== $user->id) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        $dados = $request->validate([
            'name'     => 'sometimes|required|string|max:255',
            'email'    => [
                'sometimes',
                'required',
                'email',
                Rule::unique('users')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:6',
            'role'     => ['sometimes', 'required', Rule::in(['admin', 'operador', 'contablista'])],
            'ativo'    => 'nullable|boolean',
        ]);

        if (isset($dados['role']) && $currentUser->role !== 'admin') {
            unset($dados['role']);
        }

        if (!empty($dados['password'])) {
            $dados['password'] = Hash::make($dados['password']);
        } else {
            unset($dados['password']);
        }

        $user->update($dados);

        return response()->json([
            'message' => 'Utilizador atualizado com sucesso',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Eliminar um utilizador – apenas administradores e não pode eliminar a si próprio.
     */
    public function destroy(User $user)
    {
        $currentUser = $this->getAuthenticatedUser();

        if (!$currentUser) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        if ($currentUser->role !== 'admin') {
            return response()->json(['message' => 'Apenas administradores podem eliminar utilizadores'], 403);
        }

        if ($currentUser->id === $user->id) {
            return response()->json(['message' => 'Não pode eliminar a sua própria conta'], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'Utilizador eliminado com sucesso',
        ]);
    }

    /**
     * Atualizar o campo `ultimo_login`.
     */
    public function atualizarUltimoLogin(User $user)
    {
        $currentUser = $this->getAuthenticatedUser();

        if (!$currentUser) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        if ($currentUser->role !== 'admin' && $currentUser->id !== $user->id) {
            return response()->json(['message' => 'Acesso negado'], 403);
        }

        $user->ultimo_login = now();
        $user->save();

        return response()->json([
            'message' => 'Último login atualizado com sucesso',
            'user'    => $user,
        ]);
    }

    /**
     * Método auxiliar para obter o utilizador autenticado (guard tenant ou padrão)
     */
    private function getAuthenticatedUser()
    {
        $user = auth()->guard('tenant')->user();
        if (!$user) {
            $user = auth()->user();
        }
        return $user;
    }
}