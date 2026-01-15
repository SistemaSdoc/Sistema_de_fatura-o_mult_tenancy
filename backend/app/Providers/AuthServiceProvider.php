<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

// Models
use App\Models\Produto;
use App\Models\Venda;
use App\Models\Compra;
use App\Models\Pagamento;
use App\Models\Fatura;
use App\Models\Categoria;
use App\Models\TenantUser;

// Policies
use App\Policies\ProdutoPolicy;
use App\Policies\VendaPolicy;
use App\Policies\CompraPolicy;
use App\Policies\PagamentoPolicy;
use App\Policies\FaturaPolicy;
use App\Policies\CategoriaPolicy;
use App\Policies\TenantUserPolicy;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Produto::class    => ProdutoPolicy::class,
        Venda::class      => VendaPolicy::class,
        Compra::class     => CompraPolicy::class,
        Pagamento::class  => PagamentoPolicy::class,
        Fatura::class     => FaturaPolicy::class,
        Categoria::class  => CategoriaPolicy::class,
        TenantUser::class => TenantUserPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}
