<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('series_fiscais', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Relacionamento opcional com usuário que criou a série
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            // Tipo de documento: Fatura, Recibo, Nota Crédito, Nota Débito
            $table->enum('tipo_documento', ['FT','FR','NC','ND']);

            $table->string('serie', 10);       // Série: A, B, C...
            $table->year('ano')->nullable();   // Ano da série, opcional
            $table->integer('ultimo_numero')->default(0); // último número usado
            $table->boolean('ativa')->default(true);      // se a série está ativa

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('series_fiscais');
    }
};
