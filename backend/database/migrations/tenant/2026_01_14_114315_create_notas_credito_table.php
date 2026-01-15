<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up()
    {
Schema::connection('tenant')->create('notas_credito', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('fatura_id')->references('id')->on('faturas')->onDelete('cascade');
    $table->string('numero')->unique();
    $table->string('motivo');
    $table->decimal('valor', 12, 2);
  $table->timestamps();
});

    }

    public function down()
    {
        Schema::connection('tenant')->dropIfExists('notas_credito');
    }
};