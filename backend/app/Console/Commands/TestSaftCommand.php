<?php

namespace App\Console\Commands;

use App\Services\SaftService;
use Illuminate\Console\Command;

class TestSaftCommand extends Command
{
    protected $signature = 'saft:test {year} {month}';
    protected $description = 'Gera um SAF-T de teste isidro (apenas cabeçalho) para o mês/ano indicado';

    public function handle(SaftService $saftService)
    {
        $year = $this->argument('year');
        $month = $this->argument('month');

        $this->info("A gerar SAF-T de teste para {$month}/{$year}...");
        $path = $saftService->generateHeaderOnly((int)$year, (int)$month);
        $this->info("Ficheiro criado em: {$path}");
    }
}