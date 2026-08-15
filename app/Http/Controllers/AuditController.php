<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->only(['user_id', 'module', 'severity', 'action', 'from', 'to', 'search']);

        $logs = $this->baseQuery($filters)
            ->with(['user', 'authorizer'])
            ->orderByDesc('created_at')
            ->paginate(30)
            ->withQueryString()
            ->through(fn ($l) => [
                'id' => $l->id,
                'user' => $l->user?->name ?? 'Sistema',
                'employee_code' => $l->user?->employee_code,
                'authorizer' => $l->authorizer?->name,
                'action' => $l->action,
                'action_label' => AuditService::ACTIONS[$l->action][2] ?? $l->action,
                'module' => $l->module,
                'severity' => $l->severity,
                'description' => $l->description,
                'metadata' => $l->metadata,
                'subject_url' => $l->subjectUrl(),
                'ip_address' => $l->ip_address,
                'created_at' => $l->created_at,
            ]);

        return Inertia::render('Audit/Index', [
            'logs' => $logs,
            'filters' => $filters,
            'stats' => $this->stats($filters),
            'users' => User::orderBy('name')->get(['id', 'name', 'employee_code']),
            'modules' => collect(AuditService::ACTIONS)->pluck(0)->unique()->values(),
            'actionCatalog' => collect(AuditService::ACTIONS)
                ->map(fn ($a, $key) => ['value' => $key, 'label' => $a[2], 'module' => $a[0]])
                ->values(),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $request->only(['user_id', 'module', 'severity', 'action', 'from', 'to', 'search']);

        $logs = $this->baseQuery($filters)->with(['user', 'authorizer'])->orderByDesc('created_at');

        $filename = 'auditoria_' . now()->format('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($logs) {
            $out = fopen('php://output', 'w');

            // BOM para que Excel reconozca los acentos
            fwrite($out, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($out, [
                'Fecha', 'Usuario', 'Código', 'Autorizado por', 'Módulo',
                'Severidad', 'Acción', 'Descripción', 'IP', 'Detalle',
            ], ';');

            // chunk para no cargar todo en memoria si el historial es grande
            $logs->chunk(500, function ($chunk) use ($out) {
                foreach ($chunk as $l) {
                    fputcsv($out, [
                        $l->created_at->format('d/m/Y H:i:s'),
                        $l->user?->name ?? 'Sistema',
                        $l->user?->employee_code ?? '',
                        $l->authorizer?->name ?? '',
                        $l->module,
                        $l->severity,
                        AuditService::ACTIONS[$l->action][2] ?? $l->action,
                        $l->description,
                        $l->ip_address,
                        $l->metadata ? json_encode($l->metadata, JSON_UNESCAPED_UNICODE) : '',
                    ], ';');
                }
            });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function baseQuery(array $filters)
    {
        return ActivityLog::query()
            ->when($filters['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->when($filters['module'] ?? null, fn ($q, $v) => $q->where('module', $v))
            ->when($filters['severity'] ?? null, fn ($q, $v) => $q->where('severity', $v))
            ->when($filters['action'] ?? null, fn ($q, $v) => $q->where('action', $v))
            ->when($filters['from'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($filters['to'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where('description', 'like', "%{$v}%"));
    }

    private function stats(array $filters): array
    {
        $base = fn () => $this->baseQuery($filters);

        $bySeverity = $base()
            ->select('severity', DB::raw('COUNT(*) as total'))
            ->groupBy('severity')
            ->pluck('total', 'severity');

        $byModule = $base()
            ->select('module', DB::raw('COUNT(*) as total'))
            ->groupBy('module')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['name' => $r->module ?? 'General', 'value' => (int) $r->total]);

        $topUsers = $base()
            ->select('user_id', DB::raw('COUNT(*) as total'))
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->orderByDesc('total')
            ->limit(5)
            ->with('user:id,name,employee_code')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->user?->name ?? '—',
                'code' => $r->user?->employee_code,
                'total' => (int) $r->total,
            ]);

        // Actividad de los últimos 14 días (respetando filtros salvo el rango)
        $daily = collect(range(13, 0))->map(function ($daysAgo) use ($filters) {
            $date = now()->subDays($daysAgo);
            $f = $filters;
            unset($f['from'], $f['to']);

            return [
                'fecha' => $date->format('d/m'),
                'total' => $this->baseQuery($f)->whereDate('created_at', $date)->count(),
            ];
        });

        return [
            'total' => $base()->count(),
            'critical' => (int) ($bySeverity['critical'] ?? 0),
            'warning' => (int) ($bySeverity['warning'] ?? 0),
            'info' => (int) ($bySeverity['info'] ?? 0),
            'today' => $base()->whereDate('created_at', today())->count(),
            'failed_logins' => $base()->where('action', 'sesion.fallida')->count(),
            'by_module' => $byModule,
            'top_users' => $topUsers,
            'daily' => $daily,
        ];
    }
}