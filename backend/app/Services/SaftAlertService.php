<?php

namespace App\Services;

use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Carbon\Carbon;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

/**
 * SaftAlertService
 *
 * ✅ SUPORTA AMBOS OS MODOS:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 *
 * Gerencia alertas de períodos pendentes para exportação SAF-T (Angola)
 * 
 * NOTA: Sem tabela de registos de exportação, assume-se que NENHUM período foi exportado.
 * Todos os períodos analisados serão considerados pendentes.
 */
class SaftAlertService
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct()
    {
        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[SaftAlertService] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
    }

    /* =====================================================================
     | HELPERS
     | ================================================================== */

    protected function getModo(): string
    {
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        return $this->modo;
    }

    protected function getEmpresa(): ?Empresa
    {
        if (!$this->empresa) {
            $this->empresa = app('current.empresa');
        }
        return $this->empresa;
    }

    protected function getUser(): ?object
    {
        return $this->tenantUser;
    }

    protected function isColectivo(): bool
    {
        return $this->getModo() === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->getModo() === 'singular';
    }

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO - CORRIGIDA ✅
     | ================================================================== */

    /**
     * Verifica se o usuário tem acesso ao tenant atual
     */
    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[SaftAlertService] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[SaftAlertService] Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        // ✅ Atualiza o modo
        $this->modo = $this->empresa->modo ?? 'colectivo';

        // 2️⃣ Obtém o landlord user (guard onde o login foi feito)
        $landlordUser = Auth::guard('landlord')->user();

        // 3️⃣ Fallback: tenta obter da sessão
        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = LandlordUser::find($landlordId);
            }
        }

        if (!$landlordUser) {
            Log::error('[SaftAlertService] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[SaftAlertService] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[SaftAlertService] Acesso verificado com sucesso', [
            'modo' => $this->modo,
            'user_id' => $tenantUser->id,
            'email' => $tenantUser->email,
        ]);
    }

    /**
     * Busca usuário no banco correto
     */
    protected function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        }
        return SharedUser::on('shared')
            ->where('email', $email)
            ->where('tenant_id', $empresa->id)
            ->first();
    }

    /**
     * Obtém o user_id do tenantUser
     */
    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    /**
     * Obtém a empresa correta (da sessão ou do contexto)
     */
    protected function obterEmpresa(?Empresa $empresa = null): Empresa
    {
        // Se já foi passada uma empresa, usa ela
        if ($empresa) {
            return $empresa;
        }

        // Tenta obter do contexto atual
        if ($this->empresa) {
            return $this->empresa;
        }

        // Fallback: tenta da sessão
        $tenantId = Session::get('tenant_id');
        if ($tenantId) {
            $empresa = Empresa::on('landlord')->find($tenantId);
            if ($empresa) {
                $this->empresa = $empresa;
                $this->modo = $empresa->modo ?? 'colectivo';
                return $empresa;
            }
        }

        throw new \Exception('Nenhum tenant identificado.');
    }

    /**
     * Obtém o ID do tenant para uso em queries
     */
    protected function getTenantId(): ?string
    {
        if ($this->empresa) {
            return $this->empresa->id;
        }

        return Session::get('tenant_id');
    }

    /* =====================================================================
     | MÉTODO PRINCIPAL
     | ================================================================== */

    /**
     * Retorna lista de períodos pendentes com nível de alerta
     *
     * @param Empresa|null $empresa  Se não for informada, busca do contexto
     * @param int|null $anoAtual
     * @param int|null $mesAtual
     * @return array
     * @throws \Exception
     */
    public function getAlertas(?Empresa $empresa = null, ?int $anoAtual = null, ?int $mesAtual = null): array
    {
        // ⭐ VERIFICAR ACESSO
        $this->verificarAcessoUsuario();

        // ⭐ OBTER EMPRESA CORRETA
        $empresa = $this->obterEmpresa($empresa);
        $modo = $this->getModo();

        Log::info('[SAFT Alert Service] Gerando alertas', [
            'empresa_id' => $empresa->id,
            'empresa_nome' => $empresa->nome,
            'modo' => $modo,
            'ano' => $anoAtual,
            'mes' => $mesAtual,
        ]);

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
            // ⭐ VERIFICAR SE JÁ FOI EXPORTADO (se houver tabela de registos)
            $jaExportado = $this->verificarExportacao($p['ano'], $p['mes']);

            $prazo = $this->calcularPrazoFinal($p['ano'], $p['mes']);
            $hoje = now();
            $diasRestantes = $hoje->diffInDays($prazo, false);

            $status = $this->classificarAlerta($jaExportado, $diasRestantes, $prazo);

            // Só mostrar pendentes ou atrasados
            if ($status['nivel'] !== 'success') {
                $alertas[] = [
                    'periodo' => "{$p['mes']}/{$p['ano']}",
                    'ano' => $p['ano'],
                    'mes' => $p['mes'],
                    'prazo' => $prazo->format('d/m/Y'),
                    'status' => $status,
                    'exportado' => $jaExportado,
                    'modo' => $modo,
                ];
            }
        }

        Log::info('[SAFT Alert Service] Alertas gerados', [
            'empresa_id' => $empresa->id,
            'total_alertas' => count($alertas),
            'modo' => $modo,
        ]);

        return [
            'empresa' => [
                'id' => $empresa->id,
                'nome' => $empresa->nome,
                'nif' => $empresa->nif,
                'modo' => $modo,
            ],
            'alertas' => $alertas,
            'resumo' => [
                'total_periodos' => count($periodos),
                'pendentes' => count($alertas),
                'exportados' => count($periodos) - count($alertas),
            ],
        ];
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS
     | ================================================================== */

    /**
     * Verifica se um período já foi exportado.
     * 
     * ⭐ ADAPTADO PARA AMBOS OS MODOS
     * 
     * NOTA: Como não há tabela de registos, retorna false (nunca exportado).
     * Se houver uma tabela 'saft_exportacoes', descomente o código abaixo.
     */
    private function verificarExportacao(int $ano, int $mes): bool
    {
        // ⭐ SE NÃO HOUVER TABELA, RETORNA FALSE (NUNCA EXPORTADO)
        // TODO: Quando criar a tabela 'saft_exportacoes', implementar a verificação

        /*
        // 🔽 DESCOMENTE QUANDO CRIAR A TABELA 'saft_exportacoes'
        try {
            if ($this->isColectivo()) {
                return \App\Models\Shared\SaftExportacao::doTenant()
                    ->where('ano', $ano)
                    ->where('mes', $mes)
                    ->where('status', 'sucesso')
                    ->exists();
            } else {
                return \App\Models\Tenant\SaftExportacao::where('ano', $ano)
                    ->where('mes', $mes)
                    ->where('status', 'sucesso')
                    ->exists();
            }
        } catch (\Exception $e) {
            Log::warning('[SAFT Alert] Erro ao verificar exportação:', [
                'ano' => $ano,
                'mes' => $mes,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
        */

        return false;
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
            return [
                'nivel' => 'success',
                'mensagem' => '✅ Exportado',
                'cor' => 'green',
                'icone' => '✓',
            ];
        }

        if ($diasRestantes < 0) {
            return [
                'nivel' => 'danger',
                'mensagem' => '🚨 Fora do prazo',
                'cor' => 'red',
                'icone' => '✗',
                'dias_atraso' => abs($diasRestantes),
            ];
        }

        if ($diasRestantes <= 7) {
            return [
                'nivel' => 'warning',
                'mensagem' => '⚠️ Próximo do prazo',
                'cor' => 'orange',
                'icone' => '!',
                'dias_restantes' => $diasRestantes,
            ];
        }

        if ($diasRestantes <= 15) {
            return [
                'nivel' => 'info',
                'mensagem' => 'ℹ️ Dentro do prazo',
                'cor' => 'blue',
                'icone' => 'ℹ',
                'dias_restantes' => $diasRestantes,
            ];
        }

        return [
            'nivel' => 'info',
            'mensagem' => '✓ Dentro do prazo',
            'cor' => 'green',
            'icone' => '✓',
            'dias_restantes' => $diasRestantes,
        ];
    }

    /* =====================================================================
     | MÉTODOS ADICIONAIS
     | ================================================================== */

    /**
     * Retorna apenas alertas críticos (fora do prazo ou próximos)
     */
    public function getAlertasCriticos(?Empresa $empresa = null): array
    {
        $modo = $this->getModo();
        
        try {
            $dados = $this->getAlertas($empresa);
            
            $alertasCriticos = array_filter($dados['alertas'], function ($alerta) {
                return in_array($alerta['status']['nivel'], ['danger', 'warning']);
            });

            return [
                'empresa' => $dados['empresa'],
                'alertas' => array_values($alertasCriticos),
                'resumo' => [
                    'total' => count($alertasCriticos),
                    'danger' => count(array_filter($alertasCriticos, fn($a) => $a['status']['nivel'] === 'danger')),
                    'warning' => count(array_filter($alertasCriticos, fn($a) => $a['status']['nivel'] === 'warning')),
                ],
                'modo' => $modo,
            ];
        } catch (\Exception $e) {
            Log::error('[SaftAlertService] Erro ao buscar alertas críticos:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return [
                'empresa' => null,
                'alertas' => [],
                'resumo' => ['total' => 0, 'danger' => 0, 'warning' => 0],
                'modo' => $modo,
            ];
        }
    }

    /**
     * Retorna o próximo período a vencer
     */
    public function getProximoVencimento(?Empresa $empresa = null): ?array
    {
        $modo = $this->getModo();
        
        try {
            $dados = $this->getAlertas($empresa);
            
            if (empty($dados['alertas'])) {
                return null;
            }

            // Ordenar por prazo (mais próximo primeiro)
            usort($dados['alertas'], function ($a, $b) {
                return strtotime($a['prazo']) - strtotime($b['prazo']);
            });

            $proximo = $dados['alertas'][0];
            $proximo['modo'] = $modo;
            return $proximo;
        } catch (\Exception $e) {
            Log::error('[SaftAlertService] Erro ao buscar próximo vencimento:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return null;
        }
    }

    /**
     * Resumo rápido para dashboard
     */
    public function getResumoRapido(?Empresa $empresa = null): array
    {
        $modo = $this->getModo();
        
        try {
            $dados = $this->getAlertas($empresa);
            
            $totalPendentes = count($dados['alertas']);
            $emAtraso = count(array_filter($dados['alertas'], fn($a) => $a['status']['nivel'] === 'danger'));
            $proximos = count(array_filter($dados['alertas'], fn($a) => $a['status']['nivel'] === 'warning'));

            return [
                'modo' => $modo,
                'empresa' => $dados['empresa'],
                'total_pendentes' => $totalPendentes,
                'em_atraso' => $emAtraso,
                'proximos_vencer' => $proximos,
                'ultimo_vencimento' => $this->getProximoVencimento($empresa),
            ];
        } catch (\Exception $e) {
            Log::error('[SaftAlertService] Erro ao buscar resumo rápido:', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return [
                'modo' => $modo,
                'empresa' => null,
                'total_pendentes' => 0,
                'em_atraso' => 0,
                'proximos_vencer' => 0,
                'ultimo_vencimento' => null,
            ];
        }
    }
}