<?php

namespace App\Policies;

use App\Models\Fatura;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class FaturaPolicy
{
    public function viewAny(User $user)
    {
        return $user->role === 'admin';
    }

    public function create(User $user)
    {
        return $user->role === 'admin';
    }

    public function notaCredito(User $user)
    {
        return $user->role === 'admin';
    }
}
