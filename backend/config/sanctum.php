<?php

use Laravel\Sanctum\Sanctum;

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    | Domínios que o Sanctum deve tratar como "stateful" (usam cookies de sessão).
    | Isso resolve o erro 419 (CSRF) quando o frontend (Next.js) está em porta diferente.
    */

    'stateful' => array_filter(array_unique(array_merge(
        explode(',', env('SANCTUM_STATEFUL_DOMAINS', '')),
        [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',

            // Frontend (Next.js)
            'localhost:3000',
            '127.0.0.1:3000',
            '0.0.0.0:3000',

            // Backend (Laravel) - por segurança
            'localhost:8000',
            '127.0.0.1:8000',
            '0.0.0.0:8000',

            // Adiciona o teu IP atual da rede (podes adicionar mais IPs se precisares)
            '192.168.1.105:3000',
        ]
    ))),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    */
    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    | Quanto tempo os tokens devem durar (null = nunca expira)
    */
    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    */
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Middleware
    |--------------------------------------------------------------------------
    | Middleware usado para proteger rotas stateful
    */

];