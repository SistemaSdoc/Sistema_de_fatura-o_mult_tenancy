<?php

namespace App\Policies;

use App\Models\Categoria;
use App\Models\TenantUser;
use Illuminate\Auth\Access\Response;

class CategoriaPolicy
{
    public function viewAny(TenantUser $user)
    {
        return true;
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
