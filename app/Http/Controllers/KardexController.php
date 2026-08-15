<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use Inertia\Inertia;

class KardexController extends Controller
{
    public function index(\Illuminate\Http\Request $request)
    {
        $query = StockMovement::with(['product', 'user'])
            ->orderByDesc('created_at');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $movements = $query->paginate(20)->through(function ($m) {
            return [
                'id' => $m->id,
                'product' => $m->product->name,
                'type' => $m->type,
                'quantity' => (float) $m->quantity,
                'stock_before' => (float) $m->stock_before,
                'stock_after' => (float) $m->stock_after,
                'user' => $m->user->name,
                'notes' => $m->notes,
                'created_at' => $m->created_at,
            ];
        });

        $products = Product::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Kardex/Index', [
            'movements' => $movements,
            'products' => $products,
            'filters' => $request->only('product_id'),
        ]);
    }
}