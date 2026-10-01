<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    protected $connection = 'landlord';

    public function up(): void
    {
        DB::connection($this->connection)->statement("
            ALTER TABLE notificacoes
            MODIFY COLUMN tipo ENUM('info', 'success', 'warning', 'danger')
            NOT NULL DEFAULT 'info'
        ");
    }

    public function down(): void
    {
        DB::connection($this->connection)->statement("
            ALTER TABLE notificacoes
            MODIFY COLUMN tipo ENUM('info', 'warning', 'danger')
            NOT NULL DEFAULT 'info'
        ");
    }
};