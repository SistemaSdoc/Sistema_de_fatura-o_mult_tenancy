<?php

namespace Tests\Unit;

use App\Services\DocumentoFiscalService;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

class NotaDebitoTest extends TestCase
{
    public function test_metodo_dinheiro_emite_rc_e_outros_metodos_emitem_rg(): void
    {
        $service = (new ReflectionClass(DocumentoFiscalService::class))->newInstanceWithoutConstructor();
        $tipoRecibo = new ReflectionMethod(DocumentoFiscalService::class, 'tipoReciboPorMetodo');

        self::assertSame('RC', $tipoRecibo->invoke($service, 'dinheiro'));
        self::assertSame('RG', $tipoRecibo->invoke($service, 'transferencia'));
        self::assertSame('RG', $tipoRecibo->invoke($service, 'multibanco'));
        self::assertSame('RG', $tipoRecibo->invoke($service, 'cheque'));
        self::assertSame('RG', $tipoRecibo->invoke($service, 'cartao'));
    }

    public function test_estornos_parciais_acumulam_ate_ao_valor_total_do_recibo(): void
    {
        $service = (new ReflectionClass(DocumentoFiscalService::class))->newInstanceWithoutConstructor();
        $valorDisponivel = new ReflectionMethod(DocumentoFiscalService::class, 'calcularValorDisponivelEstorno');
        $estadoRecibo = new ReflectionMethod(DocumentoFiscalService::class, 'estadoReciboAposEstorno');

        self::assertSame(6000.0, $valorDisponivel->invoke($service, 10000.0, 4000.0));
        self::assertSame('parcialmente_estornado', $estadoRecibo->invoke($service, 10000.0, 7000.0));
        self::assertSame('estornado', $estadoRecibo->invoke($service, 10000.0, 10000.0));
        self::assertSame(0.0, $valorDisponivel->invoke($service, 10000.0, 12000.0));
    }

    public function test_nota_debito_ligada_referencia_ft_sem_alterar_o_valor_ou_estado(): void
    {
        $fatura = new class
        {
            public string $id = 'fatura-id';

            public string $tipo_documento = 'FT';

            public string $estado = 'emitido';

            public string $data_emissao;

            public string $numero_documento = 'FT A/1';

            public string $cliente_id = 'cliente-id';

            public ?string $cliente_nome = null;

            public ?string $cliente_nif = null;

            public float $total_liquido = 1000.0;

            public array $updates = [];

            public function update(array $attributes): void
            {
                $this->updates[] = $attributes;
                foreach ($attributes as $key => $value) {
                    $this->{$key} = $value;
                }
            }
        };
        $fatura->data_emissao = Carbon::now('Africa/Luanda')->toDateString();

        $service = new class extends DocumentoFiscalService
        {
            public array $dadosEmitidos = [];

            public function __construct() {}

            protected function verificarAcessoUsuario(): void {}

            public function emitirDocumento(array $dados)
            {
                $this->dadosEmitidos = $dados;

                return new class
                {
                    public function load(...$relations): self
                    {
                        return $this;
                    }
                };
            }
        };

        $service->criarNotaDebito($fatura, [
            'itens' => [[
                'descricao' => 'Serviço adicional',
                'quantidade' => 1,
                'preco_unitario' => 250,
                'eh_servico' => true,
            ]],
        ]);

        self::assertSame('fatura-id', $service->dadosEmitidos['fatura_id']);
        self::assertSame('cliente-id', $service->dadosEmitidos['cliente_id']);
        self::assertSame(1000.0, $fatura->total_liquido);
        self::assertSame('emitido', $fatura->estado);
        self::assertSame([], $fatura->updates);
    }

    public function test_nota_debito_tem_iva_zero_mesmo_com_taxa_iva_informada(): void
    {
        $processarItens = new ReflectionMethod(DocumentoFiscalService::class, 'processarItens');
        $service = (new ReflectionClass(DocumentoFiscalService::class))->newInstanceWithoutConstructor();

        $totais = $processarItens->invoke(
            $service,
            [[
                'descricao' => 'Serviço adicional',
                'quantidade' => 1,
                'preco_unitario' => 1000,
                'taxa_iva' => 14,
            ]],
            true,
            'geral',
            null,
            'ND'
        );

        self::assertSame(0.0, $totais['iva']);
        self::assertSame(0.0, $totais['itens_processados'][0]['taxa_iva']);
        self::assertSame(1000.0, $totais['liquido']);
    }
}
