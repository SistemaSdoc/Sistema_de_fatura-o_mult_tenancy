<?php

namespace App\Policies;

use App\Models\Tenant\Compra;
use App\Models\Tenant\User;


class CompraPolicy
{
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'operador','contablista']);
    }

    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'operador','contablista']);
    }
}
