<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');

            $table->enum('role', ['admin', 'operador', 'contablista', 'gestor'])->default('operador');
            $table->boolean('ativo')->default(true);
            $table->timestamp('ultimo_login')->nullable();
            $table->string('printer_ip')->nullable();

            $table->timestamps(); // já está aqui dentro do create
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};