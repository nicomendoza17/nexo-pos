<?php

namespace App\Http\Controllers;

use App\Models\PettyCashExpense;
use App\Models\PettyCashFund;
use App\Models\PettyCashReplenishment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PettyCashController extends Controller
{
    public function index()
    {
        $funds = PettyCashFund::with('custodian')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($f) => [
                'id' => $f->id,
                'name' => $f->name,
                'custodian' => $f->custodian->name,
                'fixed_amount' => (float) $f->fixed_amount,
                'current_balance' => (float) $f->current_balance,
                'spent_since_replenishment' => $f->spentSinceLastReplenishment(),
                'status' => $f->status,
            ]);

        $users = User::orderBy('name')->get(['id', 'name']);

        return Inertia::render('PettyCash/Index', [
            'funds' => $funds,
            'users' => $users,
        ]);
    }

    public function show(PettyCashFund $fund)
    {
        $expenses = $fund->expenses()
            ->with('user')
            ->whereNull('reverses_expense_id')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($e) => [
                'id' => $e->id,
                'user' => $e->user->name,
                'amount' => (float) $e->amount,
                'concept' => $e->concept,
                'category' => $e->category,
                'receipt_type' => $e->receipt_type,
                'receipt_ruc' => $e->receipt_ruc,
                'receipt_number' => $e->receipt_number,
                'created_at' => $e->created_at,
            ]);

        $replenishments = $fund->replenishments()->with('approver')->orderByDesc('created_at')->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'approver' => $r->approver->name,
                'amount' => (float) $r->amount,
                'created_at' => $r->created_at,
            ]);

        return Inertia::render('PettyCash/Show', [
            'fund' => [
                'id' => $fund->id,
                'name' => $fund->name,
                'custodian' => $fund->custodian->name,
                'custodian_id' => $fund->custodian_id,
                'fixed_amount' => (float) $fund->fixed_amount,
                'current_balance' => (float) $fund->current_balance,
                'spent_since_replenishment' => $fund->spentSinceLastReplenishment(),
                'status' => $fund->status,
            ],
            'expenses' => $expenses,
            'replenishments' => $replenishments,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'custodian_id' => 'required|exists:users,id',
            'fixed_amount' => 'required|numeric|min:0.01',
        ]);

        PettyCashFund::create([
            ...$validated,
            'current_balance' => $validated['fixed_amount'],
            'status' => 'activo',
        ]);

        return redirect()->route('petty-cash.index')->with('success', 'Fondo de caja chica creado');
    }

    public function addExpense(Request $request, PettyCashFund $fund)
    {
        if ($fund->current_balance <= 0) {
            return back()->with('error', 'El fondo no tiene saldo disponible. Solicita una reposición primero.');
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:' . $fund->current_balance,
            'concept' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'receipt_type' => 'nullable|in:Boleta,Factura,Sin comprobante',
            'receipt_ruc' => 'nullable|string|max:20',
            'receipt_number' => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($validated, $fund, $request) {
            PettyCashExpense::create([
                'petty_cash_fund_id' => $fund->id,
                'user_id' => $request->user()->id,
                ...$validated,
            ]);

            $fund->decrement('current_balance', $validated['amount']);
        });

        return back()->with('success', 'Gasto registrado');
    }

    /**
     * Reposición del fondo: SIEMPRE por el monto exacto gastado desde
     * la última reposición, para restaurar el fondo a su valor fijo.
     */
    public function replenish(Request $request, PettyCashFund $fund)
    {
        if (!$request->user()->can('caja-chica.reponer')) {
            return back()->with('error', 'Solo un administrador puede aprobar reposiciones');
        }

        $exactAmount = $fund->spentSinceLastReplenishment();

        if ($exactAmount <= 0) {
            return back()->with('error', 'No hay gastos pendientes de reponer');
        }

        DB::transaction(function () use ($fund, $exactAmount, $request) {
            PettyCashReplenishment::create([
                'petty_cash_fund_id' => $fund->id,
                'approved_by' => $request->user()->id,
                'amount' => $exactAmount,
            ]);

            $fund->update(['current_balance' => $fund->fixed_amount]);
        });

        return back()->with('success', "Fondo repuesto por S/ " . number_format($exactAmount, 2));
    }
}
