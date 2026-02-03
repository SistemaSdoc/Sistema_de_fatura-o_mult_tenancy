<?php

namespace App\Policies;

use App\Models\Categoria;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CategoriaPolicy
{
    public function viewAny(User $user)
    {
        return true;
    }

    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'operador','contablista']);
    }

    public function update(User $user)
    {
        return in_array($user->role, ['admin', 'operador','contablista']);
    }

    public function delete(User $user)
    {
        return $user->role === 'admin';
    }
}
