<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->string('customer_name');
            $table->string('customer_phone', 20)->index();
            $table->enum('fulfillment', ['pickup', 'delivery', 'dine_in']);
            $table->text('address')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->unsignedInteger('subtotal')->default(0);
            $table->unsignedInteger('discount')->default(0);
            $table->unsignedInteger('points_redeemed')->default(0);
            $table->unsignedInteger('delivery_fee')->default(0);
            $table->unsignedInteger('service_fee')->default(0);
            $table->unsignedInteger('total')->default(0);
            $table->text('note')->nullable();
            $table->enum('status', ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'])->default('pending');
            $table->enum('channel', ['web', 'whatsapp', 'pos'])->default('web');
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('cancelled_reason')->nullable();
            $table->timestamps();
            $table->index(['outlet_id', 'status', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
