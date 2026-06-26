<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('shared')->create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->uuid('user_id')->nullable()->index();
            $table->string('tokenable_id', 36); // ID do usuário
            $table->string('tokenable_type');
            $table->index(['tokenable_id', 'tokenable_type']);
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('shared')->dropIfExists('personal_access_tokens');
    }
};
