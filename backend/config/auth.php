<?php

return [

    'defaults' => [
        'guard' => 'landlord',           // Landlord padrão para web
        'passwords' => 'landlord_users', // Corrigido: provider name
    ],

    'guards' => [
        // 🏠 LANDLORD - Web
        'landlord' => [
            'driver' => 'session',
            'provider' => 'landlord_users', //Corrigido
        ],

        // 🏠 LANDLORD - API
        'landlord_api' => [
            'driver' => 'session',
            'provider' => 'landlord_users', // Corrigido
        ],

        // 🏢 TENANT - Web (raro)
        'tenant' => [
            'driver' => 'session',
            'provider' => 'tenant_users',     // Corrigido
        ],

        // 🏢 TENANT - API (POS)
        'tenant_api' => [
            'driver' => 'session',
            'provider' => 'tenant_users',     // Corrigido
        ],

        // 🏢 TENANT - PIN
        'tenant_pin' => [
            'driver' => 'session',
            'provider' => 'tenant_users',     // Corrigido
        ],
    ],

    'providers' => [
        // 🏠 Landlord: Super Admin e Suporte
        'landlord_users' => [              //  Corrigido: consistente
            'driver' => 'eloquent',
            'model' => App\Models\LandlordUser::class,
        ],

        // 🏢 Tenant: Admin, Operador, Contablista da empresa
        'tenant_users' => [                //  Corrigido: consistente
            'driver' => 'eloquent',
            'model' => App\Models\Tenant\User::class,
        ],
    ],

    'passwords' => [
        'landlord_users' => [              // ✅ Corrigido: igual ao provider
            'provider' => 'landlord_users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],

        'tenant_users' => [               // ✅ Corrigido: igual ao provider
            'provider' => 'tenant_users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];