<?php

namespace App\Listeners;

use App\Services\AuditService;
use Illuminate\Auth\Events\Logout;

class LogLogout
{
    public function handle(Logout $event): void
    {
        if ($event->user) {
            AuditService::log('sesion.fin', "{$event->user->name} cerró sesión", $event->user);
        }
    }
}