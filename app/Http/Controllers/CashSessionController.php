<?php

namespace App\Http\Controllers;

use App\Models\CashDenominationCount;
use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\Sale;
use App\Models\Warehouse;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CashSessionController extends Controller
{
    private const DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10];

    public function index(Request $request)
    {
        $openSession = CashSession::where('user_id', $request->user()->id)
            ->where('status', 'abierta')
            ->first();

        $sessions = CashSession::with('user')
            ->orderByDesc('opened_at')
            ->paginate(15)
            ->through(fn($s) => [
                'id' => $s->id,
                'user' => $s->user->name,
                'opening_amount' => (float) $s->opening_amount,
                'blind_count_amount' => $s->blind_count_amount !== null ? (float) $s->blind_count_amount : null,
                'expected_amount' => $s->expected_amount !== null ? (float) $s->expected_amount : null,
                'difference' => $s->difference !== null ? (float) $s->difference : null,
                'status' => $s->status,
                'opened_at' => $s->opened_at,
                'closed_at' => $s->closed_at,
            ]);

        $currentDetail = $openSession ? $this->buildSessionSummary($openSession) : null;

        return Inertia::render('CashSessions/Index', [
            'sessions' => $sessions,
            'currentSession' => $currentDetail,
            'denominations' => self::DENOMINATIONS,
        ]);
    }

    public function open(Request $request)
    {
        $validated = $request->validate([
            'opening_amount' => 'required|numeric|min:0',
        ]);

        if (CashSession::where('user_id', $request->user()->id)->where('status', 'abierta')->exists()) {
            return back()->with('error', 'Ya tienes una caja abierta');
        }

        // Obtenemos la sucursal actual desde el contexto
        $warehouse = \App\Services\WarehouseContext::current();

        // Validamos si la sucursal permite operaciones de caja/ventas
        if (!$warehouse->allows_sales) {
            return back()->with('error', "\"{$warehouse->name}\" es un almacén y no permite ventas.");
        }

        $session = CashSession::create([
            'user_id' => $request->user()->id,
            'warehouse_id' => $warehouse->id,
            'opening_amount' => $validated['opening_amount'],
            'status' => 'abierta',
            'opened_at' => now(),
            'opened_ip' => $request->ip(),
        ]);

        AuditService::log(
            'caja.abrir',
            "Abrió caja con S/ " . number_format($validated['opening_amount'], 2),
            $session,
            [
                'monto_inicial' => (float) $validated['opening_amount'],
                'warehouse_id' => $warehouse->id, // Añadimos esto para la auditoría
            ]
        );

        return redirect()->route('cash-sessions.index')->with('success', 'Caja aperturada');
    }

    /**
     * Retiro de efectivo o ingreso manual — cualquiera de los dos queda
     * como CashMovement inmutable, nunca se edita ni se borra.
     */
    public function addMovement(Request $request, CashSession $cashSession)
    {
        $validated = $request->validate([
            'type' => 'required|in:retiro,ingreso_manual',
            'concept' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
        ]);

        // Los retiros de efectivo requieren un permiso específico
        if ($validated['type'] === 'retiro' && !$request->user()->can('caja.retirar-efectivo')) {
            return back()->with('error', 'No tienes autorización para retirar efectivo');
        }

        CashMovement::create([
            'cash_session_id' => $cashSession->id,
            'user_id' => $request->user()->id,
            'type' => $validated['type'],
            'payment_method' => 'Efectivo',
            'amount' => $validated['amount'],
            'concept' => $validated['concept'],
            'ip_address' => $request->ip(),
        ]);

        $action = $validated['type'] === 'retiro' ? 'caja.retiro' : 'caja.ingreso';
        $etiqueta = $validated['type'] === 'retiro' ? 'Retiró' : 'Ingresó';

        AuditService::log(
            $action,
            "{$etiqueta} S/ " . number_format($validated['amount'], 2) . " de la caja #{$cashSession->id}. Concepto: {$validated['concept']}",
            $cashSession,
            [
                'tipo' => $validated['type'],
                'monto' => (float) $validated['amount'],
                'concepto' => $validated['concept'],
            ]
        );

        return back()->with('success', 'Movimiento registrado');
    }

    /**
     * Anula un movimiento existente creando uno compensatorio (nunca DELETE).
     */
    public function reverseMovement(Request $request, CashMovement $movement)
    {
        if (!$request->user()->can('ventas.anular')) {
            return back()->with('error', 'No tienes autorización para anular movimientos');
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        CashMovement::create([
            'cash_session_id' => $movement->cash_session_id,
            'user_id' => $request->user()->id,
            'type' => 'anulacion',
            'payment_method' => $movement->payment_method,
            'amount' => $movement->amount,
            'concept' => "Anulación: {$validated['reason']}",
            'reverses_movement_id' => $movement->id,
            'ip_address' => $request->ip(),
        ]);

        AuditService::log(
            'caja.anular-movimiento',
            "Anuló el movimiento #{$movement->id} de S/ " . number_format($movement->amount, 2) . ". Motivo: {$validated['reason']}",
            $movement->cashSession,
            [
                'movimiento_anulado' => $movement->id,
                'tipo_original' => $movement->type,
                'monto' => (float) $movement->amount,
                'motivo' => $validated['reason'],
            ]
        );

        return back()->with('success', 'Movimiento anulado');
    }

    /**
     * Corte X: reporte de control a mitad de turno, sin cerrar la caja.
     */
    public function reportX(CashSession $cashSession)
    {
        return response()->json($this->buildSessionSummary($cashSession));
    }

    /**
     * Registra el conteo ciego: el cajero declara el efectivo contado
     * SIN conocer el monto esperado del sistema todavía.
     */
    public function blindCount(Request $request, CashSession $cashSession)
    {
        $validated = $request->validate([
            'blind_count_amount' => 'required|numeric|min:0',
            'denominations' => 'nullable|array',
            'denominations.*.denomination' => 'required_with:denominations|numeric',
            'denominations.*.quantity' => 'required_with:denominations|integer|min:0',
        ]);

        DB::transaction(function () use ($validated, $cashSession) {
            $cashSession->update(['blind_count_amount' => $validated['blind_count_amount']]);

            if (!empty($validated['denominations'])) {
                // Limpia un conteo previo si el cajero decidió volver a contar
                CashDenominationCount::where('cash_session_id', $cashSession->id)
                    ->where('moment', 'cierre')
                    ->delete();

                foreach ($validated['denominations'] as $d) {
                    if ($d['quantity'] <= 0) continue;
                    CashDenominationCount::create([
                        'cash_session_id' => $cashSession->id,
                        'moment' => 'cierre',
                        'denomination' => $d['denomination'],
                        'quantity' => $d['quantity'],
                        'subtotal' => $d['denomination'] * $d['quantity'],
                    ]);
                }
            }
        });

        // Recién ahora se revela el esperado y se calcula la diferencia
        $summary = $this->buildSessionSummary($cashSession);

        return response()->json([
            'expected_amount' => $summary['expected_now'],
            'difference' => $validated['blind_count_amount'] - $summary['expected_now'],
        ]);
    }

    public function close(Request $request, CashSession $cashSession)
    {
        if ($cashSession->blind_count_amount === null) {
            return back()->with('error', 'Debes registrar el conteo ciego antes de cerrar la caja');
        }

        if ($cashSession->status === 'cerrada') {
            return back()->with('error', 'Esta caja ya fue cerrada');
        }

        $summary = $this->buildSessionSummary($cashSession);
        $expected = $summary['expected_now'];
        $counted = (float) $cashSession->blind_count_amount;
        $difference = $counted - $expected;

        $cashSession->update([
            'expected_amount' => $expected,
            'difference' => $difference,
            'status' => 'cerrada',
            'closed_at' => now(),
            'closed_ip' => $request->ip(),
        ]);

        // Un cierre con descuadre se marca como crítico para que resalte en auditoría
        $action = abs($difference) > 0.01 ? 'caja.descuadre' : 'caja.cerrar';
        $detalle = abs($difference) > 0.01
            ? ($difference > 0 ? 'sobrante' : 'faltante') . ' de S/ ' . number_format(abs($difference), 2)
            : 'sin diferencias';

        AuditService::log(
            $action,
            "Cerró la caja #{$cashSession->id} con {$detalle}. Esperado S/ " . number_format($expected, 2) . ", contado S/ " . number_format($counted, 2),
            $cashSession,
            [
                'monto_inicial' => (float) $cashSession->opening_amount,
                'ventas_efectivo' => $summary['cash_sales'],
                'ingresos_manuales' => $summary['manual_income'],
                'retiros' => $summary['withdrawals'],
                'esperado' => $expected,
                'contado' => $counted,
                'diferencia' => $difference,
            ]
        );

        return redirect()->route('cash-sessions.index')->with('success', 'Caja cerrada (Corte Z generado)');
    }
    private function buildSessionSummary(CashSession $session): array
    {
        $movements = $session->movements()->get();
        $sales = Sale::with('payments')->where('cash_session_id', $session->id)->get();

        // El efectivo sale de sale_payments, no de sales.payment_method,
        // porque una venta mixta aporta solo su parte en efectivo.
        $cashSales = (float) $sales->sum(
            fn($s) =>
            $s->payments->where('method', 'Efectivo')->sum('amount')
        );

        // Desglose real por método, sumando las partes de cada venta
        $byMethod = $sales->flatMap(fn($s) => $s->payments)
            ->groupBy('method')
            ->map(fn($group, $method) => [
                'method' => $method,
                'total' => (float) $group->sum('amount'),
                'count' => $group->count(),
            ])->values();

        $withdrawals = $movements->where('type', 'retiro')->sum('amount');
        $manualIncome = $movements->where('type', 'ingreso_manual')->sum('amount');
        $reversedAmount = $movements->where('type', 'anulacion')->sum('amount');

        $expectedNow = (float) $session->opening_amount
            + $cashSales
            + (float) $manualIncome
            - (float) $withdrawals
            - (float) $reversedAmount;

        return [
            'id' => $session->id,
            'opening_amount' => (float) $session->opening_amount,
            'cash_sales' => $cashSales,
            'sales_by_method' => $byMethod,
            'withdrawals' => (float) $withdrawals,
            'manual_income' => (float) $manualIncome,
            'expected_now' => $expectedNow,
            'blind_count_amount' => $session->blind_count_amount !== null ? (float) $session->blind_count_amount : null,
            'movements' => $movements->whereIn('type', ['retiro', 'ingreso_manual', 'anulacion'])->values()->map(fn($m) => [
                'id' => $m->id,
                'type' => $m->type,
                'concept' => $m->concept,
                'amount' => (float) $m->amount,
                'created_at' => $m->created_at,
            ]),
            'opened_at' => $session->opened_at,
        ];
    }
}
