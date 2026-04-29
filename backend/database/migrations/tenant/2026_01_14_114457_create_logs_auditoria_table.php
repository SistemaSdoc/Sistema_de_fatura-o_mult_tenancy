<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs_auditoria', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users');

            $table->string('entidade');         // tabela afetada
            $table->uuid('entidade_id')->nullable(); // registro afetado

            $table->enum('acao', ['criar','emitir','anular','fechar']); 

            $table->ipAddress('ip')->nullable();
            $table->text('detalhe')->nullable(); // informações adicionais

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs_fiscais');
    }
};
