<?php

namespace App\Policies;

use App\Models\User;

class VendaPolicy
{
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }

    public function cancel(User $user)
    {
        return $user->role === 'admin';
    }
}
