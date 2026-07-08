<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('planos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nome', 100);
            $table->text('descricao')->nullable();
            $table->decimal('valor_trimestral', 10, 2)->nullable();
            $table->decimal('valor_semestral', 10, 2)->nullable();
            $table->decimal('valor_mensal', 10, 2);
            $table->decimal('valor_anual', 10, 2)->nullable();
            $table->integer('duracao_meses')->default(1); // 1=mensal, 12=anual
            $table->boolean('ativo')->default(true);
            $table->timestamps(); // created_at e updated_at
        });
    }

    public function down()
    {
        Schema::dropIfExists('planos');
    }
};