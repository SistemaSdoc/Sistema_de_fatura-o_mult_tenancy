<?php

namespace App\Policies;

use App\Models\Pagamento;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class PagamentoPolicy
{
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'contablista', 'operador']);
    }

    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'operador']);
    }
}
