<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;
use libphonenumber\PhoneNumberUtil;
use libphonenumber\NumberParseException;

class ValidPhoneNumber implements Rule
{
    protected string $isoCode; // ex: "AO", "PT", "BR"

    public function __construct(string $isoCode)
    {
        $this->isoCode = $isoCode;
    }

    public function passes($attribute, $value): bool
    {
        if (empty($value)) {
            return true; // campo opcional
        }

        $phoneUtil = PhoneNumberUtil::getInstance();
        try {
            $numberProto = $phoneUtil->parse($value, $this->isoCode);
            return $phoneUtil->isValidNumber($numberProto);
        } catch (NumberParseException $e) {
            return false;
        }
    }

    public function message(): string
    {
        return 'O número de telefone não é válido para o país selecionado.';
    }
}