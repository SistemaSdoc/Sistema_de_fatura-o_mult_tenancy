<?php

namespace App\Http\Controllers;

use App\Models\Tenant\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    /**
     * Retorna o utilizador autenticado com todos os campos necessários para o frontend
     */
    public function me(Request $request)
    {
        $user = $request->user()->load('empresa');

        return response()->json([
            'message' => 'Utilizador carregado com sucesso',
            'user'    => $user,
        ]);
    }

    /**
     * Listar todos os utilizadores — REQUER AUTH
     */
    public function index(Request $request)
    {
        Log::info('User na política viewAny', [
        'class' => get_class($user),
        'role' => $user->role ?? 'null',
        'email' => $user->email ?? 'null'
    ]);

        $query = User::with('empresa');

        // Não-admins só vêem utilizadores da mesma empresa
        if (Auth::user()->role !== 'admin') {
            $query->where('empresa_id', Auth::user()->empresa_id);
        }

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
     * Mostrar utilizador específico — REQUER AUTH
     */
    public function show(User $user)
    {
      

        return response()->json([
            'message' => 'Utilizador carregado com sucesso',
            'user'    => $user->load('empresa'),
        ]);
    }

    /**
     * Criar novo utilizador — REQUER AUTH (apenas admins/gestores)
     */
    public function store(Request $request)
    {

        $dados = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:6',
            'role'       => 'required|in:admin,operador,contablista',
            'ativo'      => 'nullable|boolean',
            'empresa_id' => 'nullable|uuid|exists:empresas,id',
        ]);

        $dados['ativo'] = $dados['ativo'] ?? true;

        if (! isset($dados['empresa_id'])) {
            $dados['empresa_id'] = Auth::user()->empresa_id;
        }

        $user = User::create($dados);

        return response()->json([
            'message' => 'Utilizador criado com sucesso',
            'user'    => $user->load('empresa'),
        ], 201);
    }

    /**
     * Atualizar utilizador — REQUER AUTH
     */
    public function update(Request $request, User $user)
    {

        $dados = $request->validate([
            'name'       => 'sometimes|required|string|max:255',
            'email'      => 'sometimes|required|email|unique:users,email,' . $user->id,
            'password'   => 'nullable|string|min:6',
            'role'       => 'sometimes|required|in:admin,operador,contablista',
            'ativo'      => 'nullable|boolean',
            'empresa_id' => 'nullable|uuid|exists:empresas,id',
        ]);

        // Se password vier vazia/nula, não atualiza
        if (empty($dados['password'])) {
            unset($dados['password']);
        }

        $user->update($dados);

        return response()->json([
            'message' => 'Utilizador atualizado com sucesso',
            'user'    => $user->fresh('empresa'),
        ]);
    }

    /**
     * Eliminar utilizador — REQUER AUTH
     */
    public function destroy(User $user)
    {
        

        $user->delete();

        return response()->json([
            'message' => 'Utilizador eliminado com sucesso',
        ]);
    }

    /**
     * Atualizar último login — REQUER AUTH
     */
    public function atualizarUltimoLogin(User $user)
    {

        $user->ultimo_login = now();
        $user->save();

        return response()->json([
            'message' => 'Último login atualizado com sucesso',
            'user'    => $user->load('empresa'),
        ]);
    }
}