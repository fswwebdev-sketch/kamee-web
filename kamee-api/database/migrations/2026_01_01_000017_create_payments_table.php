<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->enum('method', ['qris', 'ewallet', 'bank_transfer', 'cash']);
            $table->string('provider', 30);
            $table->string('provider_ref', 100)->nullable()->unique();
            $table->unsignedInteger('amount');
            $table->enum('status', ['pending', 'paid', 'expired', 'failed', 'refunded'])->default('pending');
            $table->text('qr_string')->nullable();
            $table->string('va_number', 50)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
