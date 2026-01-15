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
Schema::connection('tenant')->create('fornecedores', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('nome');
    $table->string('nif')->unique();
    $table->string('telefone')->nullable();
    $table->string('email')->nullable();
    $table->text('endereco')->nullable();
  $table->timestamps();
});


    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('fornecedores');
    }
};
