<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTenantsTable extends Migration
{
    public function up(): void
    {
Schema::create('tenants', function (Blueprint $table) {
    $table->uuid('id')->primary(); 
    $table->string('nome');
    $table->string('nif')->unique();
    $table->string('subdomain')->unique();
    $table->string('database')->unique();
    $table->string('email')->unique();
    $table->string('logo')->nullable();
    $table->enum('status', ['ativo', 'suspenso'])->default('ativo');
    $table->timestamps();
});

    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
}
