<?php

namespace App\Policies;

use App\Models\Compra;
use App\Models\TenantUser;


class CompraPolicy
{
    public function viewAny(TenantUser $user)
    {
        return $user->role === 'admin';
    }

    public function create(TenantUser $user)
    {
        return $user->role === 'admin';
    }
}
