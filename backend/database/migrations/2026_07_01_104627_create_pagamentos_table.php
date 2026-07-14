<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('pagamentos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('plano_id')->nullable();
            $table->uuid('empresa_id')->nullable();
            $table->uuid('subscricao_id')->nullable();


            $table->foreign('subscricao_id')
                  ->references('id')
                  ->on('subscricoes')
                  ->onDelete('cascade');

            $table->foreign('empresa_id')
                ->references('id')
                ->on('empresas')
                ->nullOnDelete();

           $table->foreign('plano_id')
                ->references('id')
                ->on('planos')
                ->nullOnDelete();
      
            $table->decimal('valor', 10, 2);
            $table->timestamp('data_pagamento')->nullable(); // sem useCurrent
            $table->date('data_vencimento')->nullable();
            $table->string('status', 20)->default('pendente'); // pendente, pago, falhou, estornado
            $table->string('metodo_pagamento', 50)->nullable();
            $table->string('codigo_transacao', 100)->nullable();
            $table->text('descricao')->nullable();
            $table->integer('parcelas')->default(1);
            $table->text('motivo_rejeicao')->nullable();
            $table->string('comprovativo_path')->nullable();
            $table->timestamps();

            $table->index('subscricao_id');
            $table->index('status');
            $table->index('data_vencimento');

        });
    }

    public function down()
    {
        Schema::dropIfExists('pagamentos');
    }
};