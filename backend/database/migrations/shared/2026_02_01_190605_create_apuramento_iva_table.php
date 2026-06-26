<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('shared')->create('apuramento_iva', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');


            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users');

            $table->string('periodo', 7); // formato MM/YYYY

            $table->decimal('iva_liquidado', 12, 2)->default(0); // vendas
            $table->decimal('iva_dedutivel', 12, 2)->default(0); // compras
            $table->decimal('iva_a_pagar', 12, 2)->default(0);   // diferença

            $table->enum('estado', ['aberto','fechado'])->default('aberto');
            $table->timestamp('data_fecho')->nullable(); // quando fechado

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('shared')->dropIfExists('apuramento_iva');
    }
};
