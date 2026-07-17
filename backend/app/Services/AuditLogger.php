<?php

namespace App\Services;

use Jenssegers\Agent\Agent;
use Stevebauman\Location\Facades\Location;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Throwable;

class AuditLogger
{
    /**
     * Regista uma linha de auditoria.
     *
     * IMPORTANTE: nunca deve lançar exceção — se algo falhar (geolocalização
     * indisponível, IP inválido, etc.), a ação principal (venda, pagamento,
     * documento) NÃO pode ser interrompida por causa do log.
     *
     * @param string $acao   Ex: "Venda Criada", "Documento Cancelado"
     * @param string|null $emoji  
     * @param array  $extra  ['area' => 'Vendas', ...]
     */
    public static function log(string $acao, ?string $emoji = '📂', array $extra = []): void
    {
        try {
            $ip = request()->ip() ?? 'N/A';
            $user = Auth::user();
            $now = Carbon::now(config('app.timezone', 'Europe/Lisbon'));

            $agent = new Agent();
            $sistemaOperativo = $agent->platform() ?: 'Desconhecido';
            $navegador = $agent->browser() ?: 'Desconhecido';
            $dispositivo = $agent->isDesktop() ? 'Computer' : ($agent->isTablet() ? 'Tablet' : 'Mobile');

            $localizacao = self::resolverLocalizacao($ip);

            $area = $extra['area'] ?? 'N/A';
            $detalhes = $extra['detalhes'] ?? [];
            $url = request()->fullUrl();
            $detalhesFormatados = self::formatarDetalhes($detalhes);
            $detalhesTexto = $detalhesFormatados !== '' ? " | Detalhes: {$detalhesFormatados}" : '';

            $mensagem = sprintf(
                "%s: Usuário: %s | Data/Hora: %s || %s | Área Atual: %s | URL: %s | IP: %s | Sistema Operativo: %s | Navegador: %s | Dispositivo: %s | Localização: %s%s",
                $acao,
                $user ? $user->name : 'Convidado',
                $now->format('H:i:s'),
                $now->format('d-m-Y'),
                $area ?: 'N/A',
                $url,
                $ip,
                $sistemaOperativo,
                $navegador,
                $dispositivo,
                $localizacao,
                $detalhesTexto
            );

            Log::channel('auditoria')->info($mensagem);
        } catch (Throwable $e) {
            // Nunca deixa o log derrubar a operação principal.
            // Regista o problema num canal separado (ou no log padrão) para investigação.
            report($e);
        }
    }

    private static function formatarDetalhes(mixed $detalhes): string
    {
        if (empty($detalhes)) {
            return '';
        }

        if (!is_array($detalhes)) {
            return (string) $detalhes;
        }

        $partes = [];

        foreach ($detalhes as $chave => $valor) {
            if (is_array($valor)) {
                $valor = json_encode($valor, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } elseif (is_bool($valor)) {
                $valor = $valor ? 'true' : 'false';
            } elseif ($valor === null) {
                $valor = 'null';
            }

            $nome = str_replace('_', ' ', (string) $chave);
            $partes[] = sprintf('%s=%s', $nome, $valor);
        }

        return implode(' | ', $partes);
    }

    /**
     * Resolve a localização a partir do IP, com proteção contra:
     * - IPs locais/privados (não têm geolocalização real)
     * - Falha ou indisponibilidade do serviço de geolocalização
     */
    private static function resolverLocalizacao(string $ip): string
    {
        // IPs locais/privados: não vale a pena chamar o serviço externo
        if (in_array($ip, ['127.0.0.1', '::1']) || self::isIpPrivado($ip)) {
            return 'Rede Local';
        }

        try {
            $location = Location::get($ip);

            if ($location && $location->cityName) {
                return "{$location->cityName}, {$location->regionName}, {$location->countryName}";
            }
        } catch (Throwable $e) {
            // Serviço de geolocalização indisponível/timeout — não propaga o erro
        }

        return 'Desconhecida';
    }

    private static function isIpPrivado(string $ip): bool
    {
        return !filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
    }
}
