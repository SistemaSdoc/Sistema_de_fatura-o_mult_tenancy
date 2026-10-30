<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $connection = 'shared';

    public function up(): void
    {
        if (! Schema::connection('shared')->hasColumn('users', 'email_verified_at')) {
            Schema::connection('shared')->table('users', function (Blueprint $table) {
                $table->timestamp('email_verified_at')->nullable()->after('printer_ip');
            });
        }
    }

    public function down(): void
    {
        if (Schema::connection('shared')->hasColumn('users', 'email_verified_at')) {
            Schema::connection('shared')->table('users', function (Blueprint $table) {
                $table->dropColumn('email_verified_at');
            });
        }
    }
};