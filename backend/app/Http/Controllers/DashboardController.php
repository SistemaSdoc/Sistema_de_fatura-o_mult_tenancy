<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\DashboardService;

class DashboardController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function index()
    {
        $user = Auth::user();

        // Obtem todos os dados do dashboard via service
        $dashboardData = $this->dashboardService->getDashboard();

        return response()->json([
            'message' => 'Dashboard carregado com sucesso',
            'dados' => array_merge([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role
                ]
            ], $dashboardData)
        ]);
    }
}
