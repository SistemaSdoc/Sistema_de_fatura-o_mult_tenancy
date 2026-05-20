<?php

namespace App\Http\Controllers;

use App\Models\Tenant\User;
use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    /**
     * Retorna o utilizador autenticado com os dados da empresa
     */
    public function me(Request $request)
    {
        Log::info('[USER CONTROLLER ME] Método chamado em: ' . __FILE__);

        // ✅ FIX PRINCIPAL: buscar SEMPRE pelo ID da sessão tenant, não pelo guard genérico
        $tenantUserId = session('login_tenant_' . sha1('App\Models\Tenant\User'));
        
        if (!$tenantUserId) {
            // Fallback: tentar pelo guard tenant diretamente
            $guardUser = auth()->guard('tenant')->user();
            $tenantUserId = $guardUser?->id;
        }

        if (!$tenantUserId) {
            Log::warning('[USER CONTROLLER ME] Nenhum user tenant encontrado na sessão');
            return response()->json([
                'success' => false,
                'message' => 'Não autenticado'
            ], 401);
        }

        // ✅ Carrega SEMPRE do banco tenant pelo ID correto
        $user = User::on('tenant')->find($tenantUserId);

        if (!$user) {
            Log::warning('[USER CONTROLLER ME] User não encontrado no banco tenant', [
                'tenant_user_id' => $tenantUserId,
                'tenant_db' => config('database.connections.tenant.database'),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Utilizador não encontrado na base de dados'
            ], 404);
        }

        Log::info('[USER CONTROLLER ME] User tenant carregado', [
            'user_id'   => $user->id,
            'user_name' => $user->name,
            'ativo'     => $user->ativo,
            'tenant_db' => config('database.connections.tenant.database'),
        ]);

        // Buscar a empresa do tenant atual
        $empresa = Empresa::on('landlord')
            ->where('db_name', config('database.connections.tenant.database'))
            ->first();

        if (!$empresa) {
            Log::warning('[USER CONTROLLER ME] Empresa não encontrada', [
                'tenant_db' => config('database.connections.tenant.database'),
            ]);
        }

        // Helper para formatar datas
        $fmt = fn ($date) => $date ? $date->format('Y-m-d H:i:s') : null;

        $userData = [
            'id'                => $user->id,
            'name'              => $user->name,
            'email'             => $user->email,
            'role'              => $user->role,
            'ativo'             => (bool) $user->ativo,
            'printer_ip'        => $user->printer_ip,
            'ultimo_login'      => $fmt($user->ultimo_login),
            'created_at'        => $fmt($user->created_at),
            'updated_at'        => $fmt($user->updated_at),
            'email_verified_at' => $fmt($user->email_verified_at),
        ];

        $empresaData = null;
        if ($empresa) {
            $empresaData = [
                'id'            => $empresa->id,
                'nome'          => $empresa->nome,
                'nif'           => $empresa->nif,
                'email'         => $empresa->email,
                'telefone'      => $empresa->telefone,
                'endereco'      => $empresa->endereco,
                'subdomain'     => $empresa->subdomain,
                'logo'          => $empresa->logo,
                'regime_fiscal' => $empresa->regime_fiscal ?? 'simplificado',
                'sujeito_iva'   => (bool) $empresa->sujeito_iva,
                'status'        => $empresa->status ?? 'ativo',
                'data_registro' => $fmt($empresa->data_registro),
            ];
        }

        $response = [
            'success' => true,
            'message' => 'Utilizador carregado com sucesso',
            'user'    => $userData,
            'empresa' => $empresaData,
        ];

        Log::info('[USER CONTROLLER ME] Resposta completa:', $response);

        return response()->json($response);
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
            'role'     => ['required', Rule::in(['admin', 'operador', 'contablista', 'gestor'])],
            'ativo'    => 'nullable|boolean',
        ]);

        $dados['ativo']    = $dados['ativo'] ?? true;
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
            'name'       => 'sometimes|required|string|max:255',
            'email'      => [
                'sometimes', 'required', 'email',
                Rule::unique('users')->ignore($user->id),
            ],
            'password'   => 'nullable|string|min:6',
            'role'       => ['sometimes', 'required', Rule::in(['admin', 'operador', 'contablista', 'gestor'])],
            'ativo'      => 'nullable|boolean',
            'printer_ip' => 'nullable|string|max:255',
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

        return response()->json(['message' => 'Utilizador eliminado com sucesso']);
    }

    /**
     * Atualizar o campo ultimo_login.
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
     * ✅ Método auxiliar — devolve SEMPRE o TenantUser, nunca o LandlordUser
     */
    private function getAuthenticatedUser(): ?User
    {
        // 1. Tentar pelo guard tenant (mais direto)
        $user = auth()->guard('tenant')->user();
        if ($user instanceof User) {
            return $user;
        }

        // 2. Fallback: ler ID da sessão tenant e carregar do banco
        $tenantUserId = session('login_tenant_' . sha1('App\Models\Tenant\User'));
        if ($tenantUserId) {
            return User::on('tenant')->find($tenantUserId);
        }

        return null;
    }
}