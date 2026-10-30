<?php

namespace Tests\Unit;

use App\Services\DocumentoFiscalService;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

class RetencaoAutoFacturacaoTest extends TestCase
{
    public function test_withholding_reduces_the_amount_paid_to_the_supplier(): void
    {
        $processarItens = new ReflectionMethod(DocumentoFiscalService::class, 'processarItens');
        $service = (new ReflectionClass(DocumentoFiscalService::class))->newInstanceWithoutConstructor();
        $totais = $processarItens->invoke(
            $service,
            [[
                'descricao' => 'Produto agrícola',
                'quantidade' => 1,
                'preco_unitario' => 12000,
                'taxa_iva' => 0,
            ]],
            false,
            'geral',
            6.5
        );

        self::assertSame(780.0, $totais['retencao']);
        self::assertSame(11220.0, $totais['liquido']);
        self::assertSame(11220.0, $totais['itens_processados'][0]['total_linha']);
    }
}
