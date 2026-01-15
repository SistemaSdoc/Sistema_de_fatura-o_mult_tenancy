<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDomainsTable extends Migration
{
    public function up(): void
    {
        Schema::create('domains', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('domain', 255)->unique();
            $table->uuid('tenant_id');

            $table->timestamps();

            $table->foreign('tenant_id')
      ->references('id')
      ->on('tenants')
      ->onDelete('cascade')
      ->onUpdate('cascade');

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('domains');
    }
}
