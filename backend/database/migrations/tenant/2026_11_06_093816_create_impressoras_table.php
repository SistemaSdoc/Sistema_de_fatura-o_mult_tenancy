<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;  

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('impressoras', function (Blueprint $table) {
            $table->uuid('id')->primary();
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
        Schema::dropIfExists('impressoras');
    }
};