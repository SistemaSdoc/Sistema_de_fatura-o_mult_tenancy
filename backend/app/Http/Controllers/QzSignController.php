<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

class QzSignController extends Controller
{
    // Caminhos dos ficheiros
    private string $privateKeyPath = 'qz/private-key.pem';
    private string $certificatePath = 'qz/digital-certificate.txt';

    /**
     * Retorna o certificado público
     */
    public function certificate(): Response
    {
        $certPath = storage_path('app/' . $this->certificatePath);

        if (!file_exists($certPath)) {
            abort(500, 'Certificado QZ não encontrado: ' . $certPath);
        }

        return response(file_get_contents($certPath), 200)
            ->header('Content-Type', 'text/plain')
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate')
            ->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Assina a mensagem enviada pelo QZ Tray
     */
public function sign(Request $request): Response
{
    $request->validate([
        'data' => 'required|string'
    ]);

    $mensagem = $request->input('data');

    $keyPath = storage_path('app/' . $this->privateKeyPath);

    if (!file_exists($keyPath)) {
        abort(500, 'Chave privada QZ não encontrada: ' . $keyPath);
    }

    $privateKeyContent = file_get_contents($keyPath);

    $privateKey = openssl_pkey_get_private($privateKeyContent);

    if (!$privateKey) {
        abort(500, 'Erro ao carregar a chave privada. Verifica formato PEM.');
    }

    $signature = null;

    $success = openssl_sign($mensagem, $signature, $privateKey, OPENSSL_ALGO_SHA512);

    if (!$success) {
        abort(500, 'Erro ao assinar a mensagem.');
    }

    openssl_free_key($privateKey);

    return response(base64_encode($signature), 200)
        ->header('Content-Type', 'text/plain')
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        ->header('Access-Control-Allow-Headers', '*');
}
}
