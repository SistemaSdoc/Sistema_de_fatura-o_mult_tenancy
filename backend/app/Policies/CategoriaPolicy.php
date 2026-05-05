<?php

namespace App\Policies;

use App\Models\Tenant\Categoria;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class CategoriaPolicy
{
    /**
     * Hook executado antes de qualquer método
     * Versão simples e compatível
     */
    public function before($user, $ability)
    {
        Log::info('🔐 Policy BEFORE chamado', [
            'ability'     => $ability,
            'user_id'     => $user?->id,
            'user_role'   => $user?->role ?? 'null',
            'user_present' => $user !== null,
        ]);

        // Se for admin, libera tudo
        if ($user && $user->role === 'admin') {
            return true;
        }

        return null; // continua para o método específico
    }

    public function viewAny($user)
    {
        return true;
    }

    public function create($user)
    {
        Log::info(' Policy Categoria.create', [
            'user_id'   => $user?->id,
            'user_role' => $user?->role ?? 'null',
            
        ]);

        if (!$user) {
            Log::warning('❌ Policy: Usuário null');
            return false;
        }

        return in_array($user->role ?? '', ['admin', 'operador', 'contabilista']);
    }

    public function update($user, Categoria $categoria)
    {
        if (!$user) return false;
        return in_array($user->role ?? '', ['admin', 'operador', 'contabilista']);
    }

    public function delete($user, Categoria $categoria)
    {
        if (!$user) return false;
        return $user->role === 'admin';
    }
}