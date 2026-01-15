<?php

namespace App\Policies;

use App\Models\TenantUser;

class VendaPolicy
{
    public function viewAny(TenantUser $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    public function create(TenantUser $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    public function cancel(TenantUser $user)
    {
        return $user->role === 'admin';
    }
}
