<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'landlord';

    public function up(): void
    {
        if (!Schema::connection($this->connection)->hasColumn('notificacoes', 'lida_em')) {
            Schema::connection($this->connection)->table('notificacoes', function (Blueprint $table) {
                $table->timestamp('lida_em')->nullable()->after('lida');
            });
        }
    }

    public function down(): void
    {
        if (Schema::connection($this->connection)->hasColumn('notificacoes', 'lida_em')) {
            Schema::connection($this->connection)->table('notificacoes', function (Blueprint $table) {
                $table->dropColumn('lida_em');
            });
        }
    }
};