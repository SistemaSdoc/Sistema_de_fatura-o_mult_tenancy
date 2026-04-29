<?php

namespace App\Policies;

use App\Models\Tenant\Fatura;
use App\Models\Tenant\User;
use Illuminate\Auth\Access\Response;

class FaturaPolicy
{
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'operador','contablista']);
    }

    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'operador', 'contablista']);
    }
}
