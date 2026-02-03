<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    public function viewAny(User $user)
    {
        return $user->role === 'admin';
    }

    public function create(User $user)
    {
        return $user->role === 'admin';
    }

    public function update(User $user, User $model)
    {
        return $user->role === 'admin' || $user->id === $model->id;
    }

    public function delete(User $user)
    {
        return $user->role === 'admin';
    }
}
