<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmpresaSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        /* ══════════════ EMPRESA ══════════════ */
        $empresaId = (string) Str::uuid();
        DB::table('empresas')->insert([
            'id'            => $empresaId,
            'nome'          => 'SDOCA-Comercio e Serviços, Lda',
            'nif'           => '5001160419',
            'email'         => 'gera@sdoca.it.ao',
            'logo'          => '/public/images/3.png',
            'status'        => 'ativo',
            'regime_fiscal' => 'geral',
            'sujeito_iva'   => true,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        /* ══════════════ UTILIZADORES ══════════════ */
        $users = [
            ['name' => 'sdoca', 'email' => 'sdoca@gmail.com', 'role' => 'admin'],
            ['name' => 'diniz', 'email' => 'dinizcabenda@gmail.com', 'role' => 'operador'],
        ];

        foreach ($users as $user) {
            DB::table('users')->insert([
                'id'           => (string) Str::uuid(),
                'empresa_id'   => $empresaId,
                'name'         => $user['name'],
                'email'        => $user['email'],
                'password'     => Hash::make('123456'),
                'role'         => $user['role'],
                'ativo'        => true,
                'ultimo_login' => null,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }


    }
}
