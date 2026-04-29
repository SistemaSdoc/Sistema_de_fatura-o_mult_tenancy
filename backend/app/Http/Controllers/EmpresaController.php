<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

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
        $request->validate([
            'nome' => 'required|string|max:255',
            'nif' => 'required|string|unique:landlord.empresas', // especificar conexão na validação
            'email' => 'required|email|unique:landlord.empresas',
            'regime_fiscal' => 'required|in:simplificado,geral',
        ]);

        DB::connection('landlord')->beginTransaction();

        try {
            // 1️⃣ Criar empresa no landlord
            $empresa = Empresa::on('landlord')->create([
                'id' => Str::uuid(),
                'nome' => $request->nome,
                'nif' => $request->nif,
                'email' => $request->email,
                'telefone' => $request->telefone,
                'endereco' => $request->endereco,
                'db_name' => 'empresa_' . strtolower(Str::random(12)), // sem hífen, sem UUID longo
                'regime_fiscal' => $request->regime_fiscal,
                'sujeito_iva' => $request->sujeito_iva ?? true,
                'status' => 'ativo',
                'data_registro' => now(),
            ]);

            // 2️⃣ Criar banco físico do tenant
            DB::connection('landlord')
                ->statement("CREATE DATABASE `{$empresa->db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

            // 3️⃣ 🎯 CONFIGURAR CONEXÃO DINÂMICA DO TENANT
            $this->configurarTenantConnection($empresa->db_name);

            // 4️⃣ Rodar migrations do tenant
            Artisan::call('migrate', [
                '--database' => 'tenant',
                '--path' => 'database/migrations/tenant',
                '--force' => true,
            ]);

            // 5️⃣ Seed inicial (configurações padrão, admin, etc)
            Artisan::call('db:seed', [
                '--database' => 'tenant',
                '--class' => 'TenantDatabaseSeeder',
                '--force' => true,
            ]);

            DB::connection('landlord')->commit();

            return response()->json([
                'success' => true,
                'message' => 'Empresa criada com sucesso!',
                'data' => $empresa->fresh()
            ], 201);

        } catch (\Throwable $e) {
            DB::connection('landlord')->rollBack();
            
            // 🧹 Cleanup: tentar remover banco se criado
            if (isset($empresa) && $empresa->db_name) {
                try {
                    DB::connection('landlord')
                        ->statement("DROP DATABASE IF EXISTS `{$empresa->db_name}`");
                } catch (\Throwable $ignored) {}
            }

            return response()->json([
                'success' => false,
                'message' => 'Falha ao criar empresa: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Configura conexão do tenant dinamicamente
     */
    private function configurarTenantConnection(string $database): void
    {
        config(['database.connections.tenant.database' => $database]);
        
        // 🔄 Forçar reconexão (ESSENCIAL!)
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

        // ⚠️ NÃO permitir alterar db_name, nif, regime_fiscal facilmente
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
     * Suspender/Ativar empresa
     */
    public function toggleStatus(Empresa $empresa)
    {
        $empresa->update([
            'status' => $empresa->status === 'ativo' ? 'suspenso' : 'ativo'
        ]);

        return response()->json([
            'success' => true,
            'message' => $empresa->status === 'ativo' ? 'Empresa ativada' : 'Empresa suspensa'
        ]);
    }
}