<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up()
    {
Schema::connection('tenant')->create('logs_auditoria', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('user_id')->references('id')->on('users')->onDelete('cascade');
    $table->string('acao');
    $table->string('entidade');
    $table->ipAddress('ip')->nullable();
   $table->timestamps();
});

    }

    public function down()
    {
        Schema::connection('tenant')->dropIfExists('logs_auditoria');
    }
};