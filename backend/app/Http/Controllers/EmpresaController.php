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
    // ------------------------------------------------------------
    // LOGS VISUAIS (emojis + formatação)
    // ------------------------------------------------------------
    private function logPretty(string $step, string $message, string $status = 'info'): void
    {
        $emoji = match ($status) {
            'success' => '✅',
            'error'   => '❌',
            'warning' => '⚠️',
            default   => 'ℹ️',
        };

        $formatted = sprintf(
            "[%s %s] %s",
            $emoji,
            str_pad($step, 12, ' ', STR_PAD_BOTH),
            $message
        );

        Log::channel('single')->info($formatted);
    }

    // ------------------------------------------------------------
    // ARTE ASCII: FATURAJA (com cores ANSI)
    // ------------------------------------------------------------
    private function getFaturajaAscii(): string
    {
        return "\033[38;5;18m
╔════════════════════════════════════════════════════╗
║                                                    ║
\033[38;5;208m
║   ███████╗ █████╗ ████████╗██╗   ██╗██████╗  █████╗   ║
║   ██╔════╝██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██╔══██╗  ║
║   █████╗  ███████║   ██║   ██║   ██║██████╔╝███████║  ║
║   ██╔══╝  ██╔══██║   ██║   ██║   ██║██╔══██╗██╔══██║  ║
║   ██║     ██║  ██║   ██║   ╚██████╔╝██║  ██║██║  ██║  ║
║   ╚═╝     ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ║
\033[38;5;18m
║                    TENANT SYSTEM                   ║
║                                                    ║
╚════════════════════════════════════════════════════╝
\033[0m";
    }

    // ------------------------------------------------------------
    // ARTE ASCII: SDOCA (boas‑vindas / cabeçalho)
    // ------------------------------------------------------------
    private function getSdocAscii(): string
    {
        return <<<SDOCA
╔══════════════════════════════════════════════════════════════════════════╗
║                              ★  SDOCA  ★                                ║
║                                                                          ║
║   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     ║
║   ░                                                                    ░ ║
║   ░     ███████╗ ██████╗   ██████╗  ██████╗  █████╗                     ░ ║
║   ░     ██╔════╝ ██╔-══██╗ ██╔═██╗ ██╔       ██╔══██╗                    ░║
║   ░     ███████╗ ██║   ██║ ██║ ██║ ██║       ███████║                    ░║
║   ░     ╚════██║ ██║   ██║ ██║ ██║ ██║       ██╔══██║                    ░║
║   ░     ███████║ ██████╔╝  ██████╔ ██████    ██║  ██║                    ░║
║   ░     ╚══════╝ ╚═════╝   ╚═════╝  ╚═════╝  ╚═╝  ╚═╝                    ░║
║   ░                                                                    ░ ║
║   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     ║
║                                                                          ║
║   🏷️  SDOCA – Plataforma de Documentação Fiscal e Cadastro de Empresas   ║
║   🔒  Segurança multi‑tenant | Isolamento por base de dados              ║
║   ⚡  Rápida, intuitiva e em conformidade com a legislação angolana      ║
╚══════════════════════════════════════════════════════════════════════════╝
SDOCA;
    }

    // ------------------------------------------------------------
    // ARTE ASCII: PRÉDIO MULTI‑TENANT (com dados da empresa)
    // ------------------------------------------------------------
    private function getBuildingAscii(string $subdomain, string $dbName, string $adminEmail): string
    {
        return <<<BUILDING
╔══════════════════════════════════════════════════════════════════════════╗
║                 🏢  PRÉDIO MULTI‑TENANT (Apartamentos)  🏢              ║
║                                                                          ║
║                           ┌─────────────────┐                            ║
║                        ┌──┤  🪟  4º andar    ├──┐                         ║
║                        │  │  (futuro)       │  │                         ║
║                        │  └─────────────────┘  │                         ║
║                        │  ┌─────────────────┐  │                         ║
║                        ├──┤  🪟  3º andar    ├──┤                         ║
║                        │  │  (futuro)       │  │                         ║
║                        │  └─────────────────┘  │                         ║
║                        │  ┌─────────────────┐  │                         ║
║                        ├──┤  🪟  2º andar    ├──┤                         ║
║                        │  │  (futuro)       │  │                         ║
║                        │  └─────────────────┘  │                         ║
║                        │  ┌─────────────────┐  │                         ║
║                        └──┤  🪟  1º andar    ├──┘                         ║
║                           │  Empresa: {$subdomain} │
║                           │  🗄️  {$dbName}  │
║                           └─────────────────┘                            ║
║                                  ┌┴┴┴┴┴┐                                 ║
║                                  │ 🏢    Landlord (Central)             ║
║                                  │ 🗄️  │  Base de dados master           ║
║                                  │ 🌐  │  Gerencia subdomínios           ║
║                                  └─────┘                                 ║
║                                                                          ║
║   🔐  Isolamento total entre apartamentos (tenants)                     ║
║   🌍  Cada empresa tem subdomínio próprio (ex: {$subdomain}.faturaja.sdoca.it.com) ║
║   👤  Administrador: {$adminEmail}                                       ║
║   🚀  Escala horizontal – novos apartamentos sem afetar os existentes   ║
╚══════════════════════════════════════════════════════════════════════════╝
BUILDING;
    }

    // ============================================================
    // 1. LISTAGEM (landlord)
    // ============================================================
    public function index()
    {
        $empresas = Empresa::on('landlord')->get();

        return response()->json([
            'success' => true,
            'data'    => $empresas
        ], 200);
    }

    // ============================================================
    // 2. UPLOAD TEMPORÁRIO DE LOGO (público – sem empresa)
    // ============================================================
    public function uploadTempLogo(Request $request)
    {
        $this->logPretty('UPLOAD', 'Iniciando upload temporário do logo', 'info');

        try {
            $request->validate([
                'logo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
            ]);

            $file = $request->file('logo');
            $filename = 'temp_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('temp_logos', $filename, 'public');

            $this->logPretty('UPLOAD', "Logo temporário salvo em: {$path}", 'success');

            return response()->json([
                'success'  => true,
                'logo_url' => $path,
                'message'  => 'Upload temporário realizado com sucesso'
            ]);
        } catch (\Throwable $e) {
            $this->logPretty('UPLOAD', "Erro: {$e->getMessage()}", 'error');
            return response()->json([
                'success' => false,
                'message' => 'Falha ao fazer upload: ' . $e->getMessage()
            ], 500);
        }
    }

    // ============================================================
    // 3. CRIAR EMPRESA (landlord) + ADMIN (tenant)
    // ============================================================
    public function store(Request $request)
    {
        // Log inicial com artes FATURAJA e SDOCA
        Log::channel('single')->info("\n" . $this->getFaturajaAscii() . "\n");
        Log::channel('single')->info("\n" . $this->getSdocAscii() . "\n");
        $this->logPretty('INÍCIO', "Criando nova empresa: \"{$request->nome}\" (admin: {$request->admin_email})", 'info');

        // Validação
        $validated = $request->validate([
            'nome'           => 'required|string|max:255',
            'nif'            => 'required|digits:10|unique:landlord.empresas,nif',
            'email'          => 'required|email|unique:landlord.empresas,email',
            'telefone'       => 'required|string|max:20',
            'endereco'       => 'required|string|max:500',
            'regime_fiscal'  => 'required|in:simplificado,geral',
            'sujeito_iva'    => 'required|boolean',
            'nome_banco'     => 'nullable|string|max:255',
            'numero_conta'   => 'nullable|size:11|unique:landlord.empresas,numero_conta|max:50',
            'iban'           => 'nullable|size:25|unique:landlord.empresas,iban',
            'logo'           => 'required|string|max:255',
            'subdomain'      => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/',
                'unique:landlord.empresas,subdomain'
            ],
            'admin_name'     => 'required|string|max:255',
            'admin_email'    => 'required|email',
            'admin_password' => 'required|string|min:8',
        ]);

        $this->logPretty('1/6', 'Validação aprovada', 'success');

        // Geração do nome da base de dados (único)
        $dbNameBase = 'empresa_' . Str::slug($request->nome, '_');
        $dbName     = $dbNameBase;
        $counter    = 1;
        while (!empty(DB::connection('landlord')->select("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [$dbName]))) {
            $dbName = $dbNameBase . '_' . $counter;
            $counter++;
        }

        // Criar empresa na tabela landlord
        $empresa = Empresa::on('landlord')->create([
            'id'            => Str::uuid(),
            'nome'          => $request->nome,
            'nif'           => $request->nif,
            'email'         => $request->email,
            'telefone'      => $request->telefone,
            'endereco'      => $request->endereco,
            'db_name'       => $dbName,
            'subdomain'     => $request->subdomain,
            'regime_fiscal' => $request->regime_fiscal,
            'sujeito_iva'   => $request->sujeito_iva,
            'nome_banco'    => $request->nome_banco,
            'numero_conta'  => $request->numero_conta,
            'iban'          => $request->iban,
            'logo'          => $request->logo,
            'status'        => 'ativo',
            'data_registro' => now(),
        ]);

        $this->logPretty('2/6', "Empresa inserida no landlord (ID: {$empresa->id}, Subdomínio: {$empresa->subdomain})", 'success');

        try {
            // Criar base de dados
            DB::connection('landlord')
                ->statement("CREATE DATABASE `{$empresa->db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $this->logPretty('3/6', "Base de dados criada: {$empresa->db_name}", 'success');

            // Configurar conexão tenant
            $this->configurarTenantConnection($empresa->db_name);
            $this->logPretty('4/6', 'Conexão tenant configurada', 'success');

            // Executar migrations do tenant
            $exitCode = Artisan::call('migrate', [
                '--database' => 'tenant',
                '--path'     => 'database/migrations/tenant',
                '--force'    => true,
            ]);
            if ($exitCode !== 0) {
                throw new \Exception('Erro ao executar migrations. Código: ' . $exitCode);
            }
            $this->logPretty('5/6', 'Migrations executadas com sucesso', 'success');

            // Criar administrador
            $admin = User::on('tenant')->create([
                'id'       => (string) Str::uuid(),
                'name'     => $request->admin_name,
                'email'    => $request->admin_email,
                'password' => Hash::make($request->admin_password),
                'role'     => 'admin',
                'ativo'    => true,
            ]);

            // Mover logo temporário para pasta definitiva (se aplicável)
            if (str_starts_with($empresa->logo, 'temp_logos/')) {
                $extension = pathinfo($empresa->logo, PATHINFO_EXTENSION) ?: 'png';
                $newLogoName = 'logos/logo_' . $empresa->id . '_' . time() . '.' . $extension;
                if (Storage::disk('public')->exists($empresa->logo)) {
                    Storage::disk('public')->move($empresa->logo, $newLogoName);
                    $empresa->update(['logo' => $newLogoName]);
                    $this->logPretty('EXTRA', "Logo movido para: {$newLogoName}", 'success');
                } else {
                    $this->logPretty('EXTRA', "Logo temporário não encontrado: {$empresa->logo}", 'warning');
                }
            }

            $this->logPretty('6/6', "Admin criado: {$admin->email} (role: {$admin->role})", 'success');

            // Log final com o prédio multi‑tenant (dados da empresa)
            $building = $this->getBuildingAscii($empresa->subdomain, $empresa->db_name, $admin->email);
            Log::channel('single')->info("\n" . $building . "\n");

            return response()->json([
                'success' => true,
                'message' => 'Empresa criada com sucesso!',
                'empresa' => $empresa->fresh(),
                'admin'   => $admin->only(['name', 'email', 'role']),
            ], 201);
        } catch (\Throwable $e) {
            $this->logPretty('ERRO', "Falha na criação: {$e->getMessage()}", 'error');

            // Rollback: apagar empresa e tentar remover base de dados
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

    // ============================================================
    // 4. CONFIGURAR CONEXÃO TENANT
    // ============================================================
    private function configurarTenantConnection(string $database): void
    {
        config(['database.connections.tenant.database' => $database]);
        DB::purge('tenant');
        DB::reconnect('tenant');
    }

    // ============================================================
    // 5. MOSTRAR EMPRESA POR ID (landlord)
    // ============================================================
    public function show(Empresa $empresa)
    {
        return response()->json([
            'success' => true,
            'data'    => $empresa
        ], 200);
    }

    // ============================================================
    // 6. MOSTRAR PRÓPRIA EMPRESA (tenant autenticado)
    // Rota: GET /api/empresa
    // ============================================================
    public function showSelf(Request $request)
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

        return response()->json([
            'success' => true,
            'data'    => $empresa
        ], 200);
    }

    // ============================================================
    // 7. UPLOAD DE LOGO (tenant autenticado)
    // Rota: POST /api/empresa/logo
    // ============================================================
    public function uploadLogo(Request $request)
    {
        $empresaId = $request->header('X-Empresa-ID') ?? $request->header('X-Tenant-ID');

        if (!$empresaId) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada.'
            ], 400);
        }

        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        $empresa = Empresa::on('landlord')->find($empresaId);

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não encontrada.'
            ], 404);
        }

        try {
            $file = $request->file('logo');
            $filename = 'logo_' . $empresa->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('logos', $filename, 'public');

            if ($empresa->logo && Storage::disk('public')->exists($empresa->logo)) {
                Storage::disk('public')->delete($empresa->logo);
            }

            $empresa->update(['logo' => $path]);

            Log::info('[📸 LOGO] Atualizado', ['empresa_id' => $empresa->id, 'path' => $path]);

            return response()->json([
                'success'  => true,
                'logo_url' => $path,
                'message'  => 'Logo atualizado com sucesso!'
            ]);
        } catch (\Throwable $e) {
            Log::error('[❌ LOGO] Falha', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Falha ao fazer upload: ' . $e->getMessage()
            ], 500);
        }
    }

    // ============================================================
    // 8. ATUALIZAR EMPRESA (tenant autenticado)
    // Rota: PUT /api/empresa
    // ============================================================
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

    // ============================================================
    // 9. ATUALIZAR EMPRESA (landlord – painel landlord)
    // ============================================================
    public function update(Request $request, Empresa $empresa)
    {
        $request->validate([
            'nome'      => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:landlord.empresas,email,' . $empresa->id,
            'telefone'  => 'nullable|string',
            'endereco'  => 'nullable|string',
            'nome_banco' => 'nullable|string|max:255',
            'numero_conta' => 'nullable|string|unique:landlord.empresas,numero_conta|max:50',
            'iban' => 'nullable|size:25|unique:landlord.empresas,iban',
            
            'logo'      => 'nullable|string|max:255',
            'status'    => 'sometimes|in:ativo,suspenso',
            'subdomain' => 'sometimes|string|unique:landlord.empresas,subdomain,' . $empresa->id,
        ]);

        $empresa->update($request->only([
            'nome', 'email', 'telefone', 'endereco', 'status', 'nome_banco', 'numero_conta', 'iban', 'logo', 'subdomain'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Empresa atualizada!',
            'data'    => $empresa->fresh()
        ], 200);
    }

    // ============================================================
    // 10. ALTERAR PRÓPRIO STATUS (tenant autenticado)
    // Rota: PATCH /api/empresa/toggle-status
    // ============================================================
public function toggleSelfStatus(Request $request)
{
    // ✅ Usar o tenant JÁ RESOLVIDO pelo middleware
    $empresa = $request->attributes->get('current_empresa');
    if (!$empresa) {
        return response()->json([
            'success' => false,
            'message' => 'Tenant não resolvido.'
        ], 400);
    }

    // ✅ Ou usar o user autenticado (garantido pelo auth.tenant)
    $user = $request->user();
    // $user->empresa_id já está no contexto do tenant correto

    $statusAnterior = $empresa->status;
    $novoStatus = $statusAnterior === 'ativo' ? 'suspenso' : 'ativo';

    // ✅ Update com verificação de concorrência (optimistic locking)
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
            'message' => 'O status foi alterado por outro utilizador.',
        ], 409);
    }

    // ✅ Log de auditoria
    \Log::info("Empresa status alterado", [
        'empresa_id' => $empresa->id,
        'user_id'    => $user->id,
        'de'         => $statusAnterior,
        'para'       => $novoStatus,
    ]);

    $acao = $novoStatus === 'ativo' ? 'reativada' : 'suspensa';

    return response()->json([
        'success'         => true,
        'message'         => "Empresa {$acao} com sucesso.",
        'status'          => $novoStatus,
        'status_anterior' => $statusAnterior,
    ]);
}
    // ============================================================
    // 11. ALTERAR STATUS POR LANDLORD (painel landlord)
    // ============================================================
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