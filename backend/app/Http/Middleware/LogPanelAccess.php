<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;

class LogPanelAccess
{
    public function handle(Request $request, Closure $next)
    {
        AuditLogger::log('Painel Acessado', null, [
            'area' => optional($request->route())->getName() ?? 'Geral',
        ]);

        return $next($request);
    }
}