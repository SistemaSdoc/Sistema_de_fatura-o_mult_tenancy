<?php

namespace App\Policies;

use App\Models\Compra;
use App\Models\User;


class CompraPolicy
{
    public function viewAny(User $user)
    {
        return $user->role === 'admin';
    }

    public function create(User $user)
    {
        return $user->role === 'admin';
    }
}
