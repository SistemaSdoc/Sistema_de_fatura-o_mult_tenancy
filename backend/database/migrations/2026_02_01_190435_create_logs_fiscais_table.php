<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('entidade');       // tabela afetada
            $table->uuid('entidade_id');      // registro afetado

            $table->enum('acao', ['criar','emitir','anular','fechar','pagar']);
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users');

            $table->timestamp('data_acao')->useCurrent();
            $table->text('detalhe')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs_fiscais');
    }
};
