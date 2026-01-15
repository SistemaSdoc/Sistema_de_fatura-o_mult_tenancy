<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
protected function redirectTo($request)
{
    if (! $request->expectsJson()) {

        // Se estiver em um subdomínio (tenant)
        if (str_contains($request->getHost(), '.localhost')) {
            return 'http://localhost:8000/login';
        }

        // Fallback
        return route('login');
    }
}

}
