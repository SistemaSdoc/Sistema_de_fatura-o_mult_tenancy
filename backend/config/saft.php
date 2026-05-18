<?php

return [
    'company' => [
        'tax_number' => env('SAFT_TAX_NUMBER', '999999990'),
        'name' => env('SAFT_COMPANY_NAME', 'Minha Empresa Lda'),
        'address' => env('SAFT_ADDRESS', 'Rua Exemplo, 123, Lisboa'),
        'phone' => env('SAFT_PHONE', '+351210000000'),
        'email' => env('SAFT_EMAIL', 'geral@empresa.pt'),
    ],
    'currency' => 'AOA',
    'tax_accounting_basis' => 'FT', // F = Facturação (IVA de caixa? F é o normal)
];