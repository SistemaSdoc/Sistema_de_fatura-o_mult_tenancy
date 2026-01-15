<?php

namespace App\Policies;

use App\Models\Pagamento;
use App\Models\TenantUser;
use Illuminate\Auth\Access\Response;

class PagamentoPolicy
{
    public function viewAny(TenantUser $user)
    {
        return in_array($user->role, ['admin', 'caixa']);
    }

    public function create(TenantUser $user)
    {
        return in_array($user->role, ['admin', 'caixa']);
    }
}
