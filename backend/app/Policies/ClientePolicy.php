<?php

namespace App\Policies;

use App\Models\Cliente;
use App\Models\User;

class ClientePolicy
{
    /**
     * Determina se o usuário pode realizar qualquer ação (super admin).
     * Executado antes dos outros métodos.
     */
    public function before(User $user, string $ability): ?bool
    {
        // Se for admin, permite tudo automaticamente
        if ($user->role === 'admin') {
            return true;
        }

        // Retorna null para continuar verificando os outros métodos
        return null;
    }

    /**
     * Ver todos os clientes (index)
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'operador', 'contabilista']);
    }

    /**
     * Ver cliente específico (show)
     */
    public function view(User $user, Cliente $cliente): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Criar cliente (store)
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Atualizar cliente (update)
     */
    public function update(User $user, Cliente $cliente): bool
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Deletar cliente (destroy)
     */
    public function delete(User $user, Cliente $cliente): bool
    {
        // Apenas admin pode deletar (before() já trata isso, mas mantemos para clareza)
        return $user->role === 'admin';
    }

    /**
     * Restaurar cliente soft deleted
     */
    public function restore(User $user, Cliente $cliente): bool
    {
        return $user->role === 'admin';
    }

    /**
     * Deletar permanentemente (force delete)
     */
    public function forceDelete(User $user, Cliente $cliente): bool
    {
        return $user->role === 'admin';
    }
}
