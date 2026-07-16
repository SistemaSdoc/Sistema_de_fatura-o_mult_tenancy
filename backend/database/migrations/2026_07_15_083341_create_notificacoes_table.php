<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up()
{
    Schema::create('notificacoes', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->string('titulo');
        $table->text('mensagem');
        $table->enum('tipo', ['info', 'warning', 'danger'])->default('info');
        $table->boolean('lida')->default(false);
        $table->uuid('user_id')->nullable()->comment('Se null, é notificação global');
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notificacaos');
    }
};
