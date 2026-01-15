<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\Domain;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use App\Services\TenantService;

class TenantAdminController extends Controller
{
    protected $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

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

        // Criar banco + migrations + seed via TenantService
        $this->tenantService->criarTenantDatabase($tenant);

        return response()->json([
            'message' => 'Tenant criado com sucesso',
            'tenant' => $tenant,
        ]);
    }

    // ================= DELETAR TENANT =================
    public function destroy($tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);

        // Deletar banco
        $this->tenantService->deletarTenantDatabase($tenant);

        // Deletar registro do landlord
        $tenant->delete();

        return response()->json([
            'message' => 'Tenant deletado com sucesso',
        ]);
    }

    // ================= ADICIONAR DOMÍNIO AO TENANT =================
    public function addDomain(Request $request, $tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);

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
        \Illuminate\Support\Facades\DB::purge('tenant');
        \Illuminate\Support\Facades\DB::reconnect('tenant');

        $user = TenantUser::create($dados);

        return response()->json([
            'message' => 'Usuário do tenant criado com sucesso',
            'user' => $user,
        ]);
    }
}
