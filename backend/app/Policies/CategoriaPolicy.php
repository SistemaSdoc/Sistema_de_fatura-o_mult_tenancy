<?php

namespace App\Policies;

use Illuminate\Support\Facades\Log;

class CategoriaPolicy
{
    public function viewAny()
    {
        return true;
    }

    public function create($user)
    {
        Log::info('Policy Categoria.create', [
        'user_id' => $user->id ?? 'null',
        'user_class' => get_class($user),
        'user_role' => $user->role ?? 'indefinido',
    ]);
        return in_array($user->role, ['admin', 'operador','contablista']);
    }

    public function update($user)
    {
        return in_array($user->role, ['admin', 'operador','contablista']);
    }

    public function delete($user)
    {
        return $user->role === 'admin';
    }
}
