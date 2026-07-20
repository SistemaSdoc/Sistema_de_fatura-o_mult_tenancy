<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\Shared\Cliente as SharedCliente;
use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Shared\EmpresaMensagem;
use App\Models\Shared\Pagamento as SharedPagamento;
use App\Models\Shared\User as SharedUser;
use App\Models\Plano;
use App\Models\Subscricao;
use App\Models\Tenant\Cliente as TenantCliente;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Tenant\Pagamento as TenantPagamento;
use App\Models\Tenant\User as TenantUser;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;

class EmpresaController extends Controller
{ 

    private const IVA_PADRAO_DEFAULT = 14.0;

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
    // ARTE ASCII: FATURAJA
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
    // ARTE ASCII: SDOCA
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
    // ARTE ASCII: PRÉDIO MULTI‑TENANT
    // ------------------------------------------------------------
    private function getBuildingAscii(string $subdomain, string $dbName, string $adminEmail, ?string $modo = 'colectivo'): string
    {
        // Garantir que nunca é null
        $modo = $modo ?? 'colectivo';

        $modoLabel = $modo === 'colectivo'
            ? '🔄 Multi-Tenant (Colectivo)'
            : '🏢 Single-Tenant (Singular)';

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
║                           │  {$modoLabel} │
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
    // 2. UPLOAD TEMPORÁRIO DE LOGO
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


private function executarMigracoesComLog(string $database, string $relativePath): int
{
    // Caminho completo para verificação
    $fullPath = database_path($relativePath);
    $this->logPretty('MIGRATE', "Executando migrations para {$database} (path: {$fullPath})", 'info');

    if (!is_dir($fullPath)) {
        $this->logPretty('MIGRATE', "Diretório não encontrado: {$fullPath}", 'error');
        throw new \Exception("Diretório de migrations não encontrado: {$fullPath}");
    }

    // Contar ficheiros
    $files = glob($fullPath . '/*.php');
    $this->logPretty('MIGRATE', "Encontradas " . count($files) . " migrações", 'info');

    // Caminho para o Artisan (deve incluir 'database/')
    $artisanPath = "database/{$relativePath}";

    // Executa as migrações
    $exitCode = Artisan::call('migrate', [
        '--database' => $database,
        '--path'     => $artisanPath,
        '--force'    => true,
    ]);

    $output = Artisan::output();
    $this->logPretty('MIGRATE', "Exit code: {$exitCode}", $exitCode === 0 ? 'success' : 'error');
    $this->logPretty('MIGRATE', "Output do Artisan:\n" . $output, 'info');

    return $exitCode;
}

    // ============================================================
    // 3. CRIAR EMPRESA (COMPLETO)
    // ============================================================
public function store(Request $request)
{
    Log::channel('single')->info("\n" . $this->getFaturajaAscii() . "\n");
    Log::channel('single')->info("\n" . $this->getSdocAscii() . "\n");
    $this->logPretty('INÍCIO', "Criando nova empresa: \"{$request->nome}\" (admin: {$request->admin_email})", 'info');

    // ⭐ VALIDAÇÃO (incluindo plano_id opcional)
    $validated = $request->validate([
        'nome'           => 'required|string|max:255',
        'nif'            => 'required|digits:10|unique:landlord.empresas,nif',
        'email'          => 'required|email|unique:landlord.empresas,email',
        'telefone'       => 'required|string|max:20',
        'endereco'       => 'required|string|max:500',
        'regime_fiscal'  => 'required|in:simplificado,geral',
        'sujeito_iva'    => 'required|boolean',
        'iva_padrao'     => 'nullable|numeric|min:0|max:100',
        'nome_banco'     => 'nullable|string|max:255',
        'numero_conta'   => 'nullable|string|max:50|unique:landlord.empresas,numero_conta',
        'iban'           => 'nullable|string|max:34|unique:landlord.empresas,iban',
        'logo'           => 'required|string|max:255',
        'subdomain'      => [
            'required',
            'string',
            'max:100',
            'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/',
            'unique:landlord.empresas,subdomain'
        ],
        'modo'           => 'required|in:colectivo,singular',
        'admin_name'     => 'required|string|max:255',
        'admin_email'    => 'required|email',
        'admin_password' => 'required|string|min:8',
        'plano_id'       => 'nullable|uuid|exists:landlord.planos,id', // ✅ novo campo opcional
    ]);

    $this->logPretty('1/6', 'Validação aprovada', 'success');

    // Geração do nome da base de dados
    $dbNameBase = 'empresa_' . Str::slug($request->nome, '_');
    $dbName     = $dbNameBase;
    $counter    = 1;
    while (!empty(DB::connection('landlord')->select("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [$dbName]))) {
        $dbName = $dbNameBase . '_' . $counter;
        $counter++;
    }

    // Criar empresa
    $empresa = Empresa::on('landlord')->create([
        'id'            => Str::uuid(),
        'nome'          => $request->nome,
        'nif'           => $request->nif,
        'email'         => $request->email,
        'telefone'      => $request->telefone,
        'endereco'      => $request->endereco,
        'db_name'       => $dbName,
        'subdomain'     => $request->subdomain,
        'modo'          => $request->modo,
        'regime_fiscal' => $request->regime_fiscal,
        'sujeito_iva'   => $request->sujeito_iva,
        'iva_padrao'    => $request->regime_fiscal === 'simplificado'
            ? 0.0
            : (float) ($request->iva_padrao ?? self::IVA_PADRAO_DEFAULT),
        'nome_banco'    => $request->nome_banco,
        'numero_conta'  => $request->numero_conta,
        'iban'          => $request->iban,
        'logo'          => $request->logo,
        'status'        => 'ativo',
        'data_registro' => now(),
    ]);

    $this->logPretty('2/6', "Empresa inserida (ID: {$empresa->id}, Subdomínio: {$empresa->subdomain}, Modo: {$empresa->modo})", 'success');

    try {
        // ⭐============================================================
        // ⭐ MODO SINGULAR: CRIA BANCO DEDICADO + MIGRATIONS TENANT
        // ⭐============================================================
        if ($request->modo === 'singular') {
            // 1. Criar base de dados
            DB::connection('landlord')
                ->statement("CREATE DATABASE `{$empresa->db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $this->logPretty('3/6', "Base de dados criada: {$empresa->db_name}", 'success');

            // 2. Configurar conexão tenant
            $this->configurarTenantConnection($empresa->db_name);
            $this->logPretty('4/6', 'Conexão tenant configurada', 'success');

            // 3. Rodar migrations do tenant (com logs)
            $exitCode = $this->executarMigracoesComLog('tenant', 'migrations/tenant');
            if ($exitCode !== 0) {
                throw new \Exception('Erro ao executar migrations do tenant. Código: ' . $exitCode);
            }
            $this->logPretty('5/6', 'Migrations do tenant executadas com sucesso', 'success');

            // ⭐ 4. CRIAR ADMIN NO BANCO TENANT (MODO SINGULAR)
            $admin = \App\Models\Tenant\User::create([
                'id'            => (string) Str::uuid(),
                'name'          => $request->admin_name,
                'email'         => $request->admin_email,
                'password'      => Hash::make($request->admin_password),
                'role'          => 'admin',
                'ativo'         => true,
                'email_verified_at' => now(),
            ]);

            $this->logPretty('6/6', "Admin criado no tenant: {$admin->email}", 'success');
        }
        // ⭐============================================================
        // ⭐ MODO COLECTIVO: USA BANCO SHARED
        // ⭐============================================================
        else {
            // Verifica se a tabela users existe no shared
            try {
                $tabelaExiste = DB::connection('shared')->table('users')->exists();
            } catch (\Exception $e) {
                $tabelaExiste = false;
                $this->logPretty('3/6', 'Tabela users não existe no shared. A executar migrations...', 'info');
            }

            if (!$tabelaExiste) {
                $this->logPretty('3/6', 'Rodando migrations do shared (primeira vez)', 'info');

                // Executa com logs detalhados
                $exitCode = $this->executarMigracoesComLog('shared', 'migrations/shared');

                if ($exitCode !== 0) {
                    throw new \Exception('Erro ao executar migrations do shared. Código: ' . $exitCode);
                }
                $this->logPretty('4/6', 'Migrations do shared executadas com sucesso', 'success');
            } else {
                $this->logPretty('3/6', 'Migrations do shared já executadas anteriormente', 'info');
            }

            // ⭐ CRIAR ADMIN NO SHARED (MODO COLECTIVO)
            $admin = \App\Models\Shared\User::create([
                'id'            => (string) Str::uuid(),
                'tenant_id'     => $empresa->id,
                'name'          => $request->admin_name,
                'email'         => $request->admin_email,
                'password'      => Hash::make($request->admin_password),
                'role'          => 'admin',
            ]);

            $this->logPretty('5/6', "Admin criado no shared: {$admin->email}", 'success');

            // ⭐ RELACIONAR ADMIN COM O TENANT (pivô user_tenant) - para controle
            try {
                DB::connection('shared')->table('user_t')->insert([
                    'id' => (string) Str::uuid(),
                    'user_id' => $admin->id,
                    'tenant_id' => $empresa->id,
                    'role' => 'admin',
                    'ativo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $this->logPretty('6/6', "Admin relacionado ao tenant {$empresa->subdomain}", 'success');
            } catch (\Exception $e) {
                // Tabela user_tenant pode não existir ainda, criar depois
                $this->logPretty('6/6', "Relacionamento não criado (tabela opcional): " . $e->getMessage(), 'warning');
            }
        }

        // ============================================================
        // ⭐ CRIA SUBSCRIÇÃO EXPERIMENTAL SE FOR PLANO GRATUITO
        // ============================================================
        if ($request->has('plano_id')) {
            try {
                $plano = Plano::on('landlord')->find($request->plano_id);
                if ($plano && $plano->valor_mensal == 0) {
                    // A subscrição é sempre na base shared (mesmo no modo singular, pois é partilhada)
                    $subscricao = \App\Models\Subscricao::on('landlord')->create([
                        'id' => (string) Str::uuid(),
                        'empresa_id' => $empresa->id,
                        'plano_id' => $plano->id,
                        'data_inicio' => now(),
                        'data_fim' => now()->addMonths($plano->duracao_meses ?? 1),
                        'status' => 'ativa',
                        'forma_pagamento' => 'gratuito',
                        'renovacao_automatica' => false,
                    ]);
                    $this->logPretty('7/7', "Subscrição experimental criada para o plano {$plano->nome} (ID: {$subscricao->id})", 'success');
                } else {
                    $this->logPretty('7/7', "Plano com ID {$request->plano_id} não é gratuito. Nenhuma subscrição criada.", 'warning');
                }
            } catch (\Exception $e) {
                $this->logPretty('7/7', "Erro ao criar subscrição experimental: " . $e->getMessage(), 'error');
                // Não interrompe o fluxo, mas loga o erro
            }
        }

        // Mover logo temporário
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

        // Log final
        $building = $this->getBuildingAscii(
            $empresa->subdomain,
            $empresa->db_name,
            $admin->email,
            $empresa->modo ?? 'colectivo'
        );
        Log::channel('single')->info("\n" . $building . "\n");

        // Registar criação de empresa na auditoria
        AuditLogger::log("Empresa Criada", "🏢", [
            'area' => 'Administração',
            'detalhes' => [
                'empresa_id' => $empresa->id,
                'empresa_nome' => $empresa->nome,
                'subdomain' => $empresa->subdomain,
                'modo' => $empresa->modo,
                'nif' => $empresa->nif,
                'admin_email' => $admin->email,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Empresa criada com sucesso!',
            'empresa' => $empresa->fresh(),
            'admin'   => $admin->only(['name', 'email']),
            'modo'    => $empresa->modo,
        ], 201);
    } catch (\Throwable $e) {
        $this->logPretty('ERRO', "Falha na criação: {$e->getMessage()}", 'error');

        // Rollback
        $empresa->delete();
        try {
            DB::connection('landlord')
                ->statement("DROP DATABASE IF EXISTS `{$empresa->db_name}`");
        } catch (\Throwable $ignored) {
        }

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

        // Só usar purge em ambiente de desenvolvimento
        if (app()->environment('local', 'testing')) {
            DB::purge('tenant');
            DB::reconnect('tenant');
        }
    }

    // ============================================================
    // 5. MOSTRAR EMPRESA POR ID (landlord)
    // ============================================================
    public function show(Empresa $empresa)
    {
        $detalhes = $this->montarDetalhesEmpresa($empresa);

        return response()->json([
            'success' => true,
            'data'    => array_merge($empresa->toArray(), [
                'detalhes' => $detalhes,
            ]),
        ], 200);
    }

    public function enviarMensagem(Request $request, Empresa $empresa)
    {
        $validated = $request->validate([
            'mensagem' => 'required|string|min:2|max:2000',
        ]);

        $landlordUser = auth('landlord_api')->user() ?? auth('landlord')->user();

        $mensagem = EmpresaMensagem::on('shared')->create([
            'empresa_id' => $empresa->id,
            'remetente_id' => $landlordUser?->id,
            'remetente_tipo' => 'landlord',
            'remetente_nome' => $landlordUser?->name ?? 'Landlord',
            'remetente_email' => $landlordUser?->email,
            'mensagem' => $validated['mensagem'],
            'lida' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mensagem enviada com sucesso.',
            'data' => $mensagem,
        ], 201);
    }

    private function montarDetalhesEmpresa(Empresa $empresa): array
    {
        $isSingular = ($empresa->modo ?? 'colectivo') === 'singular';

        if ($isSingular && ! $empresa->bancoExiste()) {
            return [
                'resumo' => [
                    'total_documentos' => 0,
                    'total_faturacao' => 0,
                    'total_recebido' => 0,
                    'saldo_pendente' => 0,
                    'total_clientes' => 0,
                    'total_utilizadores' => 0,
                    'documentos_por_tipo' => [],
                ],
                'documentos' => [
                    'total' => 0,
                    'tipos' => ['FT', 'FR', 'FP', 'FA', 'NC', 'ND', 'RC', 'FRt'],
                    'recentes' => [],
                ],
                'mensagens' => [],
                'alerta' => 'A base de dados tenant desta empresa não foi encontrada.',
            ];
        }

        if ($isSingular) {
            $empresa->conectar();

            $documentosQuery = TenantDocumentoFiscal::query();
            $clientesQuery = TenantCliente::query();
            $usuariosQuery = TenantUser::query();
            $pagamentosQuery = TenantPagamento::query();
        } else {
            $documentosQuery = SharedDocumentoFiscal::query()->where('tenant_id', $empresa->id);
            $clientesQuery = SharedCliente::query()->where('tenant_id', $empresa->id);
            $usuariosQuery = SharedUser::query()->where('tenant_id', $empresa->id);
            $pagamentosQuery = SharedPagamento::query()->where('tenant_id', $empresa->id);
        }

        $tiposFaturacao = ['FT', 'FR', 'RC'];
        $tiposTodos = ['FT', 'FR', 'FP', 'FA', 'NC', 'ND', 'RC', 'FRt'];

        $documentosBase = clone $documentosQuery;
        $documentosFaturacao = (clone $documentosQuery)
            ->whereIn('tipo_documento', $tiposFaturacao)
            ->where('estado', '!=', 'cancelado');

        $totalDocumentos = (clone $documentosBase)->count();
        $totalFaturacao = (float) $documentosFaturacao->sum('total_liquido');
        $totalRecebido = $this->calcularTotalRecebido($empresa, $isSingular);
        $totalClientes = (clone $clientesQuery)->count();
        $totalUsuarios = (clone $usuariosQuery)->count();

        $documentosPorTipo = (clone $documentosBase)
            ->select('tipo_documento', DB::raw('COUNT(*) as total'))
            ->groupBy('tipo_documento')
            ->orderBy('tipo_documento')
            ->get()
            ->map(fn ($item) => [
                'tipo' => $item->tipo_documento,
                'total' => (int) $item->total,
            ])
            ->values();

        $documentosRecentes = (clone $documentosBase)
            ->orderByDesc('data_emissao')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function ($documento) {
                return [
                    'id' => $documento->id,
                    'numero_documento' => $documento->numero_documento,
                    'tipo_documento' => $documento->tipo_documento,
                    'estado' => $documento->estado,
                    'total_liquido' => (float) $documento->total_liquido,
                    'data_emissao' => optional($documento->data_emissao)->toDateString(),
                    'hora_emissao' => $documento->hora_emissao,
                    'cliente_nome' => $documento->cliente_nome,
                    'cliente_nif' => $documento->cliente_nif,
                ];
            });

        $mensagens = EmpresaMensagem::on('shared')
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(function ($mensagem) {
                return [
                    'id' => $mensagem->id,
                    'mensagem' => $mensagem->mensagem,
                    'remetente_tipo' => $mensagem->remetente_tipo,
                    'remetente_nome' => $mensagem->remetente_nome,
                    'remetente_email' => $mensagem->remetente_email,
                    'lida' => (bool) $mensagem->lida,
                    'created_at' => optional($mensagem->created_at)?->toIso8601String(),
                ];
            });

        return [
            'resumo' => [
                'total_documentos' => $totalDocumentos,
                'total_faturacao' => $totalFaturacao,
                'total_recebido' => $totalRecebido,
                'saldo_pendente' => max(0, $totalFaturacao - $totalRecebido),
                'total_clientes' => $totalClientes,
                'total_utilizadores' => $totalUsuarios,
                'documentos_por_tipo' => $documentosPorTipo,
            ],
            'documentos' => [
                'total' => $totalDocumentos,
                'tipos' => $tiposTodos,
                'recentes' => $documentosRecentes,
            ],
            'mensagens' => $mensagens,
        ];
    }

    private function calcularTotalRecebido(Empresa $empresa, bool $isSingular): float
    {
        $connection = $isSingular ? 'tenant' : 'shared';

        if (!Schema::connection($connection)->hasTable('documentos_fiscais')) {
            return 0.0;
        }

        $query = $isSingular
            ? TenantDocumentoFiscal::query()
            : SharedDocumentoFiscal::query()->where('tenant_id', $empresa->id);

        return (float) $query
            ->whereIn('tipo_documento', ['FR', 'RC'])
            ->where('estado', 'paga')
            ->sum('total_liquido');
    }

    // ============================================================
    // 6. MOSTRAR PRÓPRIA EMPRESA (tenant autenticado)
    // ============================================================
    public function showSelf(Request $request)
    {
        $empresa = $request->attributes->get('current_empresa');

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'data'    => $empresa
        ], 200);
    }

    public function configuracoesFiscais(Request $request)
    {
        $empresa = $request->attributes->get('current_empresa');

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'configuracoes' => [
                'serie_padrao_fatura' => 'FT',
                'regime_fiscal' => $empresa->regime_fiscal ?? 'simplificado',
                'sujeito_iva' => (bool) $empresa->sujeito_iva,
            ],
        ], 200);
    }

    public function mensagensEmpresa(Request $request)
    {
        $empresa = $request->attributes->get('current_empresa');

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada.',
            ], 400);
        }

        $mensagens = EmpresaMensagem::on('shared')
            ->where('empresa_id', $empresa->id)
            ->where('eliminada_pelo_cliente', false)
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($mensagem) {
                return [
                    'id' => $mensagem->id,
                    'mensagem' => $mensagem->mensagem,
                    'remetente_tipo' => $mensagem->remetente_tipo,
                    'remetente_nome' => $mensagem->remetente_nome,
                    'remetente_email' => $mensagem->remetente_email,
                    'lida' => (bool) $mensagem->lida,
                    'lida_em' => optional($mensagem->lida_em)?->toIso8601String(),
                    'created_at' => optional($mensagem->created_at)?->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'mensagens' => $mensagens,
                'nao_lidas' => $mensagens->where('lida', false)->count(),
            ],
        ]);
    }

    public function marcarMensagemComoLida(Request $request, EmpresaMensagem $mensagem)
    {
        $empresa = $request->attributes->get('current_empresa');

        if (!$empresa || $mensagem->empresa_id !== $empresa->id) {
            return response()->json([
                'success' => false,
                'message' => 'Mensagem não encontrada para esta empresa.',
            ], 404);
        }

        if (!$mensagem->lida) {
            $mensagem->update([
                'lida' => true,
                'lida_em' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Mensagem marcada como lida.',
            'data' => $mensagem->fresh(),
        ]);
    }

    public function eliminarMensagem(Request $request, EmpresaMensagem $mensagem)
    {
        $empresa = $request->attributes->get('current_empresa');

        if (!$empresa || $mensagem->empresa_id !== $empresa->id) {
            return response()->json([
                'success' => false,
                'message' => 'Mensagem não encontrada para esta empresa.',
            ], 404);
        }

        if ($mensagem->remetente_tipo !== 'landlord') {
            return response()->json([
                'success' => false,
                'message' => 'Apenas mensagens enviadas pelo landlord podem ser eliminadas.',
            ], 403);
        }

        $mensagem->update([
            'eliminada_pelo_cliente' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mensagem eliminada com sucesso.',
        ]);
    }

    public function atualizarConfiguracoesFiscais(Request $request)
    {
        $empresa = $request->attributes->get('current_empresa');

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada.'
            ], 400);
        }

        $validated = $request->validate([
            'regime_fiscal' => 'sometimes|in:simplificado,geral',
            'sujeito_iva' => 'sometimes|boolean',
        ]);

        if (array_key_exists('regime_fiscal', $validated)) {
            $empresa->regime_fiscal = $validated['regime_fiscal'];
        }

        if (($empresa->regime_fiscal ?? 'geral') === 'simplificado') {
            $empresa->sujeito_iva = false;
            $empresa->iva_padrao = 0.0;
        } else {
            $empresa->sujeito_iva = true;
        }

        $empresa->save();

        return response()->json([
            'success' => true,
            'message' => 'Configurações fiscais atualizadas com sucesso.',
            'configuracoes' => [
                'serie_padrao_fatura' => 'FT',
                'regime_fiscal' => $empresa->regime_fiscal ?? 'simplificado',
                'sujeito_iva' => (bool) $empresa->sujeito_iva,
            ],
        ], 200);
    }

    // ============================================================
    // 7. UPLOAD DE LOGO (tenant autenticado)
    // ============================================================
    public function uploadLogo(Request $request)
    {
        $empresa = $request->attributes->get('current_empresa');

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada.'
            ], 400);
        }

        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

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
    // ============================================================
    public function updateTenant(Request $request)
    {
        $empresa = $request->attributes->get('current_empresa');

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada.'
            ], 400);
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
            'nif'           => 'sometimes|nullable|string|max:14', // + regra de formato se quiseres
            'telefone'      => 'nullable|string|max:20',
            'endereco'      => 'nullable|string|max:500',
            'nome_banco'    => 'nullable|string|max:255',
            'numero_conta'  => 'nullable|string|max:50',
            'iban'          => 'nullable|string|max:34',
            'regime_fiscal' => 'sometimes|in:simplificado,geral',
            'sujeito_iva'   => 'sometimes|boolean',
            'modo'          => 'sometimes|in:colectivo,singular',
        ]);

        $empresa->update($request->only([
            'nome',
            'email',
            'nif',
            'telefone',
            'endereco',
            'nome_banco',
            'numero_conta',
            'iban',
            'regime_fiscal',
            'sujeito_iva',
            'modo'
        ]));

        if (($empresa->regime_fiscal ?? 'geral') === 'simplificado') {
            $empresa->update([
                'sujeito_iva' => false,
                'iva_padrao' => 0.0,
            ]);
        } elseif (!$empresa->iva_padrao) {
            $empresa->update(['iva_padrao' => self::IVA_PADRAO_DEFAULT]);
        }

        Log::info('[EMPRESA] Dados atualizados pelo tenant', [
            'empresa_id' => $empresa->id,
            'modo' => $empresa->modo,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Empresa atualizada!',
            'data'    => $empresa->fresh()
        ], 200);
    }

    // ============================================================
    // 9. ATUALIZAR EMPRESA (landlord)
    // ============================================================
    public function update(Request $request, Empresa $empresa)
    {
        $request->validate([
            'nome'         => 'sometimes|string|max:255',
            'email'        => 'sometimes|email|unique:landlord.empresas,email,' . $empresa->id,
            'telefone'     => 'nullable|string',
            'endereco'     => 'nullable|string',
            'nome_banco'   => 'nullable|string|max:255',
            'numero_conta' => 'nullable|string|unique:landlord.empresas,numero_conta|max:50',
            'iban'         => 'nullable|string|max:34|unique:landlord.empresas,iban',
            'logo'         => 'nullable|string|max:255',
            'status'       => 'sometimes|in:ativo,suspenso',
            'subdomain'    => 'sometimes|string|unique:landlord.empresas,subdomain,' . $empresa->id,
            'modo'         => 'sometimes|in:colectivo,singular',
            'regime_fiscal' => 'sometimes|in:simplificado,geral',
            'sujeito_iva'  => 'sometimes|boolean',
        ]);

        $empresa->update($request->only([
            'nome',
            'email',
            'telefone',
            'endereco',
            'status',
            'nome_banco',
            'numero_conta',
            'iban',
            'logo',
            'subdomain',
            'modo',
            'regime_fiscal',
            'sujeito_iva'
        ]));

        if (($empresa->regime_fiscal ?? 'geral') === 'simplificado') {
            $empresa->update([
                'sujeito_iva' => false,
                'iva_padrao' => 0.0,
            ]);
        } elseif (!$empresa->iva_padrao) {
            $empresa->update(['iva_padrao' => self::IVA_PADRAO_DEFAULT]);
        }

        Log::info('[LANDLORD] Empresa atualizada', [
            'empresa_id' => $empresa->id,
            'modo' => $empresa->modo,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Empresa atualizada!',
            'data'    => $empresa->fresh()
        ], 200);
    }

    // ============================================================
    // 10. ALTERAR PRÓPRIO STATUS (tenant autenticado)
    // ============================================================
    public function toggleSelfStatus(Request $request)
    {
        $empresa = $request->attributes->get('current_empresa');
        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant não resolvido.'
            ], 400);
        }

        $user = $request->user();

        $statusAnterior = $empresa->status;
        $novoStatus = $statusAnterior === 'ativo' ? 'suspenso' : 'ativo';

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

        \Log::info("Empresa status alterado", [
            'empresa_id' => $empresa->id,
            'user_id'    => $user->id,
            'de'         => $statusAnterior,
            'para'       => $novoStatus,
            'modo'       => $empresa->modo,
        ]);

        $acao = $novoStatus === 'ativo' ? 'reativada' : 'suspensa';

        return response()->json([
            'success'         => true,
            'message'         => "Empresa {$acao} com sucesso.",
            'status'          => $novoStatus,
            'status_anterior' => $statusAnterior,
            'modo'            => $empresa->modo,
        ]);
    }

    // ============================================================
    // 11. ALTERAR STATUS POR LANDLORD
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
            'modo'            => $empresa->modo,
            'alterado_por'    => auth('landlord_api')->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Empresa {$novoStatus} com sucesso.",
            'status'  => $novoStatus,
            'modo'    => $empresa->modo,
        ]);
    }
}
