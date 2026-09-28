<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone_wa', 20)->unique();
            $table->string('email')->nullable();
            $table->date('birth_date')->nullable();
            $table->integer('points_balance')->default(0);
            $table->unsignedBigInteger('lifetime_spend')->default(0);
            $table->foreignId('tier_id')->nullable()->constrained('loyalty_tiers')->nullOnDelete();
            $table->string('referral_code', 12)->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
