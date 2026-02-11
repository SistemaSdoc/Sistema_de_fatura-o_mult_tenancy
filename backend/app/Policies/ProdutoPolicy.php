<?php

namespace App\Policies;

use App\Models\Produto;
use App\Models\User;

class ProdutoPolicy
{
    /**
     * Roles que podem visualizar produtos (lista ou individual)
     */
    private function canView(User $user): bool
    {
        return in_array($user->role, ['admin', 'operador', 'contabilista']); // ✅ CORRIGIDO: 'contablista' → 'contabilista'
    }

    /**
     * Roles que podem gerenciar (criar, atualizar, deletar) produtos
     */
    private function canManage(User $user): bool
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    /**
     * Ver lista de produtos
     */
    public function viewAny(User $user): bool
    {
        return $this->canView($user);
    }

    /**
     * Ver um produto específico
     */
    public function view(User $user, Produto $produto): bool
    {
        return $this->canView($user);
    }

    /**
     * Criar novo produto
     */
    public function create(User $user): bool
    {
        return $this->canManage($user);
    }

    /**
     * Atualizar produto existente
     */
    public function update(User $user, Produto $produto): bool
    {
        return $this->canManage($user);
    }

    /**
     * SOFT DELETE (exclusão lógica) - Marca como deleted_at
     * Permitido para admin e operador
     */
    public function delete(User $user, Produto $produto): bool
    {
        return $this->canManage($user);
    }

    /**
     * Restaurar produto que foi soft-deleted
     */
    public function restore(User $user, Produto $produto): bool
    {
        return $this->canManage($user);
    }

    /**
     * HARD DELETE (exclusão definitiva do banco)
     * Apenas admin pode excluir permanentemente
     */
    public function forceDelete(User $user, Produto $produto): bool
    {
        return $user->role === 'admin';
    }
}
