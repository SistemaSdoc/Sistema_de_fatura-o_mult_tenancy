<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Services\TenantService;

class TenantController extends Controller
{
    protected $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    public function criar(Request $request)
    {
        // 1️⃣ Cria tenant no landlord
        $tenant = Tenant::create([
            'nome' => $request->nome,
            'nif' => $request->nif,
            'subdominio' => $request->subdominio,
            'email' => $request->email,
            'database' => 'tenant_' . time(), // nome único do banco
            'status' => 'ativo'
        ]);

        // 2️⃣ Cria banco do tenant e roda migrations + seed
        $this->tenantService->criarTenantDatabase($tenant);

        return response()->json([
            'message' => 'Tenant criado com sucesso!',
            'tenant' => $tenant
        ]);
    }
}
