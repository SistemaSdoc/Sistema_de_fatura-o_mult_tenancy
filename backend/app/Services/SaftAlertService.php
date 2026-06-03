<?php

namespace App\Services;

use App\Models\Empresa;
use Carbon\Carbon;
use Illuminate\Support\Facades\Session;

class SaftAlertService
{
    /**
     * Retorna lista de períodos pendentes com nível de alerta
     * NOTA: Sem tabela de registos, assume-se que NENHUM período foi exportado.
     * Todos os períodos analisados serão considerados pendentes.
     *
     * @param Empresa|null $empresa  Se não for informada, busca da sessão
     * @param int|null $anoAtual
     * @param int|null $mesAtual
     * @return array
     * @throws \Exception
     */
    public function getAlertas(?Empresa $empresa = null, ?int $anoAtual = null, ?int $mesAtual = null): array
    {
        // Se não recebeu a empresa, tenta obter da sessão
        if (!$empresa) {
            $tenantId = Session::get('tenant_id');
            if (!$tenantId) {
                throw new \Exception('Nenhum tenant identificado na sessão.');
            }
            $empresa = Empresa::on('landlord')->find($tenantId);
            if (!$empresa) {
                throw new \Exception('Empresa não encontrada.');
            }
        }

        $anoAtual = $anoAtual ?? now()->year;
        $mesAtual = $mesAtual ?? now()->month;

        // Períodos a verificar: últimos 6 meses + mês atual
        $periodos = [];
        for ($i = 5; $i >= 0; $i--) {
            $mes = $mesAtual - $i;
            $ano = $anoAtual;
            if ($mes <= 0) {
                $mes += 12;
                $ano--;
            }
            $periodos[] = ['ano' => $ano, 'mes' => $mes];
        }

        $alertas = [];
        foreach ($periodos as $p) {
            // ⚠️ SEM TABELA: assume-se que NUNCA foi exportado
            $jaExportado = false;

            $prazo = $this->calcularPrazoFinal($p['ano'], $p['mes']);
            $hoje = now();
            $diasRestantes = $hoje->diffInDays($prazo, false); // negativo se atrasado

            $status = $this->classificarAlerta($jaExportado, $diasRestantes, $prazo);

            // Só mostrar pendentes ou atrasados (nunca será 'success' porque $jaExportado=false)
            if ($status['nivel'] !== 'success') {
                $alertas[] = [
                    'periodo' => "{$p['mes']}/{$p['ano']}",
                    'prazo' => $prazo->format('d/m/Y'),
                    'status' => $status,
                ];
            }
        }

        return $alertas;
    }

    /**
     * Calcula a data limite para entrega do SAF‑T (15 do mês seguinte)
     */
    private function calcularPrazoFinal(int $ano, int $mes): Carbon
    {
        return Carbon::create($ano, $mes, 1)->addMonth()->setDay(15)->endOfDay();
    }

    /**
     * Classifica o nível do alerta baseado no prazo
     */
    private function classificarAlerta(bool $exportado, int $diasRestantes, Carbon $prazo): array
    {
        if ($exportado) {
            return ['nivel' => 'success', 'mensagem' => 'Exportado', 'cor' => 'green'];
        }

        if ($diasRestantes < 0) {
            return [
                'nivel' => 'danger',
                'mensagem' => 'Fora do prazo',
                'cor' => 'red',
                'dias_atraso' => abs($diasRestantes)
            ];
        }

        if ($diasRestantes <= 7) {
            return [
                'nivel' => 'warning',
                'mensagem' => 'Próximo do prazo',
                'cor' => 'orange',
                'dias_restantes' => $diasRestantes
            ];
        }

        return [
            'nivel' => 'info',
            'mensagem' => 'Dentro do prazo',
            'cor' => 'blue',
            'dias_restantes' => $diasRestantes
        ];
    }

public function saftAlertas()
{
    $alertas = (new SaftAlertService())->getAlertas();
    return response()->json(['alertas' => $alertas]);
}
}
