<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class ClientController extends Controller
{
    public function index()
    {
        $clients = Client::orderByDesc('created_at')->paginate(15);

        return Inertia::render('Clients/Index', [
            'clients' => $clients,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'document_type' => 'nullable|in:dni,ruc',
            'document_number' => 'nullable|string|max:20|unique:clients,document_number',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        Client::create($validated);

        return redirect()->route('clients.index')->with('success', 'Cliente creado correctamente');
    }

    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'document_type' => 'nullable|in:dni,ruc',
            'document_number' => 'nullable|string|max:20|unique:clients,document_number,' . $client->id,
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        $client->update($validated);

        return redirect()->route('clients.index')->with('success', 'Cliente actualizado correctamente');
    }

    public function destroy(Client $client)
    {
        $client->delete();

        return redirect()->route('clients.index')->with('success', 'Cliente eliminado');
    }

    public function quickStore(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'document_type' => 'nullable|in:dni,ruc',
            'document_number' => 'nullable|string|max:20|unique:clients,document_number',
        ]);

        $client = Client::create($validated);

        return response()->json($client);
    }

    public function lookup(string $documento)
    {
        $token = config('services.consulta_peru.token');
        $documento = preg_replace('/\D/', '', $documento);

        if (strlen($documento) === 8) {
            $response = Http::withToken($token)
                ->acceptJson()
                ->post('https://api.apiperu.dev/dni', ['dni' => $documento]);

            $result = $response->json();

            if (!$response->successful() || !($result['success'] ?? false)) {
                return response()->json(['error' => $result['message'] ?? 'DNI no encontrado'], 404);
            }

            return response()->json([
                'document_type' => 'dni',
                'name' => $result['data']['nombre_completo'] ?? null,
                'address' => null,
            ]);
        }

        if (strlen($documento) === 11) {
            $response = Http::withToken($token)
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

        return response()->json(['error' => 'Documento inválido'], 422);
    }

    public function search(Request $request)
    {
        $query = $request->get('q', '');

        if (strlen($query) < 2) {
            return response()->json([]);
        }

        $clients = Client::where('name', 'like', "%{$query}%")
            ->orWhere('document_number', 'like', "%{$query}%")
            ->limit(8)
            ->get(['id', 'name', 'document_number']);

        return response()->json($clients);
    }
}