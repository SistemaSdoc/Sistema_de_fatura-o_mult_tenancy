<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'landlord';

    public function up(): void
    {
        if (!Schema::connection($this->connection)->hasColumn('pagamentos', 'historico_status')) {
            Schema::connection($this->connection)->table('pagamentos', function (Blueprint $table) {
                $table->json('historico_status')->nullable()->after('motivo_rejeicao');
            });
        }
    }

    public function down(): void
    {
        if (Schema::connection($this->connection)->hasColumn('pagamentos', 'historico_status')) {
            Schema::connection($this->connection)->table('pagamentos', function (Blueprint $table) {
                $table->dropColumn('historico_status');
            });
        }
    }
};