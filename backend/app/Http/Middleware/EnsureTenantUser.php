<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureTenantConnection - Garante que está autenticado no tenant correto
 * 
 * Usado em rotas que precisam de usuário autenticado no contexto do tenant
 */
class EnsureTenantConnection
{
    /**
     * Guard a ser usado (tenant ou tenant_api)
     */
    protected string $guard = 'tenant';

    /**
     * @param Request $request
     * @param Closure $next
     * @param string|null $guard
     * @return Response
     */
    public function handle(Request $request, Closure $next, ?string $guard = null): Response
    {
        $guard = $guard ?? $this->guard;
        
        // 1. Verifica se tenant está resolvido
        $empresa = app('current.tenant');
        
        if (!$empresa) {
            Log::warning('EnsureTenantConnection: Tenant não resolvido');
            
            return response()->json([
                'success' => false,
                'message' => 'Contexto de empresa não encontrado.'
            ], 400);
        }

        // 2. Verifica autenticação no tenant
        if (!Auth::guard($guard)->check()) {
            Log::warning('EnsureTenantConnection: Usuário não autenticado no tenant', [
                'empresa_id' => $empresa->id,
                'guard' => $guard,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Não autenticado. Faça login na empresa.'
            ], 401);
        }

        $user = Auth::guard($guard)->user();

        // 3. Verifica se usuário pertence ao tenant atual
        // Para LandlordUser em modo atendimento
        if ($user instanceof \App\Models\Landlord\LandlordUser) {
            if (!$user->podeAcessarEmpresa($empresa->id)) {
                Log::warning('EnsureTenantConnection: LandlordUser sem acesso à empresa', [
                    'user_id' => $user->id,
                    'empresa_id' => $empresa->id,
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Sem permissão para acessar esta empresa.'
                ], 403);
            }
            
            // Verifica se está em modo atendimento (para suporte)
            if ($user->ehSuporte() && $user->empresa_id_atual !== $empresa->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Você não está em modo atendimento desta empresa.'
                ], 403);
            }
        }
        
        // Para TenantUser (usuário normal da empresa)
        elseif ($user instanceof \App\Models\Tenant\User) {
            // ✅ CORREÇÃO: Verifica se o landlord_user_id tem acesso
            $landlordUser = $user->landlordUser(); // método correto: landlordUser()
            
            if (!$landlordUser || !$landlordUser->podeAcessarEmpresa($empresa->id)) {
                Log::warning('EnsureTenantConnection: TenantUser sem vínculo válido', [
                    'tenant_user_id' => $user->id,
                    'landlord_user_id' => $user->landlord_user_id,
                    'empresa_id' => $empresa->id,
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Usuário não vinculado a esta empresa.'
                ], 403);
            }
        }

        // 4. Verifica se usuário está ativo
        if (!$user->ativo) {
            return response()->json([
                'success' => false,
                'message' => 'Conta desativada.'
            ], 403);
        }

        // 5. Registra no request
        $request->attributes->set('current_user', $user);
        $request->attributes->set('current_user_type', get_class($user));

        Log::info('EnsureTenantConnection: Acesso permitido', [
            'user_id' => $user->id,
            'user_type' => get_class($user),
            'empresa_id' => $empresa->id,
        ]);

        return $next($request);
    }
}