<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class ChangePasswordController extends Controller
{
    public function show(Request $request)
    {
        // Si ya no necesita cambiarla, no tiene sentido mostrar esta pantalla
        if (!$request->user()->must_change_password) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Auth/ChangePassword', [
            'userName' => $request->user()->name,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|current_password',
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [
            'current_password.current_password' => 'La contraseña actual no es correcta.',
        ]);

        // Evita que reutilice la misma contraseña
        if (Hash::check($validated['password'], $request->user()->password)) {
            return back()->withErrors(['password' => 'La nueva contraseña debe ser distinta a la actual.']);
        }

        $request->user()->update([
            'password' => $validated['password'],
            'must_change_password' => false,
        ]);

        return redirect()->route('dashboard')->with('success', 'Contraseña actualizada correctamente');
    }
}