<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FreelancerController extends Controller
{
    /**
     * Criar Empresa Freelancer no modo shared/colectivo
     * 
     * ✅ Chamado APÓS autenticação Google
     * ✅ Cria Empresa com modo='colectivo'
     * ✅ Cria SharedUser com email do Google
     * ✅ Retorna status de onboarding
     */
    public function criarEmpresaSingular(Request $request)
    {
        $landlordUser = Auth::guard('landlord_api')->user();

        if (!$landlordUser) {
            Log::warning('[FREELANCER] Usuário não autenticado');
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        Log::info('[FREELANCER::criar] Início', ['user_id' => $landlordUser->id, 'email' => $landlordUser->email]);

        // ✅ Validar dados
        $validated = $request->validate([
            'nome' => 'required|string|max:255',
            'subdomain' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/',
                'unique:landlord.empresas,subdomain'
            ],
        ]);

        try {
            // O fluxo Google/freelancer deve usar o banco shared.
            $modo = 'colectivo';
            $dbName = config('database.connections.shared.database', env('DB_SHARED_DATABASE', 'faturaja_shared'));

            // 2️⃣ Criar Empresa
            $empresa = Empresa::create([
                'id' => Str::uuid(),
                'nome' => $validated['nome'],
                'nif' => null, // ✅ Será preenchido no onboarding
                'email' => $landlordUser->email,
                'telefone' => null, // ✅ Será preenchido no onboarding
                'endereco' => null, // ✅ Será preenchido no onboarding
                'db_name' => $dbName,
                'subdomain' => $validated['subdomain'],
                'modo' => $modo,
                'regime_fiscal' => 'simplificado', // ✅ Default para freelancer
                'sujeito_iva' => false, // ✅ Opcional para shared/colectivo
                'iva_padrao' => 0.0,
                'logo' => null, // ✅ Será preenchido no onboarding
                'status' => 'ativo',
                'data_registro' => now(),
            ]);

            Log::info('[FREELANCER::criar] Empresa criada', ['empresa_id' => $empresa->id]);

            // 3️⃣ Garantir que as migrations shared existem
            try {
                DB::connection('shared')->table('users')->exists();
            } catch (\Throwable $e) {
                Log::info('[FREELANCER::criar] Shared sem tabelas, executando migrations', [
                    'error' => $e->getMessage(),
                ]);

                $exitCode = Artisan::call('migrate', [
                    '--database' => 'shared',
                    '--path' => 'database/migrations/shared',
                    '--force' => true,
                ]);

                if ($exitCode !== 0) {
                    throw new \Exception('Erro ao executar migrations do shared');
                }
            }

            // 4️⃣ Criar SharedUser (admin por padrão)
            $sharedUser = SharedUser::create([
                'id' => Str::uuid(),
                'user_id' => $landlordUser->id,
                'name' => $landlordUser->name,
                'email' => $landlordUser->email,
                'password' => Hash::make(Str::random(32)), // ✅ Não será usado (OAuth)
                'role' => 'admin', // ✅ Primeira vez é sempre admin
                'tenant_id' => $empresa->id,
                'ativo' => true,
            ]);

            $sharedUser->forceFill([
                'email_verified_at' => now(),
                'ultimo_login' => now(),
            ])->save();

            Log::info('[FREELANCER::criar] SharedUser criado', ['user_id' => $sharedUser->id]);

            // 5️⃣ Atualizar LandlordUser com referência à empresa
            $landlordUser->update([
                'empresa_id' => $empresa->id,
                'empresa_id_atual' => $empresa->id,
            ]);

            // 6️⃣ ESTABELECER SESSÃO DO TENANT
            $request->session()->put([
                'tenant_id'      => $empresa->id,
                'tenant_db'      => $dbName,
                'tenant_nome'    => $empresa->nome,
                'tenant_modo'    => $modo,
                'user_tenant_id' => $sharedUser->id,
                'user_email'     => $sharedUser->email,
                'login_modo'     => 'google-onboarding',
                'login_at'       => now()->toIso8601String(),
                'landlord_user_id' => $landlordUser->id,
            ]);

            Log::info('[FREELANCER::criar] Sessão tenant estabelecida', [
                'tenant_id' => $empresa->id,
                'user_id' => $sharedUser->id,
                'modo' => $modo,
            ]);

            // 7️⃣ Retornar resposta com status de onboarding
            return response()->json([
                'success' => true,
                'message' => 'Empresa criada com sucesso. Complete seu perfil.',
                'data' => [
                    'empresa_id' => $empresa->id,
                    'subdomain' => $empresa->subdomain,
                    'nome' => $empresa->nome,
                    'modo' => $empresa->modo,
                    'onboarding_status' => 'pending_profile', // ✅ Indica que precisa completar dados
                    'required_fields' => ['nif', 'telefone', 'nome_banco', 'numero_conta', 'iban', 'logo'],
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('[FREELANCER::criar] Erro', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // ✅ Limpar empresa criada se houve erro
            try {
                if (isset($empresa->id)) {
                    $empresa->delete();
                }
            } catch (\Exception $cleanupError) {
                Log::error('[FREELANCER::criar] Erro ao limpar', ['error' => $cleanupError->getMessage()]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar empresa: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verificar status de onboarding
     */
    public function obterStatusOnboarding()
    {
        $landlordUser = Auth::guard('landlord_api')->user();

        if (!$landlordUser) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        if (!$landlordUser->empresa_id) {
            return response()->json([
                'status' => 'no_empresa',
                'message' => 'Usuário não tem empresa associada',
            ]);
        }

        $empresa = Empresa::find($landlordUser->empresa_id);

        if (!$empresa) {
            return response()->json(['message' => 'Empresa não encontrada'], 404);
        }

        // ✅ Verificar quais campos faltam
        $requiredFields = [];
        if (empty($empresa->nif)) $requiredFields[] = 'nif';
        if (empty($empresa->telefone)) $requiredFields[] = 'telefone';
        if (empty($empresa->nome_banco)) $requiredFields[] = 'nome_banco';
        if (empty($empresa->numero_conta)) $requiredFields[] = 'numero_conta';
        if (empty($empresa->iban)) $requiredFields[] = 'iban';
        if (empty($empresa->logo)) $requiredFields[] = 'logo';

        $isComplete = count($requiredFields) === 0;

        return response()->json([
            'success' => true,
            'status' => $isComplete ? 'complete' : 'pending',
            'empresa' => [
                'id' => $empresa->id,
                'nome' => $empresa->nome,
                'subdomain' => $empresa->subdomain,
                'modo' => $empresa->modo,
            ],
            'incomplete_fields' => $requiredFields,
            'message' => $isComplete
                ? 'Perfil completo! Pronto para gerar faturas.'
                : 'Complete seu perfil para ativar geração de faturas.',
        ]);
    }

    /**
     * Atualizar dados de empresa do freelancer
     */
    public function atualizarDadosEmpresa(Request $request)
    {
        $landlordUser = Auth::guard('landlord_api')->user();

        if (!$landlordUser || !$landlordUser->empresa_id) {
            return response()->json(['message' => 'Não autenticado ou sem empresa'], 401);
        }

        $empresa = Empresa::find($landlordUser->empresa_id);
        if (!$empresa) {
            return response()->json(['message' => 'Empresa não encontrada'], 404);
        }

        // ✅ Validar campos de perfil freelancer/shared
        $validated = $request->validate([
            'nif' => [
                'nullable',
                'string',
                'max:14',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $clean = preg_replace('/[^A-Za-z0-9]/', '', $value);
                        // Aceita: 10 dígitos (NIF) ou 9 números + 2 letras + 3 números (BI)
                        if (!preg_match('/^\d{10}$|^\d{9}[A-Z]{2}\d{3}$/', $clean)) {
                            $fail('NIF inválido. Use 10 dígitos ou BI (9+2+3).');
                        }
                    }
                },
            ],
            'telefone' => 'nullable|string|max:20',
            'nome_banco' => 'nullable|string|max:255',
            'numero_conta' => 'nullable|string|max:50',
            'iban' => 'nullable|string|max:34',
            'logo' => 'nullable|string|max:500', // URL da logo
            'endereco' => 'nullable|string|max:500',
        ]);

        try {
            // ✅ Normalizar NIF se fornecido
            if (!empty($validated['nif'])) {
                $validated['nif'] = preg_replace('/[^A-Za-z0-9]/', '', $validated['nif']);
                $validated['nif'] = strtoupper($validated['nif']);
            }

            // ✅ Atualizar empresa
            $empresa->update($validated);

            Log::info('[FREELANCER::atualizar] Dados atualizados', [
                'empresa_id' => $empresa->id,
                'campos' => array_keys($validated),
            ]);

            // ✅ Verificar se está completo agora
            $requiredFields = [];
            $empresa->refresh();

            if (empty($empresa->nif)) $requiredFields[] = 'nif';
            if (empty($empresa->telefone)) $requiredFields[] = 'telefone';
            if (empty($empresa->nome_banco)) $requiredFields[] = 'nome_banco';
            if (empty($empresa->numero_conta)) $requiredFields[] = 'numero_conta';
            if (empty($empresa->iban)) $requiredFields[] = 'iban';
            if (empty($empresa->logo)) $requiredFields[] = 'logo';

            $isComplete = count($requiredFields) === 0;

            return response()->json([
                'success' => true,
                'message' => $isComplete
                    ? 'Perfil completo! Pronto para gerar faturas.'
                    : 'Dados atualizados. Complete os campos faltantes.',
                'data' => [
                    'empresa' => $empresa->only([
                        'id',
                        'nome',
                        'nif',
                        'telefone',
                        'email',
                        'endereco',
                        'nome_banco',
                        'numero_conta',
                        'iban',
                        'logo',
                        'subdomain'
                    ]),
                    'status' => $isComplete ? 'complete' : 'pending',
                    'incomplete_fields' => $requiredFields,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('[FREELANCER::atualizar] Erro', [
                'error' => $e->getMessage(),
                'empresa_id' => $empresa->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar dados: ' . $e->getMessage(),
            ], 500);
        }
    }
}
