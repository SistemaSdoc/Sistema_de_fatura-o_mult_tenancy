<?php
// Caminho dos arquivos
$privateKeyFile = 'agt_private.pem';
$publicKeyFile  = 'agt_public.pem';

// Gerar par de chaves RSA
$config = [
    "private_key_bits" => 2048,
    "private_key_type" => OPENSSL_KEYTYPE_RSA,
];
$res = openssl_pkey_new($config);

// Exportar chave privada
openssl_pkey_export($res, $privateKey);
file_put_contents($privateKeyFile, $privateKey);

// Gerar chave pública
$pubKey = openssl_pkey_get_details($res);
file_put_contents($publicKeyFile, $pubKey['key']);

echo "Chaves geradas com sucesso!\n";