<?php

namespace Tests\Unit;

use App\Support\ValorPorExtensoKwanzas;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class ValorPorExtensoKwanzasTest extends TestCase
{
    public function test_formats_kwanzas_and_centimos(): void
    {
        self::assertSame('Doze mil kwanzas', ValorPorExtensoKwanzas::format(12000));
        self::assertSame('Doze mil e um kwanzas', ValorPorExtensoKwanzas::format(12001));
        self::assertSame('Um kwanza e cinquenta cêntimos', ValorPorExtensoKwanzas::format(1.5));
        self::assertSame('Zero kwanzas', ValorPorExtensoKwanzas::format(0));
    }

    public function test_rejects_negative_values(): void
    {
        $this->expectException(InvalidArgumentException::class);

        ValorPorExtensoKwanzas::format(-1);
    }
}
