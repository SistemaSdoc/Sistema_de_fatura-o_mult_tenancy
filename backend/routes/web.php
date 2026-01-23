<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiAuthController;
/*
|--------------------------------------------------------------------------
| AUTH (Sanctum + Cookies)
|--------------------------------------------------------------------------
*/
Route::get('/sanctum/csrf-cookie', function () {
    return response()->json(['csrf' => true]);
});

Route::post('/login', [ApiAuthController::class, 'login']);
Route::post('/logout', [ApiAuthController::class, 'logout']);
Route::get('/me', [ApiAuthController::class, 'me'])->middleware('auth:sanctum');
