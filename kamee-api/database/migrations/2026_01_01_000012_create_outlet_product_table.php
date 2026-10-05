<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outlet_product', function (Blueprint $table) {
            $table->foreignId('outlet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_available')->default(true);
            $table->timestamp('updated_at')->nullable();
            $table->primary(['outlet_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outlet_product');
    }
};
