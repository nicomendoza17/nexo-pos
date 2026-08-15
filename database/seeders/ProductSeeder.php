<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Bebidas' => 'category-bebidas',
            'Panadería' => 'category-panaderia',
            'Snacks' => 'category-snacks',
            'Postres' => 'category-postres',
        ];

        $catIds = [];
        foreach ($categories as $name => $slug) {
            $cat = Category::firstOrCreate(['name' => $name]);
            $catIds[$name] = $cat->id;
        }

        $products = [
            ['category' => 'Bebidas', 'name' => 'Café americano', 'emoji' => '☕', 'price' => 8.5, 'stock' => 42, 'barcode' => '7750001000001'],
            ['category' => 'Bebidas', 'name' => 'Cappuccino', 'emoji' => '🥤', 'price' => 11.0, 'stock' => 30, 'barcode' => '7750001000002'],
            ['category' => 'Panadería', 'name' => 'Croissant', 'emoji' => '🥐', 'price' => 6.5, 'stock' => 18, 'barcode' => '7750001000003'],
            ['category' => 'Panadería', 'name' => 'Pan de chocolate', 'emoji' => '🍫', 'price' => 7.0, 'stock' => 5, 'barcode' => '7750001000004'],
            ['category' => 'Snacks', 'name' => 'Papas fritas', 'emoji' => '🍟', 'price' => 9.0, 'stock' => 25, 'barcode' => '7750001000005'],
            ['category' => 'Postres', 'name' => 'Cheesecake', 'emoji' => '🍰', 'price' => 13.5, 'stock' => 0, 'barcode' => '7750001000007'],
        ];

        foreach ($products as $p) {
            Product::firstOrCreate(
                ['barcode' => $p['barcode']],
                [
                    'category_id' => $catIds[$p['category']],
                    'name' => $p['name'],
                    'emoji' => $p['emoji'],
                    'price' => $p['price'],
                    'stock' => $p['stock'],
                    'is_active' => true,
                ]
            );
        }
    }
}