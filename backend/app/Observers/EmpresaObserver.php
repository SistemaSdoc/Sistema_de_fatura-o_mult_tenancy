<?php

namespace App\Observers;

use App\Models\Empresa;
use App\Services\SubscricaoService;
use Illuminate\Support\Facades\Log;

class EmpresaObserver
{
    /**
     * Quando uma empresa é criada, atribui automaticamente o Experimental
     * se ela não tiver já uma subscrição ativa.
     *
     *   Se o controller tiver ativado a flag $skipExperimental,
     *    não cria nada — porque o controller vai criar a subscrição
     *    com o plano que o utilizador escolheu.
     */
    public function created(Empresa $empresa): void
    {
        //  Se o controller pediu para não criar, respeita e sai
        if (SubscricaoService::$skipExperimental) {
            Log::info('[EmpresaObserver] Experimental ignorado (flag skipExperimental ativa)', [
                'empresa_id' => $empresa->id,
                'motivo'     => 'controller vai criar a subscrição com o plano escolhido',
            ]);
            return;
        }

        $landlordUserId = null;

        try {
            $landlordUserId = auth('landlord_api')->id()
                ?? auth('landlord')->id()
                ?? null;
        } catch (\Throwable $e) {
            // silencioso — não é crítico
        }

        SubscricaoService::atribuirExperimentalSeNaoTiver($empresa, $landlordUserId);
    }
}