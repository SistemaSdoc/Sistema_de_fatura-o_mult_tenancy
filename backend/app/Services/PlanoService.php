<?php

namespace App\Services;

use App\Models\Empresa;
use App\Models\Subscricao;
use App\Models\Plano;
use App\Models\Feature;
use App\Models\DocumentoFiscal;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PlanoService
{
    /**
     * Obtém a subscrição activa da empresa
     *
     * IMPORTANTE: Subscricao é um modelo de nível LANDLORD.
     * A tabela `subscricoes` tem foreign keys para `empresas`, `planos`
     * e `users_landlord`, que só existem no banco landlord. Por isso
     * esta consulta usa SEMPRE a conexão 'landlord', independentemente
     * do modo (colectivo/singular) da empresa.
     *
     * @param string $empresaId
     * @param string $modo 'colectivo' ou 'singular' (mantido apenas para logging/compatibilidade)
     */
    public function getSubscricaoAtiva($empresaId, $modo = 'colectivo')
    {
        Log::debug('[PlanoService::getSubscricaoAtiva] Buscando subscrição ativa', [
            'empresa_id' => $empresaId,
            'modo' => $modo,
        ]);

        $subscricao = Subscricao::on('landlord')
            ->where('empresa_id', $empresaId)
            ->where('status', 'ativa')
            ->where('data_inicio', '<=', now())
            ->where('data_fim', '>=', now())
            ->first();

        if ($subscricao) {
            Log::info('[PlanoService::getSubscricaoAtiva] Subscrição encontrada', [
                'empresa_id' => $empresaId,
                'subscricao_id' => $subscricao->id,
                'plano_id' => $subscricao->plano_id,
                'conexao' => 'landlord',
            ]);
        } else {
            Log::info('[PlanoService::getSubscricaoAtiva] Nenhuma subscrição ativa encontrada', [
                'empresa_id' => $empresaId,
                'conexao' => 'landlord',
            ]);
        }

        return $subscricao;
    }

    /**
     * Obtém o limite de uma feature para a empresa
     * Retorna: int (limite) ou null (ilimitado)
     */
    public function getLimiteFeature($empresaId, $featureNome, $modo = 'colectivo')
    {
        $cacheKey = "plano_feature_{$empresaId}_{$featureNome}_{$modo}";

        Log::debug('[PlanoService::getLimiteFeature] Iniciando', [
            'empresa_id' => $empresaId,
            'feature_nome' => $featureNome,
            'modo' => $modo,
            'cache_key' => $cacheKey,
        ]);

        return Cache::remember($cacheKey, 3600, function () use ($empresaId, $featureNome, $modo) {
            Log::debug('[PlanoService::getLimiteFeature] Cache miss, calculando...', [
                'empresa_id' => $empresaId,
                'feature_nome' => $featureNome,
                'modo' => $modo,
            ]);

            $subscricao = $this->getSubscricaoAtiva($empresaId, $modo);
            if (!$subscricao) {
                Log::warning('[PlanoService::getLimiteFeature] Sem subscrição ativa, retornando 0', [
                    'empresa_id' => $empresaId,
                    'feature_nome' => $featureNome,
                ]);
                return 0;
            }

            // O relacionamento plano() do modelo Subscricao (landlord) deve
            // resolver Plano também na conexão landlord.
            $plano = $subscricao->plano;
            if (!$plano) {
                Log::warning('[PlanoService::getLimiteFeature] Plano não encontrado', [
                    'empresa_id' => $empresaId,
                    'plano_id' => $subscricao->plano_id,
                ]);
                return 0;
            }

            // Busca a feature
            $feature = Feature::where('nome', $featureNome)->first();
            if (!$feature) {
                Log::warning('[PlanoService::getLimiteFeature] Feature não encontrada', [
                    'feature_nome' => $featureNome,
                ]);
                return 0;
            }

            // Obtém a quantidade da feature no plano
            $pivot = $plano->features()->where('feature_id', $feature->id)->first();
            if (!$pivot) {
                Log::warning('[PlanoService::getLimiteFeature] Feature não associada ao plano', [
                    'plano_id' => $plano->id,
                    'feature_id' => $feature->id,
                ]);
                return 0;
            }

            $quantidade = $pivot->pivot->quantidade;
            $resultado = $quantidade == -1 ? null : (int) $quantidade;

            Log::info('[PlanoService::getLimiteFeature] Resultado', [
                'empresa_id' => $empresaId,
                'feature_nome' => $featureNome,
                'quantidade' => $quantidade,
                'resultado' => $resultado,
            ]);

            return $resultado;
        });
    }

    /**
     * Obtém o número de utilizadores permitidos
     */
    public function getLimiteUtilizadores($empresaId, $modo = 'colectivo')
    {
        return $this->getLimiteFeature($empresaId, 'Utilizadores', $modo);
    }

    /**
     * Obtém o limite de facturas (mês actual)
     */
    public function getLimiteFacturas($empresaId, $modo = 'colectivo')
    {
        return $this->getLimiteFeature($empresaId, 'Facturação ilimitada', $modo);
    }

    /**
     * Verifica se a empresa tem permissão para uma feature (booleana)
     */
    public function temFeature($empresaId, $featureNome, $modo = 'colectivo')
    {
        $limite = $this->getLimiteFeature($empresaId, $featureNome, $modo);
        return $limite > 0;
    }

    /**
     * Verifica se a empresa pode realizar uma acção baseada num limite
     */
    public function podeRealizar($empresaId, $featureNome, callable $contador, $modo = 'colectivo')
    {
        $limite = $this->getLimiteFeature($empresaId, $featureNome, $modo);

        if ($limite === null) {
            return true;
        }

        if ($limite == 0) {
            return false;
        }

        $usados = $contador();
        return $usados < $limite;
    }

    // Métodos de contagem (já existentes)
    public function contarDocumentosMes($empresaId, $modo = 'colectivo')
    {
        // A implementação depende do modelo DocumentoFiscal
        // Vamos assumir que existe um serviço ou modelo apropriado
        $connection = $modo === 'colectivo' ? 'shared' : 'tenant';
        // Usar DocumentoFiscal com a conexão correcta
        // ... (adaptar conforme necessário)
    }

    /**
     * Conta utilizadores da empresa.
     *
     * NOTA: Diferente de Subscricao, os utilizadores (Shared\User /
     * Tenant\User) SÃO dados por modo — no modo colectivo residem no
     * banco `shared`, no modo singular residem no banco `tenant`.
     * Por isso este método mantém a lógica baseada em `$modo`.
     */
    public function contarUtilizadores($empresaId, $apenasAtivos = true, $modo = 'colectivo')
    {
        $connection = $modo === 'colectivo' ? 'shared' : 'tenant';
        $model = $modo === 'colectivo' ? SharedUser::class : TenantUser::class;

        $query = $model::on($connection)
            ->where('empresa_id', $empresaId);

        if ($apenasAtivos) {
            $query->where('ativo', true);
        }

        return $query->count();
    }
}