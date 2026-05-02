<?php

namespace App\Policies;

use App\Models\Tenant\User;
use Illuminate\Support\Facades\Log;

class VendaPolicy
{
    private function isTenantUser($user): bool
    {
        return $user instanceof User;
    }

    public function viewAny($user)  // ← removeu o tipo
    {
        if (!$this->isTenantUser($user)) {
            return false;
        }
        Log::info('[VendaPolicy] viewAny - user type', [
            'type' => get_class($user),
            'id'   => $user->id ?? null,
            'role' => $user->role ?? 'null',
        ]);
        return in_array($user->role, ['admin', 'operador', 'contabilista']);
    }

    public function create($user)  // ← removeu o tipo
    {
        if (!$this->isTenantUser($user)) {
            return false;
        }
        Log::info('[VendaPolicy] create - user type', [
            'type' => get_class($user),
            'id'   => $user->id ?? null,
            'role' => $user->role ?? 'null',
        ]);
        return in_array($user->role, ['admin', 'operador']);
    }

    public function cancel($user)  // ← removeu o tipo
    {
        if (!$this->isTenantUser($user)) {
            return false;
        }
        return $user->role === 'admin';
    }
}