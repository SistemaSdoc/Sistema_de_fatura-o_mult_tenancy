<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('planos_features', function (Blueprint $table) {
            $table->uuid('plano_id');
            $table->uuid('feature_id');  // Chaves estrangeiras (com referência explícita)
            $table->foreign('plano_id')
                  ->references('id')
                  ->on('planos')
                  ->onDelete('cascade');
                  
            $table->foreign('feature_id')
                  ->references('id')
                  ->on('features')
                  ->onDelete('cascade');
            $table->integer('quantidade')->default(1);  // ex: 5 usuários
            $table->string('unidade', 20)->nullable();  // ex: 'usuários', 'GB'
            $table->primary(['plano_id', 'feature_id']);
            $table->timestamps(); // opcional, mas útil
        });
    }

    public function down()
    {
        Schema::dropIfExists('planos_features');
    }
};