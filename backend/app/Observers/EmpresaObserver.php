<?php

namespace App\Observers;

use App\Models\Empresa;
use App\Services\SubscricaoService;

class EmpresaObserver
{
    /**
     * Quando uma empresa é criada, atribui automaticamente o Experimental
     * se ela não tiver já uma subscrição ativa.
     */
    public function created(Empresa $empresa): void
    {
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