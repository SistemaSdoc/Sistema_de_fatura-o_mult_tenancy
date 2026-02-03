<?php

namespace App\Policies;

use App\Models\Cliente;
use App\Models\User;

class ClientePolicy
{
    /**
     * Ver todos os clientes
     */
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'operador', 'contablista']);
    }

    /**
     * Ver cliente específico
     */
    public function view(User $user)
    {
        return $this->viewAny($user);
    }

    /**
     * Criar cliente
     */
    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Atualizar cliente
     */
    public function update(User $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Deletar cliente
     */
    public function delete(User $user)
    {
        return $user->role === 'admin';
    }
}
