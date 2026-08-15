<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(NotificationService::for($request->user()));
    }

    /**
     * Pospone una alerta durante la sesión actual.
     * No se persiste en base de datos: al volver a entrar reaparece
     * si la condición sigue vigente.
     */
    public function dismiss(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|string|max:60',
        ]);

        $dismissed = session('dismissed_notifications', []);

        if (!in_array($validated['id'], $dismissed)) {
            $dismissed[] = $validated['id'];
            session(['dismissed_notifications' => $dismissed]);
        }

        return response()->json(['ok' => true]);
    }

    public function dismissAll(Request $request)
    {
        $ids = collect(NotificationService::for($request->user())['items'])->pluck('id')->all();
        session(['dismissed_notifications' => $ids]);

        return response()->json(['ok' => true]);
    }
}