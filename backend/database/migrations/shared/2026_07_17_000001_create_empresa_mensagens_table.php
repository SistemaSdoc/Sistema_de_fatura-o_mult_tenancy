<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $connection = 'shared';

    public function up(): void
    {
        $schema = Schema::connection('shared');

        if (! $schema->hasTable('empresa_mensagens')) {
            $schema->create('empresa_mensagens', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('empresa_id')->index();
                $table->uuid('remetente_id')->nullable()->index();
                $table->enum('remetente_tipo', ['landlord', 'empresa']);
                $table->string('remetente_nome')->nullable();
                $table->string('remetente_email')->nullable();
                $table->text('mensagem');
                $table->boolean('lida')->default(false);
                $table->timestamp('lida_em')->nullable();
                $table->timestamps();

                $table->index(['empresa_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::connection('shared')->dropIfExists('empresa_mensagens');
    }
};