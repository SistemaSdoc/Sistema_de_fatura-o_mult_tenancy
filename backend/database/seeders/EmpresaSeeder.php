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
            'nome'          => 'CONTAI-CONTABILIDADE & COMERCIO, (SU) LDA',
            'nif'           => '5001672339',
            'email'         => 'contaicontabilidade@gmail.com',
            'logo'          => '/public/images/1000041800.jpg',
            'status'        => 'ativo',
            'regime_fiscal' => 'simplificado',
            'sujeito_iva'   => true,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        /* ══════════════ UTILIZADORES ══════════════ */
        $users = [
            ['name' => 'Francisco', 'email' => 'francisco@gmail.com', 'role' => 'admin'],
            ['name' => 'Adilson Ginga', 'email' => 'adilson@gmail.com', 'role' => 'operador'],
            ['name' => 'Rebeca Caculo', 'email' => 'rebeca@gmail.com', 'role' => 'operador'],
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
