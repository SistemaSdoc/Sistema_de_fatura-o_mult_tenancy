<?php

namespace App\Support;

use Illuminate\Support\Collection;

final class GruposDocumentosFiscais
{
    private const GRUPOS_FUNCAO = [
        'Facturação de Vendas' => ['FT', 'FR', 'FG', 'FGR', 'TV', 'AF'],
        'Recebimentos' => ['RC', 'RG', 'ACR'],
        'Correcções e Estornos' => ['NC', 'ND', 'RE'],
        'Adiantamentos e Propostas' => ['FA', 'FP'],
        'Sectoriais' => ['AC', 'FGEN'],
    ];

    private const GRUPOS_IMPACTO = [
        'Facturação Bruta' => ['FT', 'FR', 'FG', 'FGR', 'TV', 'AF'],
        'Recebimentos' => ['RC', 'RG', 'ACR'],
        'Saídas/Reduções' => ['NC', 'RE'],
        'Valores Pendentes' => ['FT', 'FA'],
    ];

    private const TIPOS_PAGOS = ['FR', 'RC', 'RG', 'ACR', 'FGR', 'TV'];
    private const ESTADOS_CANCELADOS = ['cancelado', 'cancelada', 'estornado', 'parcialmente_estornado'];

    public static function porFuncao(array|Collection $porTipo): array
    {
        $porTipo = $porTipo instanceof Collection ? $porTipo->toArray() : $porTipo;
        $resultado = [];
        foreach (self::GRUPOS_FUNCAO as $nome => $tipos) {
            $quantidade = 0;
            foreach ($tipos as $tipo) {
                $quantidade += (int) ($porTipo[$tipo]['quantidade_emitida'] ?? $porTipo[$tipo]['quantidade'] ?? 0);
            }
            $resultado[] = ['grupo' => $nome, 'quantidade' => $quantidade];
        }
        return $resultado;
    }

    public static function impactoFinanceiro(array|Collection $porTipo): array
    {
        $porTipo = $porTipo instanceof Collection ? $porTipo->toArray() : $porTipo;
        $resultado = [];
        foreach (self::GRUPOS_IMPACTO as $nome => $tipos) {
            $valor = 0.0;
            foreach ($tipos as $tipo) {
                $valor += $nome === 'Valores Pendentes'
                    ? (float) ($porTipo[$tipo]['valor_pendente'] ?? 0)
                    : (float) ($porTipo[$tipo]['valor_emitido'] ?? $porTipo[$tipo]['total_liquido'] ?? 0);
            }
            $resultado[] = ['grupo' => $nome, 'valor' => $valor];
        }
        return $resultado;
    }

    public static function porEstado(array|Collection $porTipoEstado): array
    {
        $porTipoEstado = $porTipoEstado instanceof Collection ? $porTipoEstado->toArray() : $porTipoEstado;
        $resultado = [
            'Pagos/Liquidados' => 0,
            'Emitidos/A Receber' => 0,
            'Cancelados/Estornados' => 0,
        ];

        foreach ($porTipoEstado as $tipo => $estados) {
            foreach ($estados as $estado => $quantidade) {
                $estado = strtolower((string) $estado);
                if (in_array($estado, self::ESTADOS_CANCELADOS, true) || $tipo === 'RE') {
                    $grupo = 'Cancelados/Estornados';
                } elseif (in_array($tipo, self::TIPOS_PAGOS, true) || in_array($estado, ['paga', 'pago', 'liquidado'], true)) {
                    $grupo = 'Pagos/Liquidados';
                } else {
                    $grupo = 'Emitidos/A Receber';
                }
                $resultado[$grupo] += (int) $quantidade;
            }
        }

        return array_map(
            fn ($grupo, $quantidade) => ['grupo' => $grupo, 'quantidade' => $quantidade],
            array_keys($resultado),
            array_values($resultado)
        );
    }
}
