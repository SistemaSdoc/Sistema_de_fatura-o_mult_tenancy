<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Tabela: users (landlord)
     * Propósito: Super admins que gerenciam o sistema Faturaja
     * Acesso: Todas as empresas, configurações globais, relatórios cross-tenant
     */
    
    public function up(): void
    {
        Schema::create('users_landlord', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // 🔗 Opcional: link para empresa se for admin específico de uma empresa
            // Null = super admin (acessa tudo)
            $table->uuid('empresa_id')->nullable();
            $table->foreign('empresa_id')->references('id')->on('empresas')->nullOnDelete();
            
            // Dados básicos
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            
            // Níveis de acesso
            // super_admin: acesso total a todas as empresas
            // admin_empresa: admin de uma empresa específica (empresa_id obrigatório)
            $table->enum('role', ['super_admin', 'suporte'])->default('suporte');
            
            $table->boolean('ativo')->default(true);
            $table->timestamp('ultimo_login')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users_landlord');
    }
};