<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('option_group_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->integer('price_delta')->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('options');
    }
};
