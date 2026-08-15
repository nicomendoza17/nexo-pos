<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index()
    {
        $suppliers = Supplier::orderByDesc('created_at')->paginate(15);

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $suppliers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'document_type' => 'nullable|in:dni,ruc',
            'document_number' => 'nullable|string|max:20|unique:suppliers,document_number',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'contact_name' => 'nullable|string|max:255',
        ]);

        Supplier::create($validated);

        return redirect()->route('suppliers.index')->with('success', 'Proveedor creado correctamente');
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'document_type' => 'nullable|in:dni,ruc',
            'document_number' => 'nullable|string|max:20|unique:suppliers,document_number,' . $supplier->id,
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'contact_name' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $supplier->update($validated);

        return redirect()->route('suppliers.index')->with('success', 'Proveedor actualizado correctamente');
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();

        return redirect()->route('suppliers.index')->with('success', 'Proveedor eliminado');
    }

    public function lookup(string $documento)
    {
        $token = config('services.consulta_peru.token');
        $documento = preg_replace('/\D/', '', $documento);

        if (strlen($documento) === 11) {
            $response = \Illuminate\Support\Facades\Http::withToken($token)
                ->acceptJson()
                ->post('https://api.apiperu.dev/ruc', ['ruc' => $documento]);

            $result = $response->json();

            if (!$response->successful() || !($result['success'] ?? false)) {
                return response()->json(['error' => $result['message'] ?? 'RUC no encontrado'], 404);
            }

            return response()->json([
                'document_type' => 'ruc',
                'name' => $result['data']['nombre_o_razon_social'] ?? null,
                'address' => $result['data']['direccion_completa'] ?? $result['data']['direccion'] ?? null,
            ]);
        }

        return response()->json(['error' => 'Documento inválido. Usa un RUC de 11 dígitos.'], 422);
    }
}
