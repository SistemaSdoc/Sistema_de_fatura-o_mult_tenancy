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
            'nome'          => 'MWAMBA-COMERCIAL, COMERCI A RETALHO',
            'nif'           => '2484011121',
            'email'         => 'mwamba@gmail.com',
            'logo'          => '/public/images/mwamba.jpeg',
            'status'        => 'ativo',
            'regime_fiscal' => 'geral',
            'sujeito_iva'   => true,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        /* ══════════════ UTILIZADORES ══════════════ */
        $users = [
            ['name' => 'mwanba1', 'email' => 'mwamba1@gmail.com', 'role' => 'operador'],
            ['name' => 'Mwamba', 'email' => 'mwamba@gmail.com', 'role' => 'admin'],
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
