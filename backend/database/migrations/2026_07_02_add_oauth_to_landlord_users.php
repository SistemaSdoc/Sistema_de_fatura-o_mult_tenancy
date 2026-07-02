<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection('landlord')->table('users_landlord', function (Blueprint $table) {
            // ✅ Campos para OAuth2 (Google)
            $table->string('google_id')->nullable()->unique()->after('email');
            $table->string('google_name')->nullable()->after('google_id');
            $table->string('google_avatar')->nullable()->after('google_name');

            // ✅ Marca se o usuário usou Google para registrar
            $table->boolean('oauth_verified')->default(false)->after('google_avatar');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('landlord')->table('users_landlord', function (Blueprint $table) {
            $table->dropUnique('users_landlord_google_id_unique');
            $table->dropColumn(['google_id', 'google_name', 'google_avatar', 'oauth_verified']);
        });
    }
};
