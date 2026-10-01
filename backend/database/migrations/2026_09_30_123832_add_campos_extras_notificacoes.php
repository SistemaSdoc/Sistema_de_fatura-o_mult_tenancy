<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'landlord';

    public function up(): void
    {
        Schema::connection($this->connection)->table('notificacoes', function (Blueprint $table) {
            // Contexto
            $table->uuid('empresa_id')->nullable()->after('user_id');
            $table->string('tipo_evento', 60)->nullable()->after('tipo')->comment('Ex: empresa_criada, subscricao_experimental');
            $table->json('dados')->nullable()->after('mensagem');
            $table->string('url', 500)->nullable()->after('dados');

            // Estado do email
            $table->boolean('enviada_email')->default(false)->after('lida');
            $table->timestamp('enviada_email_em')->nullable()->after('enviada_email');
            $table->text('email_erro')->nullable()->after('enviada_email_em');

            // Índices para o dashboard
            $table->index(['user_id', 'lida', 'created_at'], 'idx_notif_user_lida_created');
            $table->index('empresa_id', 'idx_notif_empresa');
            $table->index('tipo_evento', 'idx_notif_tipo_evento');
        });
    }

    public function down(): void
    {
        Schema::connection($this->connection)->table('notificacoes', function (Blueprint $table) {
            $table->dropIndex('idx_notif_user_lida_created');
            $table->dropIndex('idx_notif_empresa');
            $table->dropIndex('idx_notif_tipo_evento');

            $table->dropColumn([
                'empresa_id',
                'tipo_evento',
                'dados',
                'url',
                'enviada_email',
                'enviada_email_em',
                'email_erro',
            ]);
        });
    }
};