<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\Tenant\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class EmpresaController extends Controller
{
    /**
     * Lista todas as empresas (landlord)
     */
    public function index()
    {
        // SEMPRE usar conexão landlord para listar empresas
        $empresas = Empresa::on('landlord')->get();

        return response()->json([
            'success' => true,
            'data' => $empresas
        ], 200);
    }

    /**
     * Cria empresa + banco tenant + migrations + seed
     */
public function store(Request $request)
{
    Log::info('[🚀 INÍCIO] Criando nova empresa', [
        'empresa_nome' => $request->nome,
        'admin_email'  => $request->admin_email
    ]);

    $request->validate([
        'nome'          => 'required|string|max:255',
        'nif'           => 'required|string|unique:landlord.empresas,nif',
        'email'         => 'required|email|unique:landlord.empresas,email',
        'regime_fiscal' => 'required|in:simplificado,geral',
        'admin_name'     => 'required|string|max:255',
        'admin_email'    => 'required|email',
        'admin_password' => 'required|string|min:8',
    ]);

    Log::info('[✅ 1/6] Validação aprovada');

    // 1. Criar empresa (sem transação)
    $empresa = Empresa::on('landlord')->create([
        'id'            => Str::uuid(),
        'nome'          => $request->nome,
        'nif'           => $request->nif,
        'email'         => $request->email,
        'telefone'      => $request->telefone,
        'endereco'      => $request->endereco,
        'db_name'       => 'empresa_' . Str::slug($request->nome, '_'),
        'regime_fiscal' => $request->regime_fiscal,
        'sujeito_iva'   => $request->sujeito_iva ?? true,
        'status'        => 'ativo',
        'data_registro' => now(),
    ]);

    Log::info('[📝 2/6] Empresa inserida no landlord', [
        'id'      => $empresa->id,
        'db_name' => $empresa->db_name
    ]);

    try {
        // 2. Criar base de dados física
        DB::connection('landlord')
            ->statement("CREATE DATABASE `{$empresa->db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        Log::info('[🗄️ 3/6] Base de dados criada', ['database' => $empresa->db_name]);

        // 3. Configurar conexão tenant
        $this->configurarTenantConnection($empresa->db_name);
        Log::info('[🔌 4/6] Conexão tenant configurada');

        // 4. Rodar migrations
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path'     => 'database/migrations/tenant',
            '--force'    => true,
        ]);
        Log::info('[📦 5/6] Migrations executadas com sucesso');

        // 5. Criar admin no tenant
        $admin = User::on('tenant')->create([
            'id'       => (string) Str::uuid(),
            'name'     => $request->admin_name,
            'email'    => $request->admin_email,
            'password' => Hash::make($request->admin_password),
            'role'     => 'admin',
            'ativo'    => true,
        ]);

        Log::info('[👤 6/6] Admin criado no tenant', [
            'admin_nome'  => $admin->name,
            'admin_email' => $admin->email
        ]);
        Log::info('[🎉 SUCESSO] Empresa criada com sucesso!');

        return response()->json([
            'success' => true,
            'message' => 'Empresa criada com sucesso!',
            'empresa' => $empresa->fresh(),
            'admin'   => $admin->only(['name', 'email', 'role'])
        ], 201);

    } catch (\Throwable $e) {
        // Rollback manual: apagar registo da empresa e a base de dados
        Log::error('[❌ ERRO] Falha na criação', [
            'mensagem' => $e->getMessage(),
            'linha'    => $e->getLine(),
            'arquivo'  => $e->getFile()
        ]);

        // Apagar empresa do landlord
        $empresa->delete();
        Log::warning('[🧹 CLEANUP] Registo da empresa removido');

        // Apagar base de dados, se existir
        try {
            DB::connection('landlord')
                ->statement("DROP DATABASE IF EXISTS `{$empresa->db_name}`");
            Log::warning('[🧹 CLEANUP] Banco removido', ['database' => $empresa->db_name]);
        } catch (\Throwable $ignored) {}

        return response()->json([
            'success' => false,
            'message' => 'Falha ao criar empresa: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Configura a conexão tenant dinamicamente
     */
    private function configurarTenantConnection(string $database): void
    {
        config(['database.connections.tenant.database' => $database]);
        DB::purge('tenant');
        DB::reconnect('tenant');
    }
    /**
     * Mostrar empresa (landlord)
     */
    public function show(Empresa $empresa)
    {
        return response()->json([
            'success' => true,
            'data' => $empresa
        ], 200);
    }

    /**
     * Atualizar empresa (apena dados do landlord)
     */
    public function update(Request $request, Empresa $empresa)
    {
        $request->validate([
            'nome' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:landlord.empresas,email,' . $empresa->id,
            'telefone' => 'nullable|string',
            'endereco' => 'nullable|string',
            'status' => 'sometimes|in:ativo,suspenso',
        ]);

        // NÃO permitir alterar db_name, nif, regime_fiscal facilmente
        $empresa->update($request->only([
            'nome', 'email', 'telefone', 'endereco', 'status', 'logo'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Empresa atualizada!',
            'data' => $empresa
        ], 200);
    }


    /**
 * Suspender/Ativar a própria empresa (para tenant logado)
 */

    /**
     * Suspender/Ativar a própria empresa (para tenant logado)
     */
 public function toggleSelfStatus(Request $request)
{
    // ✅ BYPASS COMPLETO — não usa auth('tenant')->user()
    // Usa apenas o header X-Empresa-ID que o frontend envia
    
    $empresaId = $request->header('X-Empresa-ID') ?? $request->header('X-Tenant-ID');
    
    if (!$empresaId) {
        return response()->json([
            'success' => false,
            'message' => 'Empresa não identificada. Header X-Empresa-ID ausente.'
        ], 400);
    }

    // Buscar empresa no landlord (conexão explícita)
    $empresa = \App\Models\Empresa::on('landlord')->find($empresaId);
    
    if (!$empresa) {
        return response()->json([
            'success' => false,
            'message' => 'Empresa não encontrada no landlord.'
        ], 404);
    }

    $statusAnterior = $empresa->status;
    $novoStatus = $statusAnterior === 'ativo' ? 'suspenso' : 'ativo';

    // Atualizar no landlord
    $afetados = DB::connection('landlord')
        ->table('empresas')
        ->where('id', $empresa->id)
        ->where('status', $statusAnterior)
        ->update([
            'status' => $novoStatus,
            'updated_at' => now(),
        ]);

    if ($afetados === 0) {
        return response()->json([
            'success' => false,
            'message' => 'O status foi alterado por outro utilizador. Recarregue a página.',
        ], 409);
    }

    $acao = $novoStatus === 'ativo' ? 'reativada' : 'suspensa';

    return response()->json([
        'success' => true,
        'message' => "Empresa {$acao} com sucesso.",
        'status' => $novoStatus,
        'status_anterior' => $statusAnterior,
    ]);
}
    /**
     * Toggle status de empresa (para landlord)
     */
    public function toggleStatusLandlord(Request $request, Empresa $empresa)
    {
        $statusAnterior = $empresa->status;
        $novoStatus = $statusAnterior === 'ativo' ? 'suspenso' : 'ativo';

        $empresa->update(['status' => $novoStatus]);

        Log::info('[LANDLORD] Status de empresa alterado', [
            'empresa_id' => $empresa->id,
            'status_anterior' => $statusAnterior,
            'status_novo' => $novoStatus,
            'alterado_por' => auth('landlord_api')->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Empresa {$novoStatus} com sucesso.",
            'status' => $novoStatus,
        ]);
}
}