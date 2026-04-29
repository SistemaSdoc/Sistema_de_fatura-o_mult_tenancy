<?php

namespace App\Policies;

use App\Models\Tenant\Pagamento;
use App\Models\Tenant\User;
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
