<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('subscricoes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Chave para a empresa (tenant)
            $table->uuid('empresa_id');
            $table->foreign('empresa_id')->references('id')->on('empresas')->onDelete('cascade');
            
            // Chave para o plano assinado
            $table->uuid('plano_id');
            $table->foreign('plano_id')->references('id')->on('planos')->onDelete('restrict');
            
            // Dados da assinatura
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->string('status', 20)->default('ativa'); // ativa, cancelada, expirada, pendente
            $table->string('forma_pagamento', 50)->nullable();
            $table->boolean('renovacao_automatica')->default(true);
            $table->date('cancelado_em')->nullable();
            
            // Opcional: quem cadastrou (usuário landlord) – apenas para auditoria
            $table->uuid('criado_por')->nullable();
            $table->foreign('criado_por')->references('id')->on('users_landlord')->onDelete('set null');
            
            $table->timestamps();

            // Índices
            $table->index('empresa_id');
            $table->index('plano_id');
            $table->index('status');
            $table->index('data_inicio');
            $table->index('data_fim');
        });
    }

    public function down()
    {
        Schema::dropIfExists('subscricoes');
    }
};