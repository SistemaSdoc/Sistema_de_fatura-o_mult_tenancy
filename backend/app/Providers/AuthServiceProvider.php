<?php
namespace App\Providers;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
// Models
use App\Models\Tenant\Produto;
use App\Models\Tenant\Venda;
use App\Models\Tenant\Compra;
use App\Models\Tenant\Pagamento;
use App\Models\Tenant\Fatura;
use App\Models\Tenant\Categoria;
use App\Models\Tenant\User;
use App\Models\Tenant\Cliente;
use App\Models\Tenant\DocumentoFiscal;
// Policies
use App\Policies\ProdutoPolicy;
use App\Policies\VendaPolicy;
use App\Policies\CompraPolicy;
use App\Policies\PagamentoPolicy;
use App\Policies\FaturaPolicy;
use App\Policies\CategoriaPolicy;
use App\Policies\UserPolicy;
use App\Policies\ClientePolicy;

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
        DocumentoFiscal::class     => FaturaPolicy::class,
        Categoria::class  => CategoriaPolicy::class,
        User::class       => UserPolicy::class,
        Cliente::class    => ClientePolicy::class, // ← ADICIONAR AQUI!
        // Fornecedor::class => FornecedorPolicy::class, // ← se aplicável
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
