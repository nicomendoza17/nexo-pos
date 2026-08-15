<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordIsChanged
{
    /**
     * Rutas que el usuario SÍ puede visitar aunque deba cambiar su contraseña.
     * Sin estas excepciones quedaría en un bucle infinito de redirecciones.
     */
    private const ALLOWED_ROUTES = [
        'password.change',
        'password.change.store',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_password && !in_array($request->route()?->getName(), self::ALLOWED_ROUTES)) {
            return redirect()->route('password.change');
        }

        return $next($request);
    }
}