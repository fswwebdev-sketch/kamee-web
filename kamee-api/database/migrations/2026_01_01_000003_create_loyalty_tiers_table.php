<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->unsignedBigInteger('min_spend')->default(0);
            $table->decimal('point_multiplier', 3, 2)->default(1);
            $table->json('perks')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_tiers');
    }
};
