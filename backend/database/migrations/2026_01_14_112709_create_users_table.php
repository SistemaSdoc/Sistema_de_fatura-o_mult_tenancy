<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
Schema::create('users', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('empresa_id');
    $table->foreign('empresa_id')->references('id')->on('empresas');


    $table->string('name');
    $table->string('email')->unique();
    $table->string('password');

    $table->enum('role', ['admin', 'operador', 'contablista'])->default('operador');
    $table->boolean('ativo')->default(true);
    $table->timestamp('ultimo_login')->nullable();

    $table->timestamps();
});

    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
