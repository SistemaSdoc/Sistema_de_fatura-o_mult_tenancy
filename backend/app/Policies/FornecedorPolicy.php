<?php

namespace App\Policies;

use App\Models\Fornecedor;
use App\Models\User;

class FornecedorPolicy
{
    /**
     * Ver todos os fornecedores
     */
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'operador', 'contablista']);
    }

    /**
     * Ver fornecedor específico
     */
    public function view(User $user)
    {
        return $this->viewAny($user);
    }

    /**
     * Criar fornecedor
     */
    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Atualizar fornecedor
     */
    public function update(User $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Deletar fornecedor
     */
    public function delete(User $user)
    {
        return $user->role === 'admin';
    }
}
