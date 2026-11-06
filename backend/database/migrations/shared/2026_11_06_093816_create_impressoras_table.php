<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('shared')->create('impressoras', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('nome');
            $table->string('queue');
            $table->string('tipo')->default('cups'); // cups | windows | usb
            $table->boolean('is_default')->default(false);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('shared')->dropIfExists('impressoras');
    }
};