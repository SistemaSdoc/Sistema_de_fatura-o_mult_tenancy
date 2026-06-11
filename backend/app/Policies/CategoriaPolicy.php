<?php

namespace App\Policies;

use App\Models\Tenant\Categoria;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

/**
 * CategoriaPolicy - VERSÃO ULTRA-SIMPLES
 *
 *  SEM imports de User
 *  SEM type hints
 *  Usa Auth::guard('tenant') directamente
 *  Funciona 100%
 */
class CategoriaPolicy
{
    /**
     * Listar categorias
     */
    public function viewAny($user)
    {
        return true;
    }

    /**
     * Ver detalhe de categoria
     */
    public function view($user, Categoria $categoria)
    {
        return true;
    }

    /**
     * Criar nova categoria
     */
    public function create($user)
    {
        Log::info('[CategoriaPolicy] CREATE chamado', [
            'user_param'        => $user ? 'tem user' : 'user é null',
            'guard_tenant_id'   => Auth::guard('tenant')->id(),
            'guard_tenant_role' => Auth::guard('tenant')->user()?->role ?? 'null',
        ]);

        // ✅ Usar Auth::guard('tenant') ao invés de $user
        $authUser = Auth::guard('tenant')->user();

        if (!$authUser) {
            Log::warning('[CategoriaPolicy] CREATE: Nenhum user no guard tenant');
            return false;
        }

        $role = $authUser->role ?? '';
        $permitido = in_array($role, ['admin', 'operador', 'gestor', 'contabilista']);

        Log::info('[CategoriaPolicy] CREATE resultado', [
            'role'      => $role,
            'permitido' => $permitido,
        ]);

        return $permitido;
    }

    /**
     * Editar categoria - CRÍTICO
     */
    public function update($user, Categoria $categoria)
    {
        Log::info('[CategoriaPolicy] UPDATE chamado', [
            'categoria_id'      => $categoria->id,
            'user_param'        => $user ? 'tem user' : 'user é null',
            'guard_tenant_id'   => Auth::guard('tenant')->id(),
            'guard_tenant_role' => Auth::guard('tenant')->user()?->role ?? 'null',
        ]);

        // ✅ Usar Auth::guard('tenant') ao invés de $user
        $authUser = Auth::guard('tenant')->user();

        if (!$authUser) {
            Log::warning('[CategoriaPolicy] UPDATE: Nenhum user no guard tenant');
            return false;
        }

        $role = $authUser->role ?? '';
        $permitido = in_array($role, ['admin', 'operador', 'gestor', 'contabilista']);

        Log::info('[CategoriaPolicy] UPDATE resultado', [
            'user_id'   => $authUser->id,
            'role'      => $role,
            'permitido' => $permitido,
        ]);

        return $permitido;
    }

    /**
     * Apagar categoria
     */
    public function delete($user, Categoria $categoria)
    {
        Log::info('[CategoriaPolicy] DELETE chamado', [
            'categoria_id'      => $categoria->id,
            'guard_tenant_id'   => Auth::guard('tenant')->id(),
            'guard_tenant_role' => Auth::guard('tenant')->user()?->role ?? 'null',
        ]);

        // ✅ Usar Auth::guard('tenant') ao invés de $user
        $authUser = Auth::guard('tenant')->user();

        if (!$authUser) {
            return false;
        }

        $permitido = $authUser->role === 'admin';

        Log::info('[CategoriaPolicy] DELETE resultado', [
            'role'      => $authUser->role,
            'permitido' => $permitido,
        ]);

        return $permitido;
    }

    /**
     * Restaurar categoria
     */
    public function restore($user, Categoria $categoria)
    {
        $authUser = Auth::guard('tenant')->user();
        return $authUser && $authUser->role === 'admin';
    }

    /**
     * Apagar permanentemente
     */
    public function forceDelete($user, Categoria $categoria)
    {
        $authUser = Auth::guard('tenant')->user();
        return $authUser && $authUser->role === 'admin';
    }
}
