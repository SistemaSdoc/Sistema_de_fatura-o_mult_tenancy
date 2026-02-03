<?php

namespace App\Policies;

use App\Models\Compra;
use App\Models\User;


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
