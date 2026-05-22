<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\SaftService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

class GenerateSaftCommand extends Command
{
    protected $signature = 'saft:generate {tenant} {year} {month}';
    protected $description = 'Gera o ficheiro SAF-T para um tenant, ano e mês específicos';

    public function handle(SaftService $saftService)
    {
        $tenantId = $this->argument('tenant');
        $year     = (int) $this->argument('year');
        $month    = (int) $this->argument('month');

        // 1. Buscar empresa no landlord
        $empresa = Empresa::on('landlord')
            ->where('id', $tenantId)
            ->orWhere('subdomain', $tenantId)
            ->first();

        if (!$empresa) {
            $this->error("Tenant '{$tenantId}' não encontrado.");
            return 1;
        }

        $this->info("Gerando SAF-T para: {$empresa->nome} ({$empresa->subdomain}) - {$year}/{$month}");

        // 2. Configurar conexão tenant manualmente
        Config::set('database.connections.tenant.database', $empresa->db_name);
        DB::purge('tenant');
        DB::reconnect('tenant');
        Config::set('database.default', 'tenant');

        // 3. Chamar o serviço
        try {
            $path = $saftService->generateForEmpresa($empresa, $year, $month);
            $this->info("SAF-T gerado com sucesso: {$path}");
            return 0;
        } catch (\Exception $e) {
            $this->error("Erro: " . $e->getMessage());
            return 1;
        }
    }
}