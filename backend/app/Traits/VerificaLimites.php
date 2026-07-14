<?php

namespace App\Traits;

use App\Services\PlanoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

trait VerificaLimites
{
    /**
     * Verifica se a empresa tem uma feature (booleana)
     */
    protected function verificarFeature(string $featureNome, string $mensagem = null): bool
    {
        $empresa = app('current.empresa');
        if (!$empresa) {
            Log::error('[VerificaLimites::verificarFeature] Empresa não identificada');
            throw new \Exception('Empresa não identificada.', 403);
        }
        $empresaId = $empresa->id;

        $planoService = app(PlanoService::class);

        if (!$planoService->temFeature($empresaId, $featureNome)) {
            $mensagem = $mensagem ?? "A sua empresa não tem permissão para aceder a esta funcionalidade. Contacte o suporte para mais informações.";
            Log::warning('[VerificaLimites::verificarFeature] Feature não permitida', [
                'empresa_id' => $empresaId,
                'feature_nome' => $featureNome,
            ]);
            throw new \Exception($mensagem, 403);
        }

        return true;
    }

    /**
     * Verifica se a empresa pode realizar uma acção com limite
     */
    protected function verificarLimite(string $featureNome, callable $contador, string $mensagem = null): bool
    {
        $empresa = app('current.empresa');
        if (!$empresa) {
            Log::error('[VerificaLimites::verificarLimite] Empresa não identificada');
            throw new \Exception('Empresa não identificada.', 403);
        }
        $empresaId = $empresa->id;

        Log::debug('[VerificaLimites::verificarLimite] Verificando limite', [
            'empresa_id' => $empresaId,
            'feature_nome' => $featureNome,
        ]);

        $planoService = app(PlanoService::class);

        $pode = $planoService->podeRealizar($empresaId, $featureNome, $contador);
        if (!$pode) {
            $limite = $planoService->getLimiteFeature($empresaId, $featureNome);
            $mensagem = $mensagem ?? "Limite de {$featureNome} atingido. O seu plano permite até {$limite}.";
            Log::warning('[VerificaLimites::verificarLimite] Limite atingido', [
                'empresa_id' => $empresaId,
                'feature_nome' => $featureNome,
                'limite' => $limite,
            ]);
            throw new \Exception($mensagem, 403);
        }

        Log::info('[VerificaLimites::verificarLimite] Limite verificado com sucesso', [
            'empresa_id' => $empresaId,
            'feature_nome' => $featureNome,
        ]);

        return true;
    }

    /**
     * Obtém o limite de uma feature (para exibição)
     */
    protected function getLimite(string $featureNome): ?int
    {
        $empresa = app('current.empresa');
        if (!$empresa) {
            return null;
        }
        $empresaId = $empresa->id;
        return app(PlanoService::class)->getLimiteFeature($empresaId, $featureNome);
    }
}