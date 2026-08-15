<?php

namespace App\Listeners;

use App\Models\ActivityLog;
use Illuminate\Auth\Events\Failed;

class LogFailedLogin
{
    public function handle(Failed $event): void
    {
        $intento = $event->credentials['username'] ?? $event->credentials['email'] ?? 'desconocido';

        // No usamos AuditService porque no hay usuario autenticado
        ActivityLog::create([
            'user_id' => $event->user?->id,
            'action' => 'sesion.fallida',
            'module' => 'Seguridad',
            'severity' => 'warning',
            'description' => "Intento de acceso fallido con el usuario \"{$intento}\"",
            'metadata' => ['usuario_intentado' => $intento],
            'ip_address' => request()->ip(),
            'user_agent' => substr(request()->userAgent() ?? '', 0, 255),
        ]);
    }
}