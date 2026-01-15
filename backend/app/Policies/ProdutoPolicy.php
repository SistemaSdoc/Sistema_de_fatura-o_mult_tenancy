<?php

namespace App\Policies;

use App\Models\Produto;
use App\Models\TenantUser;
use Illuminate\Auth\Access\Response;
class ProdutoPolicy
{
    public function viewAny(TenantUser $user)
    {
        return in_array($user->role, ['admin', 'operador', 'caixa']);
    }

    public function view(TenantUser $user)
    {
        return $this->viewAny($user);
    }

    public function create(TenantUser $user)
    {
        return $user->role === 'admin';
    }

    public function update(TenantUser $user)
    {
        return $user->role === 'admin';
    }

    public function delete(TenantUser $user)
    {
        return $user->role === 'admin';
    }
}
