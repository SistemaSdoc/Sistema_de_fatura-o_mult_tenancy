<?php

namespace App\Policies;

use App\Models\Fatura;
use App\Models\TenantUser;
use Illuminate\Auth\Access\Response;

class FaturaPolicy
{
    public function viewAny(TenantUser $user)
    {
        return $user->role === 'admin';
    }

    public function create(TenantUser $user)
    {
        return $user->role === 'admin';
    }

    public function notaCredito(TenantUser $user)
    {
        return $user->role === 'admin';
    }
}
