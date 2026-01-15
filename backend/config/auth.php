<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Authentication Guard
    |--------------------------------------------------------------------------
    */
    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),           // Landlord padrão
        'passwords' => env('AUTH_PASSWORD_BROKER', 'users'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    */
    'guards' => [
        // Landlord (Admin Global) - Web
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        // Landlord - API (opcional)
        'landlord_sanctum' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],

        // Tenant - Web
        'tenant' => [
            'driver' => 'session',
            'provider' => 'tenant_users',
        ],

        // Tenant - API
        'sanctum' => [
            'driver' => 'sanctum',
            'provider' => 'tenant_users',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    */
    'providers' => [
        // Landlord Admin
        'users' => [
            'driver' => 'eloquent',
            'model' => App\Models\User::class,
        ],

        // Tenant Users
        'tenant_users' => [
            'driver' => 'eloquent',
            'model' => App\Models\TenantUser::class,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Reset
    |--------------------------------------------------------------------------
    */
    'passwords' => [
        // Landlord
        'users' => [
            'provider' => 'users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],

        // Tenant Users
        'tenant_users' => [
            'provider' => 'tenant_users',
            'table' => 'tenant_password_resets', // tabela específica do tenant
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    */
    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),
];
