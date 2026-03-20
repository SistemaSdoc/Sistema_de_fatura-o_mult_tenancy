<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Paths
    |--------------------------------------------------------------------------
    */
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'me'],

    'allowed_methods' => ['*'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins
    |--------------------------------------------------------------------------
    | Aceita qualquer IP local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    | em qualquer porta — funciona automaticamente quando o IP muda.
    */
    'allowed_origins' => [],

    'allowed_origins_patterns' => [
        // 192.168.x.x — redes domésticas / escritório
        '#^http://192\.168\.\d+\.\d+(:\d+)?$#',
        // 10.x.x.x — redes corporativas
        '#^http://10\.\d+\.\d+\.\d+(:\d+)?$#',
        // 172.16.x.x – 172.31.x.x — redes privadas
        '#^http://172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$#',
        // localhost e 127.0.0.1
        '#^http://localhost(:\d+)?$#',
        '#^http://127\.0\.0\.1(:\d+)?$#',
    ],

    /*
    |--------------------------------------------------------------------------
    | Allowed Headers
    |--------------------------------------------------------------------------
    */
    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-XSRF-TOKEN',
        'X-Print-Preview',
        'X-Tenant',
        'Cache-Control',
        'Pragma',
        'Expires',
    ],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
    |--------------------------------------------------------------------------
    | Supports Credentials
    |--------------------------------------------------------------------------
    | Obrigatório true para Sanctum SPA (cookies de sessão).
    */
    'supports_credentials' => true,

];