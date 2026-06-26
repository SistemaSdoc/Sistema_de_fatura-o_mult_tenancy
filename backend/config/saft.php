<?php

return [
    'company' => [
        'tax_number' => env('SAFT_TAX_NUMBER', '999999999'),
        'name' => env('SAFT_COMPANY_NAME', 'SDOCA'),
        'address' => env('SAFT_ADDRESS', 'Angola, Luanda, Ingombota , bairro Maculusso'),
        'phone' => env('SAFT_PHONE', '+244 922 578 212'),
        'email' => env('SAFT_EMAIL', 'geral@sdocait.com'),
    ],
    'currency' => 'AOA',
    'tax_accounting_basis' => 'FT', 
];