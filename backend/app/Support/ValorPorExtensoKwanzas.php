<?php

namespace App\Support;

use InvalidArgumentException;

class ValorPorExtensoKwanzas
{
    private const UNIDADES = [
        'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
        'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete',
        'dezoito', 'dezanove',
    ];

    private const DEZENAS = [
        2 => 'vinte', 3 => 'trinta', 4 => 'quarenta', 5 => 'cinquenta',
        6 => 'sessenta', 7 => 'setenta', 8 => 'oitenta', 9 => 'noventa',
    ];

    private const GRUPOS = [
        1 => ['mil', 'mil'],
        2 => ['milhão', 'milhões'],
        3 => ['bilião', 'biliões'],
        4 => ['trilião', 'triliões'],
        5 => ['quadrilião', 'quadriliões'],
    ];

    private const CENTENAS = [
        2 => 'duzentos', 3 => 'trezentos', 4 => 'quatrocentos',
        5 => 'quinhentos', 6 => 'seiscentos', 7 => 'setecentos',
        8 => 'oitocentos', 9 => 'novecentos',
    ];

    public static function format(float $valor): string
    {
        if (!is_finite($valor) || $valor < 0) {
            throw new InvalidArgumentException('O valor monetário deve ser finito e não negativo.');
        }

        $centimosTotais = (int) round($valor * 100);
        $kwanzas = intdiv($centimosTotais, 100);
        $centimos = $centimosTotais % 100;

        $texto = self::numeroPorExtenso($kwanzas)
            . ($kwanzas === 1 ? ' kwanza' : ' kwanzas');

        if ($centimos > 0) {
            $texto .= ' e ' . self::numeroPorExtenso($centimos)
                . ($centimos === 1 ? ' cêntimo' : ' cêntimos');
        }

        return ucfirst($texto);
    }

    private static function numeroPorExtenso(int $numero): string
    {
        if ($numero < 1000) {
            return self::centenaPorExtenso($numero);
        }

        $grupoFinal = $numero % 1000;
        $grupos = [];
        $indice = 0;
        while ($numero > 0) {
            $grupo = $numero % 1000;
            if ($grupo > 0) {
                if ($indice === 0) {
                    $grupos[] = self::centenaPorExtenso($grupo);
                } elseif ($indice === 1 && $grupo === 1) {
                    $grupos[] = 'mil';
                } else {
                    $nomesGrupo = self::GRUPOS[$indice] ?? null;
                    if ($nomesGrupo === null) {
                        throw new InvalidArgumentException('O valor excede o limite suportado para conversão por extenso.');
                    }

                    $grupos[] = self::centenaPorExtenso($grupo) . ' '
                        . $nomesGrupo[$grupo === 1 ? 0 : 1];
                }
            }

            $numero = intdiv($numero, 1000);
            $indice++;
        }

        $grupos = array_reverse($grupos);
        $texto = implode(' ', $grupos);

        if (count($grupos) > 1 && $grupoFinal <= 100) {
            $ultimoGrupo = array_pop($grupos);
            return implode(' ', $grupos) . ' e ' . $ultimoGrupo;
        }

        return $texto;
    }

    private static function centenaPorExtenso(int $numero): string
    {
        if ($numero < 20) {
            return self::UNIDADES[$numero];
        }

        if ($numero < 100) {
            $dezena = intdiv($numero, 10);
            $unidade = $numero % 10;

            return self::DEZENAS[$dezena]
                . ($unidade > 0 ? ' e ' . self::UNIDADES[$unidade] : '');
        }

        $centena = intdiv($numero, 100);
        $resto = $numero % 100;
        $nomeCentena = $numero === 100
            ? 'cem'
            : ($centena === 1 ? 'cento' : self::CENTENAS[$centena]);

        return $nomeCentena . ($resto > 0 ? ' e ' . self::centenaPorExtenso($resto) : '');
    }
}
