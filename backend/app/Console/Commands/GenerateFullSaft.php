<?php

namespace App\Console\Commands;

use App\Services\SaftService;
use Illuminate\Console\Command;

class GenerateFullSaft extends Command
{
    protected $signature = 'saft:full {year} {month}';
    protected $description = 'Gera SAF-T completo (Header + Clientes) para o período';

    public function handle(SaftService $saftService)
    {
        $year = $this->argument('year');
        $month = $this->argument('month');

        $this->info("A gerar SAF-T completo para {$month}/{$year}...");
        $path = $saftService->generateFull((int)$year, (int)$month);
        $this->info("Ficheiro gerado: {$path}");
    }
}