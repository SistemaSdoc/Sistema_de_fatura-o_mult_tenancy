<?php

namespace App\Policies;

use App\Models\Fatura;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class FaturaPolicy
{
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'operador','caixa']);
    }

    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'operador', 'caixa']);
    }

    public function notaCredito(User $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }
}
