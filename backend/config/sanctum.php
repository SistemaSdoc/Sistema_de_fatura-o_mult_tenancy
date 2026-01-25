<?php

use Laravel\Sanctum\Sanctum;

return [

'stateful' => explode(',', env(
    'SANCTUM_STATEFUL_DOMAINS',
    '127.0.0.1:3000'
)),


    'guard' => ['web'],

    'expiration' => null,

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

];
