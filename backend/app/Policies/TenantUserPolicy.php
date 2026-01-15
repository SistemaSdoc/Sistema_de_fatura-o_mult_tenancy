<?php

namespace App\Policies;

use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class TenantUserPolicy
{
    public function viewAny(TenantUser $user)
    {
        return $user->role === 'admin';
    }

    public function create(TenantUser $user)
    {
        return $user->role === 'admin';
    }

    public function update(TenantUser $user, TenantUser $model)
    {
        return $user->role === 'admin' || $user->id === $model->id;
    }

    public function delete(TenantUser $user)
    {
        return $user->role === 'admin';
    }
}
