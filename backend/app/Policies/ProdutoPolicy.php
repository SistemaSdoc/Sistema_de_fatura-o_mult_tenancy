<?php

namespace App\Policies;

use App\Models\Produto;
use App\Models\User;
use Illuminate\Auth\Access\Response;
class ProdutoPolicy
{
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'operador', 'caixa']);
    }

    public function view(User $user)
    {
        return $this->viewAny($user);
    }

    public function create(User $user)
    {
        return $user->role === 'admin';
    }

    public function update(User $user)
    {
        return $user->role === 'admin';
    }

    public function delete(User $user)
    {
        return $user->role === 'admin';
    }
}
