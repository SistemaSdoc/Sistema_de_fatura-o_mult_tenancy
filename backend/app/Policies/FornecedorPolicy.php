<?php

namespace App\Policies;

use App\Models\Tenant\Fornecedor;
use App\Models\Tenant\User;

class FornecedorPolicy
{
    /**
     * Ver todos os fornecedores
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'operador', 'contablista']);
    }

    /**
     * Ver fornecedor específico
     */
    public function view(User $user, Fornecedor $fornecedor): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Criar fornecedor
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'contablista']);
    }

    /**
     * Atualizar fornecedor
     */
    public function update(User $user, Fornecedor $fornecedor): bool
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Soft Delete - mover para lixeira
     * CORREÇÃO: Agora permite operador também (alinhado com rotas)
     */
    public function delete(User $user, Fornecedor $fornecedor): bool
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Restaurar fornecedor da lixeira
     * CORREÇÃO: Agora permite operador também
     */
    public function restore(User $user): bool
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Deletar permanentemente
     * CORREÇÃO: Agora permite operador também
     */
    public function forceDelete(User $user): bool
    {
        return in_array($user->role, ['admin', 'operador']);
    }
}
