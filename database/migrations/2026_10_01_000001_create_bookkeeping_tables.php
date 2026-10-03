<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->string('name', 120);
            $table->string('kind', 20)->default('bahan');          // bahan | kemasan
            $table->string('unit', 10)->default('gram');           // ml | gram | pcs
            $table->string('pack_label', 100)->nullable();
            $table->decimal('pack_size', 14, 3)->default(1);
            $table->unsignedInteger('pack_price')->default(0);
            $table->decimal('stock_qty', 16, 3)->default(0);       // cache jumlah semua mutasi
            $table->decimal('min_stock', 14, 3)->nullable();
            $table->string('note')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['outlet_id', 'kind']);
        });

        Schema::create('stock_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->date('date');
            $table->string('supplier', 150)->nullable();
            $table->string('method', 20)->default('cash');
            $table->string('bank', 50)->nullable();
            $table->string('note')->nullable();
            $table->unsignedBigInteger('total')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['outlet_id', 'date']);
        });

        Schema::create('stock_purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained()->restrictOnDelete();
            $table->decimal('packs', 12, 3);
            $table->unsignedInteger('pack_price');
            $table->decimal('pack_size', 14, 3);
            $table->decimal('qty', 16, 3);
            $table->unsignedBigInteger('subtotal');
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);                            // opening | purchase | sale | sale_reversal | adjustment
            $table->decimal('qty', 16, 3);                         // bertanda: + masuk, − keluar
            $table->decimal('unit_cost', 14, 4)->nullable();
            $table->string('reference', 100)->nullable();
            $table->string('note')->nullable();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('stock_purchase_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['ingredient_id', 'created_at']);
        });

        Schema::create('recipes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('outlet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_sample')->default(false);
            $table->text('note')->nullable();                      // cara membuat (opsional)
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['outlet_id', 'product_id']);
        });

        Schema::create('recipe_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipe_id')->constrained()->cascadeOnDelete();
            $table->string('option_name', 100)->nullable();        // nama opsi grup "Ukuran"; null = tanpa ukuran
            $table->foreignId('ingredient_id')->constrained()->cascadeOnDelete();
            $table->decimal('qty', 14, 3);
            $table->index(['recipe_id', 'option_name']);
        });

        Schema::create('cash_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->date('date');
            $table->string('type', 10);                            // income | expense
            $table->string('category', 30);
            $table->string('description');
            $table->unsignedBigInteger('amount');
            $table->string('method', 20)->default('cash');
            $table->string('bank', 50)->nullable();
            $table->string('counterparty', 100)->nullable();
            $table->string('note')->nullable();
            $table->string('source', 20)->default('manual');      // manual | stock_purchase
            $table->foreignId('stock_purchase_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['outlet_id', 'date']);
            $table->index(['type', 'date']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('stock_deducted_at')->nullable()->after('completed_at');
            $table->timestamp('stock_reversed_at')->nullable()->after('stock_deducted_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['stock_deducted_at', 'stock_reversed_at']);
        });

        Schema::dropIfExists('cash_entries');
        Schema::dropIfExists('recipe_items');
        Schema::dropIfExists('recipes');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stock_purchase_items');
        Schema::dropIfExists('stock_purchases');
        Schema::dropIfExists('ingredients');
    }
};
