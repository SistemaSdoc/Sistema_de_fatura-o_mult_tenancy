<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\Domain;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TenantAdminController extends Controller
{
    // ================= LISTAR TENANTS =================
    public function index()
    {
        return response()->json(Tenant::all());
    }

    // ================= CRIAR NOVO TENANT =================
    public function store(Request $request)
    {
        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'subdomain' => 'required|string|unique:tenants,subdomain',
            'email' => 'required|email|unique:tenants,email',
            'database_name' => 'required|string|unique:tenants,database_name',
            'logo' => 'nullable|string',
        ]);

        $dados['id'] = (string) Str::uuid();
        $dados['status'] = 'ativo';

        $tenant = Tenant::create($dados);

        // Opcional: criar banco do tenant automaticamente
        DB::statement("CREATE DATABASE IF NOT EXISTS `{$tenant->database_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

        return response()->json([
            'message' => 'Tenant criado com sucesso',
            'tenant' => $tenant,
        ]);
    }

    // ================= ADICIONAR DOMÍNIO AO TENANT =================
    public function addDomain(Request $request, $tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);

        // Valida se tenant está ativo
        if ($tenant->status !== 'ativo') {
            return response()->json(['message' => 'Tenant inativo'], 403);
        }

        $dados = $request->validate([
            'domain' => 'required|string|unique:domains,domain',
        ]);

        $dados['tenant_id'] = $tenant->id;
        $dados['id'] = (string) Str::uuid();

        $domain = Domain::create($dados);

        return response()->json($domain);
    }

    // ================= CRIAR USUÁRIO DO TENANT =================
    public function createTenantUser(Request $request, $tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);

        // Valida se tenant está ativo
        if ($tenant->status !== 'ativo') {
            return response()->json(['message' => 'Tenant inativo'], 403);
        }

        $dados = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:tenant_users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,operador,caixa',
        ]);

        $dados['id'] = (string) Str::uuid();
        $dados['password'] = Hash::make($dados['password']);

        // Conecta dinamicamente ao banco do tenant
        config(['database.connections.tenant.database' => $tenant->database_name]);
        DB::purge('tenant');
        DB::reconnect('tenant');

        $user = TenantUser::create($dados);

        return response()->json([
            'message' => 'Usuário do tenant criado com sucesso',
            'user' => $user,
        ]);
    }
}
