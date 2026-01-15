use App\Http\Middleware\ResolveTenant;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiAuthController;

// Controllers Tenant
use App\Http\Controllers\Tenant\TenantUserController;
use App\Http\Controllers\Tenant\ProdutoController;
use App\Http\Controllers\Tenant\CategoriaController;
use App\Http\Controllers\Tenant\FornecedorController;
use App\Http\Controllers\Tenant\CompraController;
use App\Http\Controllers\Tenant\VendaController;
use App\Http\Controllers\Tenant\PagamentoController;
use App\Http\Controllers\Tenant\MovimentoStockController;
use App\Http\Controllers\Tenant\FaturaController;

/*
|--------------------------------------------------------------------------
| LOGIN GLOBAL
|--------------------------------------------------------------------------
*/
Route::post('/login', [ApiAuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| ROTAS DO TENANT (multi-tenant)
|--------------------------------------------------------------------------
*/
Route::middleware([ResolveTenant::class])->prefix('tenant')->group(function () {

    // Registro opcional
    Route::post('/register', [ApiAuthController::class, 'register']);

    // Rotas protegidas do tenant
    Route::middleware(['auth:sanctum', 'tenant.user'])->group(function () {

        // Informações do tenant e usuário autenticado
        Route::get('/info', function () {
            return response()->json([
                'tenant' => app('tenant'),
                'user'   => request()->user(),
            ]);
        });

        // Logout
        Route::post('/logout', [ApiAuthController::class, 'logout']);

        /*
        |--------------------------------------------------------------------------
        | CRUD USERS
        |--------------------------------------------------------------------------
        */
        Route::apiResource('/users', TenantUserController::class);

        /*
        |--------------------------------------------------------------------------
        | CRUD PRODUTOS
        |--------------------------------------------------------------------------
        */
        Route::apiResource('/produtos', ProdutoController::class);

        /*
        |--------------------------------------------------------------------------
        | CRUD CATEGORIAS
        |--------------------------------------------------------------------------
        */
        Route::apiResource('/categorias', CategoriaController::class);

        /*
        |--------------------------------------------------------------------------
        | CRUD FORNECEDORES
        |--------------------------------------------------------------------------
        */
        Route::apiResource('/fornecedores', FornecedorController::class);

        /*
        |--------------------------------------------------------------------------
        | COMPRAS
        |--------------------------------------------------------------------------
        */
        Route::post('/compras', [CompraController::class, 'store']);

        /*
        |--------------------------------------------------------------------------
        | VENDAS
        |--------------------------------------------------------------------------
        */
        Route::post('/vendas', [VendaController::class, 'store']);

        /*
        |--------------------------------------------------------------------------
        | PAGAMENTOS
        |--------------------------------------------------------------------------
        */
        Route::apiResource('/pagamentos', PagamentoController::class);

        /*
        |--------------------------------------------------------------------------
        | MOVIMENTOS DE STOCK
        |--------------------------------------------------------------------------
        */
        Route::apiResource('/movimentos-stock', MovimentoStockController::class);

        /*
        |--------------------------------------------------------------------------
        | FATURAS
        |--------------------------------------------------------------------------
        */
        Route::get('/faturas', [FaturaController::class, 'index']);
        Route::post('/faturas/gerar', [FaturaController::class, 'gerarFatura']);
    });
});
