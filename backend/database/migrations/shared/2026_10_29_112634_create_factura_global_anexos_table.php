<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('shared')->create('factura_global_anexos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('documento_fiscal_id');
            $table->uuid('tenant_id')->nullable();

            $table->enum('tipo_anexo', [
                'guia_remessa',
                'guia_transporte',
                'folha_servico',
                'outro',
            ]);
            $table->string('referencia', 100);
            $table->date('data_anexo');
            $table->decimal('valor_total', 15, 2)->nullable();
            $table->text('observacoes')->nullable();

            $table->timestamps();

            $table->foreign('documento_fiscal_id')
                ->references('id')->on('documentos_fiscais')
                ->cascadeOnDelete();

            $table->index(['tenant_id', 'documento_fiscal_id'], 'idx_anexos_doc');
        });
    }

    public function down(): void
    {
        Schema::connection('shared')->dropIfExists('factura_global_anexos');
    }
};