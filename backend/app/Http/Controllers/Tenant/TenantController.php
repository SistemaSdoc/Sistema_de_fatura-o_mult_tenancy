<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\Tenant;
use App\Services\TenantService;

class TenantController extends Controller
{
    protected $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    /**
     * Criar um novo tenant
     */
    public function criar(Request $request)
    {
        // 1️⃣ Validar dados
        $request->validate([
            'nome' => 'required|string|max:255',
            'nif' => 'nullable|string|unique:tenants,nif',
            'subdominio' => 'required|string|unique:tenants,subdominio',
            'email' => 'required|email|unique:tenants,email',
        ]);

        // 2️⃣ Criar tenant no landlord
        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'nome' => $request->nome,
            'nif' => $request->nif,
            'subdominio' => $request->subdominio,
            'email' => $request->email,
            'database_name' => 'tenant_' . time(), // nome único do banco
            'status' => 'ativo',
        ]);

        // 3️⃣ Criar banco do tenant e rodar migrations + seed
        try {
            $this->tenantService->criarTenantDatabase($tenant);
        } catch (\Exception $e) {
            // Se falhar, remove tenant do landlord
            $tenant->delete();
            return response()->json([
                'message' => 'Falha ao criar banco do tenant',
                'error' => $e->getMessage()
            ], 500);
        }

        // 4️⃣ Retorno padronizado
        return response()->json([
            'message' => 'Tenant criado com sucesso!',
            'tenant' => [
                'id' => $tenant->id,
                'nome' => $tenant->nome,
                'subdominio' => $tenant->subdominio,
                'email' => $tenant->email,
                'status' => $tenant->status,
                'database_name' => $tenant->database_name,
                'created_at' => $tenant->created_at->toDateTimeString(),
                'updated_at' => $tenant->updated_at->toDateTimeString(),
            ],
        ], 201);
    }

    /**
     * Listar todos os tenants
     */
    public function index()
    {
        $tenants = Tenant::all();

        return response()->json([
            'count' => $tenants->count(),
            'tenants' => $tenants
        ]);
    }

    /**
     * Mostrar um tenant específico
     */
    public function show($id)
    {
        $tenant = Tenant::findOrFail($id);

        return response()->json([
            'tenant' => $tenant
        ]);
    }

    /**
     * Atualizar tenant
     */
    public function update(Request $request, $id)
    {
        $tenant = Tenant::findOrFail($id);

        $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'nif' => 'sometimes|nullable|string|unique:tenants,nif,' . $tenant->id,
            'subdominio' => 'sometimes|required|string|unique:tenants,subdominio,' . $tenant->id,
            'email' => 'sometimes|required|email|unique:tenants,email,' . $tenant->id,
            'status' => 'sometimes|required|in:ativo,inativo',
        ]);

        $tenant->update($request->only([
            'nome', 'nif', 'subdominio', 'email', 'status'
        ]));

        return response()->json([
            'message' => 'Tenant atualizado com sucesso!',
            'tenant' => $tenant
        ]);
    }

    /**
     * Deletar tenant
     */
    public function destroy($id)
    {
        $tenant = Tenant::findOrFail($id);

        try {
            // 1️⃣ Deletar banco do tenant (opcional via service)
            $this->tenantService->deletarTenantDatabase($tenant);

            // 2️⃣ Deletar tenant no landlord
            $tenant->delete();
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao deletar tenant',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'message' => 'Tenant deletado com sucesso!'
        ], 200);
    }
}
