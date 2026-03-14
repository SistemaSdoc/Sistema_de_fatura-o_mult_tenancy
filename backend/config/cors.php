<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'me'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://127.0.0.1:3000',
        'http://192.168.5.184:3000',
        'http://10.173.190.204:3000',
        'http://192.168.1.31:3000',
        'http://192.168.1.198:3000',
        'http://192.168.0.146:3000',
        'http://192.168.1.199:3000',
        'http://10.184.232.204:3000',
        'http://192.168.0.170:3000',
    ],

    'allowed_origins_patterns' => [],

    // '*' com supports_credentials=true não funciona como wildcard real no protocolo CORS.
    // Os headers têm de ser listados explicitamente.
    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-XSRF-TOKEN',
        'X-Tenant',
        'Cache-Control',
        'Pragma',
        'Expires',
    ],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
