<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
  // migration
public function up()
{
    Schema::connection('shared')->create('saft_export_logs', function (Blueprint $table) {
        $table->id();
        $table->uuid('empresa_id');
        $table->uuid('tenant_id');
 // landlord
        $table->integer('ano');
        $table->integer('mes');
        $table->timestamp('exportado_em')->useCurrent();
        $table->uuid('user_id')->nullable(); // quem exportou
        $table->string('caminho_arquivo')->nullable();
        $table->timestamps();

        $table->index(['empresa_id', 'ano', 'mes']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('shared')->dropIfExists('saft_export_logs');
    }
};
