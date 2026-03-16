<?php

use Laravel\Sanctum\Sanctum;

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    | Aceita qualquer IP local nas portas 3000 e 8000.
    | O request()->getHost() foi removido do config pois não funciona
    | durante artisan commands — o CORS já trata dos IPs dinamicamente.
    */
    'stateful' => array_filter(array_unique(array_merge(
        explode(',', env('SANCTUM_STATEFUL_DOMAINS', '')),
        [
            'localhost',
            'localhost:3000',
            'localhost:8000',
            '127.0.0.1',
            '127.0.0.1:3000',
            '127.0.0.1:8000',
        ]
    ))),

    'guard' => ['web'],

    'expiration' => null,

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

];