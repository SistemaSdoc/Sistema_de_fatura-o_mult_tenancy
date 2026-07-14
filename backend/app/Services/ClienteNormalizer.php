<?php
// app/Services/ClienteNormalizer.php

namespace App\Services;

use Illuminate\Validation\ValidationException;
use libphonenumber\PhoneNumberUtil;
use libphonenumber\PhoneNumberFormat;

class ClienteNormalizer
{
    public static function telefone(?string $telefone, ?string $isoPais): ?string
    {
        if (empty($telefone) || empty($isoPais)) {
            return $telefone;
        }

        try {
            $phoneUtil = PhoneNumberUtil::getInstance();
            $numeroProto = $phoneUtil->parse($telefone, $isoPais);
            return $phoneUtil->format($numeroProto, PhoneNumberFormat::E164);
        } catch (\Exception $e) {
            return $telefone;
        }
    }

    public static function nif(?string $nif, string $tipo): ?string
    {
        if (empty($nif)) {
            return null;
        }

        $nifLimpo = preg_replace('/[^A-Za-z0-9]/', '', $nif);

        if ($tipo === 'empresa' && !preg_match('/^\d{10}$/', $nifLimpo)) {
            throw ValidationException::withMessages([
                'nif' => 'Empresa deve ter NIF com exatamente 10 dígitos numéricos'
            ]);
        }

        if ($tipo === 'consumidor_final' && !preg_match('/^\d{10}$|^\d{9}[A-Za-z]{2}\d{3}$/', $nifLimpo)) {
            throw ValidationException::withMessages([
                'nif' => 'Consumidor final: NIF deve ter 10 dígitos ou BI (9 números + 2 letras + 3 números)'
            ]);
        }

        return $nifLimpo;
    }
}