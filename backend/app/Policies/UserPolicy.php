<?php

namespace App\Policies;

use App\Models\LandlordUser;
use App\Models\Tenant\User as TenantUser;

class UserPolicy
{
    /**
     * Determina se o utilizador pode ver a lista de utilizadores.
     *
     * @param  \App\Models\LandlordUser|\App\Models\Tenant\User  $user
     * @return bool
     */
    public function viewAny($user)
    {
        // Se for landlord user, permitir apenas se for admin do landlord
        if ($user instanceof LandlordUser) {
            // Ajuste conforme sua lógica (ex.: $user->role === 'super_admin')
            return $user->role === 'admin';
        }
        // Se for tenant user, permitir apenas se for admin do tenant
        return $user->role === 'admin';
    }

    /**
     * Determina se o utilizador pode criar um novo utilizador.
     *
     * @param  \App\Models\LandlordUser|\App\Models\Tenant\User  $user
     * @return bool
     */
    public function create($user)
    {
    
        if ($user instanceof LandlordUser) {
            return $user->role === 'admin';
        }
        return $user->role === 'admin';
        
    }

    /**
     * Determina se o utilizador pode atualizar um determinado utilizador.
     *
     * @param  \App\Models\LandlordUser|\App\Models\Tenant\User  $user
     * @param  \App\Models\Tenant\User  $model
     * @return bool
     */
    public function update($user, $model)
    {
        // Landlord não mexe em users de tenant (ou pode, mas normalmente não)
        if ($user instanceof LandlordUser) {
            return false;
        }
        return $user->role === 'admin' || $user->id === $model->id;
    }

    /**
     * Determina se o utilizador pode deletar um utilizador.
     *
     * @param  \App\Models\LandlordUser|\App\Models\Tenant\User  $user
     * @return bool
     */
    public function delete($user)
    {
        if ($user instanceof LandlordUser) {
            return $user->role === 'admin';
        }
        return $user->role === 'admin';
    }
}
