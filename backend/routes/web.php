<?php

namespace App\Http\Routes;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Landlord\TenantAdminController;

// Rotas para super admins do Landlord
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('landlord')->group(function () {

    // ================= LISTAR TENANTS =================
    Route::get('/tenants', [TenantAdminController::class, 'index']);

    // ================= CRIAR NOVO TENANT =================
    Route::post('/tenants', [TenantAdminController::class, 'store']);

    // ================= DELETAR TENANT =================
    Route::delete('/tenants/{tenantId}', [TenantAdminController::class, 'destroy']);

    // ================= ADICIONAR DOMÍNIO AO TENANT =================
    Route::post('/tenants/{tenantId}/domains', [TenantAdminController::class, 'addDomain']);

    // ================= CRIAR USUÁRIO DO TENANT =================
    Route::post('/tenants/{tenantId}/users', [TenantAdminController::class, 'createTenantUser']);
});
