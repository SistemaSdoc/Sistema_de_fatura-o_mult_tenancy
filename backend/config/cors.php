
<?php

return [

    'paths' => [
        'api/*',
        'empresa/*',
        'landlord/*',
        'sanctum/csrf-cookie',
        'login',
        'logout',
        'me',
        'register',
        'upload-temp-logo',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://factura-ja.ao',
        'https://www.factura-ja.ao',
    ],

    'allowed_origins_patterns' => [
    '#^http://[a-zA-Z0-9-]+\.app\.factura-ja\.localhost(:\d+)?$#',
],
    'allowed_headers' => ['*'],

    'exposed_headers' => [
        'X-CSRF-TOKEN',
    ],

    'max_age' => 7200,

    'supports_credentials' => true,

];
