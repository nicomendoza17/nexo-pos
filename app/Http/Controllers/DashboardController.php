<?php

namespace App\Http\Controllers;

use App\Models\CashSession;
use App\Models\CreditNote;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Quotation;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $today = now()->startOfDay();
        $yesterday = now()->subDay()->startOfDay();
        $monthStart = now()->startOfMonth();
        $lastMonthStart = now()->subMonth()->startOfMonth();
        $lastMonthEnd = now()->subMonth()->endOfMonth();

        // Parámetro configurable desde el módulo de Configuración
        $deadStockDays = (int) SettingsService::get('dead_stock_days', 60);

        // ============ VENTAS HOY VS AYER ============
        $salesToday = Sale::whereDate('created_at', $today)->get();
        $salesYesterday = Sale::whereBetween('created_at', [$yesterday, $today])->get();

        $totalToday = (float) $salesToday->sum('total');
        $totalYesterday = (float) $salesYesterday->sum('total');
        $variationDay = $totalYesterday > 0 ? (($totalToday - $totalYesterday) / $totalYesterday) * 100 : null;

        // ============ MES ACTUAL VS MES ANTERIOR ============
        $salesMonth = Sale::where('created_at', '>=', $monthStart)->get();
        $salesLastMonth = Sale::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->get();

        $totalMonth = (float) $salesMonth->sum('total');
        $totalLastMonth = (float) $salesLastMonth->sum('total');
        $variationMonth = $totalLastMonth > 0 ? (($totalMonth - $totalLastMonth) / $totalLastMonth) * 100 : null;

        // ============ VENTAS ÚLTIMOS 14 DÍAS ============
        $last14Days = collect(range(13, 0))->map(function ($daysAgo) {
            $date = now()->subDays($daysAgo)->startOfDay();
            return [
                'fecha' => $date->format('d/m'),
                'dia' => $date->locale('es')->isoFormat('ddd'),
                'ventas' => (float) Sale::whereDate('created_at', $date)->sum('total'),
                'transacciones' => Sale::whereDate('created_at', $date)->count(),
            ];
        });

        // ============ COMPARATIVA MENSUAL (últimos 6 meses) ============
        $last6Months = collect(range(5, 0))->map(function ($monthsAgo) {
            $start = now()->subMonths($monthsAgo)->startOfMonth();
            $end = now()->subMonths($monthsAgo)->endOfMonth();
            return [
                'mes' => $start->locale('es')->isoFormat('MMM'),
                'ventas' => (float) Sale::whereBetween('created_at', [$start, $end])->sum('total'),
            ];
        });

        // ============ VENTAS POR HORA (promedio últimos 7 días) ============
        $salesByHour = DB::table('sales')
            ->select(DB::raw('HOUR(created_at) as hora'), DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as cantidad'))
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy(DB::raw('HOUR(created_at)'))
            ->orderBy('hora')
            ->get()
            ->keyBy('hora');

        $hourlyData = collect(range(0, 23))->map(fn ($h) => [
            'hora' => str_pad($h, 2, '0', STR_PAD_LEFT) . ':00',
            'ventas' => round((float) ($salesByHour[$h]->total ?? 0) / 7, 2),
            'transacciones' => round((float) ($salesByHour[$h]->cantidad ?? 0) / 7, 1),
        ])->filter(fn ($h) => $h['ventas'] > 0 || ((int) substr($h['hora'], 0, 2) >= 6 && (int) substr($h['hora'], 0, 2) <= 23))
        ->values();

        // ============ VENTAS POR MÉTODO DE PAGO (hoy) ============
        $byPaymentMethod = $salesToday->groupBy('payment_method')->map(fn ($g, $method) => [
            'name' => $method,
            'value' => (float) $g->sum('total'),
            'cantidad' => $g->count(),
        ])->values();

        // ============ VENTAS POR CATEGORÍA (mes) ============
        $byCategory = SaleItem::select('products.category_id', DB::raw('SUM(sale_items.total) as total'))
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.created_at', '>=', $monthStart)
            ->groupBy('products.category_id')
            ->get()
            ->map(function ($row) {
                $category = \App\Models\Category::find($row->category_id);
                return ['name' => $category?->name ?? 'Sin categoría', 'value' => (float) $row->total];
            })
            ->sortByDesc('value')
            ->values();

        // ============ TOP PRODUCTOS DEL MES ============
        $topProducts = SaleItem::select('product_id', DB::raw('SUM(quantity) as qty'), DB::raw('SUM(total) as revenue'))
            ->whereHas('sale', fn ($q) => $q->where('created_at', '>=', $monthStart))
            ->groupBy('product_id')
            ->orderByDesc('revenue')
            ->limit(8)
            ->with('product:id,name,unit_type')
            ->get()
            ->map(fn ($i) => [
                'name' => \Illuminate\Support\Str::limit($i->product->name, 20),
                'fullName' => $i->product->name,
                'cantidad' => (float) $i->qty,
                'unit_type' => $i->product->unit_type,
                'ingresos' => (float) $i->revenue,
            ]);

        // ============ PRODUCTOS SIN ROTACIÓN ============
        $soldProductIds = SaleItem::whereHas('sale', fn ($q) => $q->where('created_at', '>=', now()->subDays($deadStockDays)))
            ->pluck('product_id')
            ->unique();

        $deadStock = Product::where('is_active', true)
            ->where('stock', '>', 0)
            ->whereNotIn('id', $soldProductIds)
            ->orderByDesc(DB::raw('stock * COALESCE(cost_price, 0)'))
            ->limit(8)
            ->get(['id', 'name', 'stock', 'unit_type', 'cost_price'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'stock' => (float) $p->stock,
                'unit_type' => $p->unit_type,
                'capital' => (float) $p->stock * (float) ($p->cost_price ?? 0),
            ]);

        $deadStockValue = (float) Product::where('is_active', true)
            ->where('stock', '>', 0)
            ->whereNotIn('id', $soldProductIds)
            ->get()
            ->sum(fn ($p) => (float) $p->stock * (float) ($p->cost_price ?? 0));

        // ============ TOP CLIENTES DEL MES ============
        $topClients = Sale::select('client_id', DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as compras'))
            ->whereNotNull('client_id')
            ->where('created_at', '>=', $monthStart)
            ->groupBy('client_id')
            ->orderByDesc('total')
            ->limit(5)
            ->with('client:id,name,document_number')
            ->get()
            ->map(fn ($s) => [
                'name' => $s->client->name,
                'document' => $s->client->document_number,
                'total' => (float) $s->total,
                'compras' => $s->compras,
            ]);

        // ============ MARGEN DEL MES ============
        $marginData = SaleItem::whereHas('sale', fn ($q) => $q->where('created_at', '>=', $monthStart))
            ->with('product:id,cost_price')
            ->get();

        $revenue = (float) $marginData->sum('total');
        $cost = (float) $marginData->sum(fn ($i) => ($i->product->cost_price ?? 0) * $i->quantity);
        $margin = $revenue - $cost;
        $marginPercent = $revenue > 0 ? ($margin / $revenue) * 100 : 0;

        // ============ STOCK CRÍTICO ============
        $lowStock = Product::where('is_active', true)
            ->whereColumn('stock', '<=', 'min_stock')
            ->orderBy('stock')
            ->limit(8)
            ->get(['id', 'name', 'stock', 'min_stock', 'unit_type'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'stock' => (float) $p->stock,
                'min_stock' => (float) $p->min_stock,
                'unit_type' => $p->unit_type,
            ]);

        $lowStockCount = Product::where('is_active', true)->whereColumn('stock', '<=', 'min_stock')->count();

        // ============ PROVEEDORES ============
        $supplierDebt = Purchase::where('status', '!=', 'anulada')->get()->sum(fn ($p) => $p->balance());
        $overduePurchases = Purchase::where('status', '!=', 'anulada')
            ->where('payment_status', '!=', 'pagada')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', today())
            ->count();
        $pendingReceipt = Purchase::where('status', 'pendiente')->count();

        // ============ COTIZACIONES ============
        $quotationsPending = Quotation::whereIn('status', ['borrador', 'enviada'])->count();
        $quotationsExpiringSoon = Quotation::whereIn('status', ['borrador', 'enviada'])
            ->whereBetween('valid_until', [today(), today()->addDays(7)])
            ->count();
        $quotationsAcceptedMonth = Quotation::where('status', 'aceptada')
            ->where('created_at', '>=', $monthStart)
            ->count();

        // ============ CAJA ============
        $openSession = CashSession::where('user_id', $request->user()->id)->where('status', 'abierta')->first();
        $cashStatus = null;
        if ($openSession) {
            $sessionSales = Sale::where('cash_session_id', $openSession->id)
                ->where('payment_method', 'Efectivo')
                ->sum('total');

            $cashStatus = [
                'is_open' => true,
                'opening_amount' => (float) $openSession->opening_amount,
                'cash_sales' => (float) $sessionSales,
                'opened_at' => $openSession->opened_at,
            ];
        }

        // ============ OTROS ============
        $creditNotesMonth = (float) CreditNote::where('created_at', '>=', $monthStart)->sum('total');
        $inventoryValue = (float) Product::where('is_active', true)->get()
            ->sum(fn ($p) => (float) $p->stock * (float) ($p->cost_price ?? 0));

        return Inertia::render('Dashboard', [
            'kpis' => [
                'sales_today' => $totalToday,
                'sales_today_count' => $salesToday->count(),
                'variation_day' => $variationDay,
                'sales_month' => $totalMonth,
                'sales_month_count' => $salesMonth->count(),
                'sales_last_month' => $totalLastMonth,
                'variation_month' => $variationMonth,
                'ticket_average' => $salesMonth->count() > 0 ? $totalMonth / $salesMonth->count() : 0,
                'margin_month' => $margin,
                'margin_percent' => $marginPercent,
                'credit_notes_month' => $creditNotesMonth,
                'inventory_value' => $inventoryValue,
                'dead_stock_value' => $deadStockValue,
                'supplier_debt' => (float) $supplierDebt,
                'overdue_purchases' => $overduePurchases,
                'pending_receipt' => $pendingReceipt,
                'low_stock_count' => $lowStockCount,
                'quotations_pending' => $quotationsPending,
                'quotations_expiring' => $quotationsExpiringSoon,
                'quotations_accepted' => $quotationsAcceptedMonth,
            ],
            'deadStockDays' => $deadStockDays,
            'chartLast14Days' => $last14Days,
            'chartLast6Months' => $last6Months,
            'chartHourly' => $hourlyData,
            'byPaymentMethod' => $byPaymentMethod,
            'byCategory' => $byCategory,
            'topProducts' => $topProducts,
            'topClients' => $topClients,
            'deadStock' => $deadStock,
            'lowStock' => $lowStock,
            'cashStatus' => $cashStatus,
        ]);
    }
}