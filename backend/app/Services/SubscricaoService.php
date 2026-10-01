<?php

namespace App\Services;

use App\Models\Empresa;
use App\Models\Plano;
use App\Models\Subscricao;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SubscricaoService
{
    /**
     * Atribui o plano Experimental a uma empresa que não tem subscrição ativa.
     * Idempotente — se já tiver, devolve a existente.
     * Nunca rebenta — só loga se o plano não existir.
     */
    public static function atribuirExperimentalSeNaoTiver(
        Empresa $empresa,
        ?string $landlordUserId = null
    ): ?Subscricao {
        // Já tem subscrição ativa? Devolve-a.
        $existente = Subscricao::where('empresa_id', $empresa->id)
            ->where('status', 'ativa')
            ->first();

        if ($existente) {
            return $existente;
        }

        // Procura o plano Experimental
        $plano = Plano::where('nome', 'Experimental')
            ->where('ativo', true)
            ->first();

        if (!$plano) {
            Log::warning('[SubscricaoService] Plano "Experimental" não existe.', [
                'empresa_id' => $empresa->id,
            ]);
            return null;
        }

        $dataInicio = now()->toDateString();
        $dataFim    = now()->addMonths($plano->duracao_meses ?? 1)->toDateString();

        $subscricao = Subscricao::create([
            'id'                   => (string) Str::uuid(),
            'empresa_id'           => $empresa->id,
            'plano_id'             => $plano->id,
            'data_inicio'          => $dataInicio,
            'data_fim'             => $dataFim,
            'status'               => 'ativa',
            'forma_pagamento'      => null,
            'renovacao_automatica' => false,
            'cancelado_em'         => null,
            'criado_por'           => $landlordUserId,
        ]);

        Log::info('[SubscricaoService] Empresa ganhou plano Experimental', [
            'empresa_id'    => $empresa->id,
            'subscricao_id' => $subscricao->id,
            'data_fim'      => $dataFim,
        ]);

        return $subscricao;
    }
}