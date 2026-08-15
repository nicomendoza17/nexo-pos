<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use Illuminate\Http\Request;

class TaxonomyController extends Controller
{
    // ============ CATEGORÍAS ============
    public function categoriesIndex()
    {
        return response()->json(Category::withCount('products')->orderBy('name')->get());
    }

    public function categoriesStore(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
        ]);
        $category = Category::create($validated);
        return response()->json($category);
    }

    public function categoriesUpdate(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
        ]);
        $category->update($validated);
        return response()->json($category);
    }

    public function categoriesDestroy(Category $category)
    {
        if ($category->products()->exists()) {
            return response()->json(['error' => 'No puedes eliminar una categoría con productos asociados'], 422);
        }
        $category->delete();
        return response()->json(['ok' => true]);
    }

    // ============ MARCAS ============
    public function brandsIndex()
    {
        return response()->json(Brand::withCount('products')->orderBy('name')->get());
    }

    public function brandsStore(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:brands,name',
        ]);
        $brand = Brand::create($validated);
        return response()->json($brand);
    }

    public function brandsUpdate(Request $request, Brand $brand)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:brands,name,' . $brand->id,
        ]);
        $brand->update($validated);
        return response()->json($brand);
    }

    public function brandsDestroy(Brand $brand)
    {
        if ($brand->products()->exists()) {
            return response()->json(['error' => 'No puedes eliminar una marca con productos asociados'], 422);
        }
        $brand->delete();
        return response()->json(['ok' => true]);
    }
}