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
use Illuminate\Support\Facades\Storage;

class EmpresaController extends Controller
{
    /**
     * Lista todas as empresas (landlord)
     */
    public function index()
    {
        $empresas = Empresa::on('landlord')->get();

        return response()->json([
            'success' => true,
            'data'    => $empresas
        ], 200);
     }

    

    /**
     * ✅ NOVO: Upload do logo da empresa já existente (tenant autenticado)
     * Rota: POST /api/empresa/logo
     */
    public function uploadLogo(Request $request)
    {
        Log::info('[📸 UPLOAD LOGO] Iniciando upload do logo da empresa');

        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        $empresaId = $request->header('X-Empresa-ID') ?? $request->header('X-Tenant-ID');

        if (!$empresaId) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada.'
            ], 400);
        }

        $empresa = Empresa::on('landlord')->find($empresaId);

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não encontrada.'
            ], 404);
        }

        try {
            $file     = $request->file('logo');
            $filename = 'logo_' . $empresaId . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path     = $file->storeAs('logos', $filename, 'public');

            // Apagar logo anterior se existir
            if ($empresa->logo && Storage::disk('public')->exists($empresa->logo)) {
                Storage::disk('public')->delete($empresa->logo);
            }

            $empresa->update(['logo' => $path]);

            Log::info('[📸 UPLOAD LOGO] Logo atualizado', [
                'empresa_id' => $empresaId,
                'path'       => $path,
            ]);

            return response()->json([
                'success'  => true,
                'logo_url' => $path,
                'message'  => 'Logo atualizado com sucesso!'
            ]);
        } catch (\Throwable $e) {
            Log::error('[❌ UPLOAD LOGO] Falha', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Falha ao fazer upload: ' . $e->getMessage()
            ], 500);
        }
 }

    public function store(Request $request)
    {
        Log::info('[🚀 INÍCIO] Criando nova empresa', [
            'empresa_nome' => $request->nome,
            'admin_email'  => $request->admin_email
        ]);
        $request->validate([
            'nome'           => 'required|string|max:255',
            'nif'            => 'required|string|unique:landlord.empresas,nif',
            'email'          => 'required|email|unique:landlord.empresas,email',
            'telefone'       => 'required|string|max:20',
            'endereco'       => 'required|string|max:500',
            'regime_fiscal'  => 'required|in:simplificado,geral',
            'sujeito_iva'    => 'required|boolean',
            'logo'           => 'required|string|max:255',
            'admin_name'     => 'required|string|max:255',
            'admin_email'    => 'required|email',
            'admin_password' => 'required|string|min:8',
        ]);

        Log::info('[✅ 1/6] Validação aprovada');

        // Gerar subdomain único
        $subdomain     = Str::slug($request->nome);
        $subdomainBase = $subdomain;
        $count         = 1;
        while (Empresa::on('landlord')->where('subdomain', $subdomain)->exists()) {
            $subdomain = $subdomainBase . '-' . $count;
            $count++;
        }

        $empresa = Empresa::on('landlord')->create([
            'id'            => Str::uuid(),
            'nome'          => $request->nome,
            'nif'           => $request->nif,
            'email'         => $request->email,
            'telefone'      => $request->telefone,
            'endereco'      => $request->endereco,
            'db_name'       => 'empresa_' . Str::slug($request->nome, '_'),
            'subdomain'     => $subdomain,
            'regime_fiscal' => $request->regime_fiscal,
            'sujeito_iva'   => $request->sujeito_iva,
            'logo'          => $request->logo,
            'status'        => 'ativo',
            'data_registro' => now(),
        ]);

        Log::info('[📝 2/6] Empresa inserida no landlord', [
            'id'        => $empresa->id,
            'db_name'   => $empresa->db_name,
            'subdomain' => $empresa->subdomain,
        ]);

        try {
            DB::connection('landlord')
                ->statement("CREATE DATABASE `{$empresa->db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            Log::info('[🗄️ 3/6] Base de dados criada');

            $this->configurarTenantConnection($empresa->db_name);
            Log::info('[🔌 4/6] Conexão tenant configurada');

            Artisan::call('migrate', [
                '--database' => 'tenant',
                '--path'     => 'database/migrations/tenant',
                '--force'    => true,
            ]);
            Log::info('[📦 5/6] Migrations executadas');

            $admin = User::on('tenant')->create([
                'id'       => (string) Str::uuid(),
                'name'     => $request->admin_name,
                'email'    => $request->admin_email,
                'password' => Hash::make($request->admin_password),
                'role'     => 'admin',
                'ativo'    => true,
            ]);

            Log::info('[👤 6/6] Admin criado', ['email' => $admin->email]);
            Log::info('[🎉 SUCESSO] Empresa criada!');

            return response()->json([
                'success' => true,
                'message' => 'Empresa criada com sucesso!',
                'empresa' => $empresa->fresh(),
                'admin'   => $admin->only(['name', 'email', 'role'])
            ], 201);

        } catch (\Throwable $e) {
            Log::error('[❌ ERRO] Falha na criação', [
                'mensagem' => $e->getMessage(),
                'linha'    => $e->getLine(),
                'arquivo'  => $e->getFile(),
            ]);

            $empresa->delete();

            try {
                DB::connection('landlord')
                    ->statement("DROP DATABASE IF EXISTS `{$empresa->db_name}`");
            } catch (\Throwable $ignored) {}

            return response()->json([
                'success' => false,
                'message' => 'Falha ao criar empresa: ' . $e->getMessage()
            ], 500);
        }
    }
    private function configurarTenantConnection(string $database): void
    {
        config(['database.connections.tenant.database' => $database]);
        DB::purge('tenant');
        DB::reconnect('tenant');
    }

    /**
     * Mostrar empresa por ID (landlord)
     */
    public function show(Empresa $empresa)
    {
        return response()->json([
            'success' => true,
            'data'    => $empresa
        ], 200);
    }

    /**
     * ✅ Atualizar empresa pelo tenant autenticado
     * Rota: PUT /api/empresa
     */
    public function updateTenant(Request $request)
    {
        $empresaId = $request->header('X-Empresa-ID') ?? $request->header('X-Tenant-ID');

        if (!$empresaId) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada.'
            ], 400);
        }

        $empresa = Empresa::on('landlord')->find($empresaId);

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não encontrada.'
            ], 404);
        }

        if ($empresa->status === 'suspenso') {
            return response()->json([
                'success' => false,
                'message' => 'Empresa suspensa — não é possível editar os dados.'
            ], 403);
        }

        $request->validate([
            'nome'          => 'sometimes|string|max:255',
            'email'         => 'sometimes|email|unique:landlord.empresas,email,' . $empresa->id,
            'telefone'      => 'nullable|string|max:20',
            'endereco'      => 'nullable|string|max:500',
            'regime_fiscal' => 'sometimes|in:simplificado,geral',
            'sujeito_iva'   => 'sometimes|boolean',
        ]);

        $empresa->update($request->only([
            'nome', 'email', 'telefone', 'endereco', 'regime_fiscal', 'sujeito_iva'
        ]));

        Log::info('[EMPRESA] Dados atualizados pelo tenant', ['empresa_id' => $empresa->id]);

        return response()->json([
            'success' => true,
            'message' => 'Empresa atualizada!',
            'data'    => $empresa->fresh()
        ], 200);
    }

    /**
     * Atualizar empresa (landlord — pelo painel landlord)
     */
    public function update(Request $request, Empresa $empresa)
    {
        $request->validate([
            'nome'      => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:landlord.empresas,email,' . $empresa->id,
            'telefone'  => 'nullable|string',
            'endereco'  => 'nullable|string',
            'logo'      => 'nullable|string|max:255',
            'status'    => 'sometimes|in:ativo,suspenso',
            'subdomain' => 'sometimes|string|unique:landlord.empresas,subdomain,' . $empresa->id,
        ]);

        $empresa->update($request->only([
            'nome', 'email', 'telefone', 'endereco', 'status', 'logo', 'subdomain'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Empresa atualizada!',
            'data'    => $empresa->fresh()
        ], 200);
    }

    /**
     * Suspender/Ativar a própria empresa (tenant autenticado)
     * Rota: PATCH /api/empresa/toggle-status
     */
    public function toggleSelfStatus(Request $request)
    {
        $empresaId = $request->header('X-Empresa-ID') ?? $request->header('X-Tenant-ID');

        if (!$empresaId) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada. Header X-Empresa-ID ausente.'
            ], 400);
        }

        $empresa = Empresa::on('landlord')->find($empresaId);

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não encontrada no landlord.'
            ], 404);
        }

        $statusAnterior = $empresa->status;
        $novoStatus     = $statusAnterior === 'ativo' ? 'suspenso' : 'ativo';

        $afetados = DB::connection('landlord')
            ->table('empresas')
            ->where('id', $empresa->id)
            ->where('status', $statusAnterior)
            ->update([
                'status'     => $novoStatus,
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
            'success'         => true,
            'message'         => "Empresa {$acao} com sucesso.",
            'status'          => $novoStatus,
            'status_anterior' => $statusAnterior,
        ]);
    }

    /**
     * Toggle status de empresa (landlord)
     */
    public function toggleStatusLandlord(Request $request, Empresa $empresa)
    {
        $statusAnterior = $empresa->status;
        $novoStatus     = $statusAnterior === 'ativo' ? 'suspenso' : 'ativo';

        $empresa->update(['status' => $novoStatus]);

        Log::info('[LANDLORD] Status de empresa alterado', [
            'empresa_id'      => $empresa->id,
            'status_anterior' => $statusAnterior,
            'status_novo'     => $novoStatus,
            'alterado_por'    => auth('landlord_api')->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Empresa {$novoStatus} com sucesso.",
            'status'  => $novoStatus,
        ]);
    }
}