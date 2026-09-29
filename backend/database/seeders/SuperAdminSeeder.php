<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Verifica se já existe para não duplicar
        $existe = DB::table('users_landlord')
            ->where('email', 'sdoca@gmail')
            ->exists();

        if ($existe) {
            $this->command->warn('Super admin já existe. Nada foi criado.');
            return;
        }

        DB::table('users_landlord')->insert([
            'id'                => (string) Str::uuid(),
            'empresa_id'        => null,
            'empresa_id_atual'  => null,
            'name'              => 'Sdoca',
            'email'             => 'sdoca@gmail',
            'google_id'         => null,
            'google_name'       => null,
            'google_avatar'     => null,
            'oauth_verified'    => 0,
            'password'          => Hash::make('12345678'),
            'role'              => 'super_admin',
            'ativo'             => 1,
            'ultimo_login'      => null,
            'email_verified_at' => now(),
            'remember_token'    => null,
            'created_at'        => now(),
            'updated_at'        => now(),
            'deleted_at'        => null,
        ]);

        $this->command->info('Super admin criado com sucesso!');
        $this->command->line('Email: sdoca@gmail');
        $this->command->line('Senha: 12345678');
    }
}