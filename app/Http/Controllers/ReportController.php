<?php

namespace App\Http\Controllers;

use App\Models\CashSession;
use App\Models\CreditNote;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public const RESTRICTED_TYPES = ['utilidad', 'inventario'];
    public const TYPES = [
        'ventas' => ['Ventas por período', 'Detalle de todas las ventas del rango seleccionado'],
        'productos' => ['Ventas por producto', 'Qué productos generan más ingresos y cuáles rotan menos'],
        'categorias' => ['Ventas por categoría y marca', 'Distribución de ingresos por línea de producto'],
        'vendedores' => ['Desempeño y comisiones', 'Ventas por vendedor con cálculo de comisión'],
        'utilidad' => ['Utilidad y márgenes', 'Ingresos, costo de venta y ganancia real'],
        'inventario' => ['Valorización de inventario', 'Capital invertido, stock crítico y rotación'],
        'compras' => ['Compras y cuentas por pagar', 'Órdenes, recepciones y deuda con proveedores'],
        'caja' => ['Arqueos de caja', 'Cierres, diferencias y movimientos de efectivo'],
    ];

    public function index(Request $request)
    {
        $type = $request->get('type', 'ventas');
        if (!isset(self::TYPES[$type])) {
            $type = 'ventas';
        }

        $canSeeProfit = $request->user()->can('reportes.ver-ganancias');

        // Si no tiene permiso de ganancias, cae al reporte de ventas
        if (in_array($type, self::RESTRICTED_TYPES) && !$canSeeProfit) {
            return redirect()->route('reports.index', ['type' => 'ventas'])
                ->with('error', 'No tienes permiso para ver reportes de utilidad.');
        }

        [$from, $to] = $this->resolveRange($request);

        $data = match ($type) {
            'ventas' => $this->salesReport($from, $to, $request),
            'productos' => $this->productsReport($from, $to),
            'categorias' => $this->categoriesReport($from, $to),
            'vendedores' => $this->sellersReport($from, $to),
            'utilidad' => $this->profitReport($from, $to),
            'inventario' => $this->inventoryReport(),
            'compras' => $this->purchasesReport($from, $to),
            'caja' => $this->cashReport($from, $to),
        };

        $availableTypes = collect(self::TYPES)
            ->reject(fn($v, $k) => in_array($k, self::RESTRICTED_TYPES) && !$canSeeProfit)
            ->toArray();

        return Inertia::render('Reports/Index', [
            'type' => $type,
            'types' => $availableTypes,
            'filters' => [
                'from' => $from->format('Y-m-d'),
                'to' => $to->format('Y-m-d'),
                'preset' => $request->get('preset', ''),
                'user_id' => $request->get('user_id', ''),
                'payment_method' => $request->get('payment_method', ''),
            ],
            'users' => User::orderBy('name')->get(['id', 'name', 'employee_code']),
            'report' => $data,
            'canSeeProfit' => $canSeeProfit,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $type = $request->get('type', 'ventas');

        abort_if(
            in_array($type, self::RESTRICTED_TYPES) && !$request->user()->can('reportes.ver-ganancias'),
            403,
            'No tienes permiso para exportar reportes de utilidad.'
        );

        [$from, $to] = $this->resolveRange($request);

        $data = match ($type) {
            'ventas' => $this->salesReport($from, $to, $request),
            'productos' => $this->productsReport($from, $to),
            'categorias' => $this->categoriesReport($from, $to),
            'vendedores' => $this->sellersReport($from, $to),
            'utilidad' => $this->profitReport($from, $to),
            'inventario' => $this->inventoryReport(),
            'compras' => $this->purchasesReport($from, $to),
            'caja' => $this->cashReport($from, $to),
        };

        $filename = "reporte_{$type}_" . $from->format('Ymd') . '_' . $to->format('Ymd') . '.csv';

        return response()->streamDownload(function () use ($data, $type, $from, $to) {
            $out = fopen('php://output', 'w');
            fwrite($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM para Excel

            fputcsv($out, [self::TYPES[$type][0]], ';');
            fputcsv($out, ['Del ' . $from->format('d/m/Y') . ' al ' . $to->format('d/m/Y')], ';');
            fputcsv($out, [], ';');

            if (!empty($data['rows'])) {
                fputcsv($out, array_keys((array) $data['rows'][0]), ';');
                foreach ($data['rows'] as $row) {
                    fputcsv($out, array_values((array) $row), ';');
                }
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    // ============================================================
    // REPORTES
    // ============================================================

    private function salesReport($from, $to, Request $request): array
    {
        $query = Sale::with(['user', 'client'])
            ->whereBetween('created_at', [$from, $to])
            ->when($request->get('user_id'), fn($q, $v) => $q->where('user_id', $v))
            ->when($request->get('payment_method'), fn($q, $v) => $q->where('payment_method', $v));

        $sales = $query->orderByDesc('created_at')->get();

        $rows = $sales->map(fn($s) => [
            'Venta' => "#{$s->id}",
            'Fecha' => $s->created_at->format('d/m/Y H:i'),
            'Cliente' => $s->client?->name ?? 'Cliente general',
            'Vendedor' => $s->user->name,
            'Código' => $s->user->employee_code ?? '',
            'Método' => $s->payment_method,
            'Subtotal' => number_format($s->subtotal, 2, '.', ''),
            'IGV' => number_format($s->tax, 2, '.', ''),
            'Total' => number_format($s->total, 2, '.', ''),
        ])->values();

        // Evolución diaria dentro del rango
        $daily = $sales->groupBy(fn($s) => $s->created_at->format('Y-m-d'))
            ->map(fn($g, $date) => [
                'fecha' => \Carbon\Carbon::parse($date)->format('d/m'),
                'ventas' => (float) $g->sum('total'),
                'transacciones' => $g->count(),
            ])->values()->sortBy('fecha')->values();

        $byMethod = $sales->groupBy('payment_method')
            ->map(fn($g, $m) => ['name' => $m, 'value' => (float) $g->sum('total'), 'count' => $g->count()])
            ->values();

        $creditNotes = (float) CreditNote::whereBetween('created_at', [$from, $to])->sum('total');

        return [
            'summary' => [
                ['label' => 'Total vendido', 'value' => (float) $sales->sum('total'), 'format' => 'money'],
                ['label' => 'Transacciones', 'value' => $sales->count(), 'format' => 'number'],
                ['label' => 'Ticket promedio', 'value' => $sales->count() ? (float) $sales->sum('total') / $sales->count() : 0, 'format' => 'money'],
                ['label' => 'IGV recaudado', 'value' => (float) $sales->sum('tax'), 'format' => 'money'],
                ['label' => 'Notas de crédito', 'value' => $creditNotes, 'format' => 'money', 'negative' => true],
                ['label' => 'Venta neta', 'value' => (float) $sales->sum('total') - $creditNotes, 'format' => 'money', 'highlight' => true],
            ],
            'chart' => ['type' => 'area', 'data' => $daily, 'xKey' => 'fecha', 'yKey' => 'ventas'],
            'pie' => $byMethod,
            'rows' => $rows,
        ];
    }

    private function productsReport($from, $to): array
    {
        $canSeeProfit = request()->user()->can('reportes.ver-ganancias');

        $items = SaleItem::select(
            'product_id',
            DB::raw('SUM(quantity) as qty'),
            DB::raw('SUM(total) as revenue'),
            DB::raw('COUNT(DISTINCT sale_id) as transactions')
        )
            ->whereHas('sale', fn($q) => $q->whereBetween('created_at', [$from, $to]))
            ->groupBy('product_id')
            ->orderByDesc('revenue')
            ->with('product:id,name,unit_type,cost_price,stock,category_id,brand_id')
            ->with('product.category:id,name', 'product.brand:id,name')
            ->get();

        $rows = $items->map(function ($i) use ($canSeeProfit) {
            $cost = (float) ($i->product->cost_price ?? 0) * (float) $i->qty;
            $margin = (float) $i->revenue - $cost;

            $row = [
                'Producto' => $i->product->name,
                'Categoría' => $i->product->category?->name ?? '',
                'Marca' => $i->product->brand?->name ?? '',
                'Cantidad' => rtrim(rtrim(number_format($i->qty, 3, '.', ''), '0'), '.'),
                'Unidad' => $i->product->unit_type,
                'Ventas' => number_format($i->revenue, 2, '.', ''),
            ];

            if ($canSeeProfit) {
                $row['Costo'] = number_format($cost, 2, '.', '');
                $row['Margen'] = number_format($margin, 2, '.', '');
                $row['Margen %'] = $i->revenue > 0 ? number_format(($margin / $i->revenue) * 100, 1, '.', '') : '0.0';
            }

            $row['Stock actual'] = rtrim(rtrim(number_format($i->product->stock, 3, '.', ''), '0'), '.');

            return $row;
        })->values();

        $top = $items->take(10)->map(fn($i) => [
            'name' => \Illuminate\Support\Str::limit($i->product->name, 18),
            'ingresos' => (float) $i->revenue,
        ])->values();

        return [
            'summary' => [
                ['label' => 'Productos vendidos', 'value' => $items->count(), 'format' => 'number'],
                ['label' => 'Unidades totales', 'value' => (float) $items->sum('qty'), 'format' => 'decimal'],
                ['label' => 'Ingresos', 'value' => (float) $items->sum('revenue'), 'format' => 'money'],
                ['label' => 'Producto líder', 'value' => $items->first()?->product->name ?? '—', 'format' => 'text'],
            ],
            'chart' => ['type' => 'barh', 'data' => $top, 'xKey' => 'name', 'yKey' => 'ingresos'],
            'rows' => $rows,
        ];
    }

    private function categoriesReport($from, $to): array
    {
        $byCategory = SaleItem::select('products.category_id', DB::raw('SUM(sale_items.total) as revenue'), DB::raw('SUM(sale_items.quantity) as qty'))
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->whereBetween('sales.created_at', [$from, $to])
            ->groupBy('products.category_id')
            ->orderByDesc('revenue')
            ->get();

        $byBrand = SaleItem::select('products.brand_id', DB::raw('SUM(sale_items.total) as revenue'), DB::raw('SUM(sale_items.quantity) as qty'))
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->whereBetween('sales.created_at', [$from, $to])
            ->groupBy('products.brand_id')
            ->orderByDesc('revenue')
            ->get();

        $totalRevenue = (float) $byCategory->sum('revenue');

        $rows = collect();
        foreach ($byCategory as $c) {
            $cat = \App\Models\Category::find($c->category_id);
            $rows->push([
                'Tipo' => 'Categoría',
                'Nombre' => $cat?->name ?? 'Sin categoría',
                'Unidades' => rtrim(rtrim(number_format($c->qty, 3, '.', ''), '0'), '.'),
                'Ventas' => number_format($c->revenue, 2, '.', ''),
                'Participación %' => $totalRevenue > 0 ? number_format(($c->revenue / $totalRevenue) * 100, 1, '.', '') : '0.0',
            ]);
        }
        foreach ($byBrand as $b) {
            $brand = $b->brand_id ? \App\Models\Brand::find($b->brand_id) : null;
            $rows->push([
                'Tipo' => 'Marca',
                'Nombre' => $brand?->name ?? 'Sin marca',
                'Unidades' => rtrim(rtrim(number_format($b->qty, 3, '.', ''), '0'), '.'),
                'Ventas' => number_format($b->revenue, 2, '.', ''),
                'Participación %' => $totalRevenue > 0 ? number_format(($b->revenue / $totalRevenue) * 100, 1, '.', '') : '0.0',
            ]);
        }

        $pie = $byCategory->map(function ($c) {
            $cat = \App\Models\Category::find($c->category_id);
            return ['name' => $cat?->name ?? 'Sin categoría', 'value' => (float) $c->revenue];
        })->values();

        return [
            'summary' => [
                ['label' => 'Categorías con venta', 'value' => $byCategory->count(), 'format' => 'number'],
                ['label' => 'Marcas con venta', 'value' => $byBrand->count(), 'format' => 'number'],
                ['label' => 'Ingresos totales', 'value' => $totalRevenue, 'format' => 'money'],
                ['label' => 'Categoría líder', 'value' => \App\Models\Category::find($byCategory->first()?->category_id)?->name ?? '—', 'format' => 'text'],
            ],
            'chart' => ['type' => 'pie', 'data' => $pie],
            'rows' => $rows->values(),
        ];
    }

    private function sellersReport($from, $to): array
    {
        $sellers = Sale::select('user_id', DB::raw('SUM(total) as revenue'), DB::raw('COUNT(*) as transactions'))
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('user_id')
            ->orderByDesc('revenue')
            ->with('user:id,name,employee_code,commission_rate')
            ->get();

        $totalCommission = 0;

        $rows = $sellers->map(function ($s) use (&$totalCommission) {
            $rate = (float) ($s->user->commission_rate ?? 0);
            $commission = (float) $s->revenue * ($rate / 100);
            $totalCommission += $commission;

            return [
                'Código' => $s->user->employee_code ?? '',
                'Vendedor' => $s->user->name,
                'Transacciones' => $s->transactions,
                'Ventas' => number_format($s->revenue, 2, '.', ''),
                'Ticket promedio' => number_format($s->transactions ? $s->revenue / $s->transactions : 0, 2, '.', ''),
                'Comisión %' => number_format($rate, 2, '.', ''),
                'Comisión a pagar' => number_format($commission, 2, '.', ''),
            ];
        })->values();

        $chart = $sellers->map(fn($s) => [
            'name' => $s->user->employee_code ?: \Illuminate\Support\Str::limit($s->user->name, 12),
            'ventas' => (float) $s->revenue,
        ])->values();

        return [
            'summary' => [
                ['label' => 'Vendedores activos', 'value' => $sellers->count(), 'format' => 'number'],
                ['label' => 'Ventas totales', 'value' => (float) $sellers->sum('revenue'), 'format' => 'money'],
                ['label' => 'Comisiones a pagar', 'value' => $totalCommission, 'format' => 'money', 'highlight' => true],
                ['label' => 'Mejor vendedor', 'value' => $sellers->first()?->user->name ?? '—', 'format' => 'text'],
            ],
            'chart' => ['type' => 'bar', 'data' => $chart, 'xKey' => 'name', 'yKey' => 'ventas'],
            'rows' => $rows,
        ];
    }

    private function profitReport($from, $to): array
    {
        $items = SaleItem::with('product:id,name,cost_price')
            ->whereHas('sale', fn($q) => $q->whereBetween('created_at', [$from, $to]))
            ->get();

        $revenue = (float) $items->sum('total');
        $cost = (float) $items->sum(fn($i) => (float) ($i->product->cost_price ?? 0) * (float) $i->quantity);
        $grossProfit = $revenue - $cost;

        $creditNotes = (float) CreditNote::whereBetween('created_at', [$from, $to])->sum('total');
        $pettyCash = (float) \App\Models\PettyCashExpense::whereBetween('created_at', [$from, $to])->sum('amount');
        $netProfit = $grossProfit - $creditNotes - $pettyCash;

        // Evolución diaria de utilidad
        $daily = $items->groupBy(fn($i) => $i->sale->created_at->format('Y-m-d'))
            ->map(function ($g, $date) {
                $rev = (float) $g->sum('total');
                $cst = (float) $g->sum(fn($i) => (float) ($i->product->cost_price ?? 0) * (float) $i->quantity);
                return [
                    'fecha' => \Carbon\Carbon::parse($date)->format('d/m'),
                    'ingresos' => $rev,
                    'utilidad' => $rev - $cst,
                ];
            })->values()->sortBy('fecha')->values();

        $rows = collect([
            ['Concepto' => 'Ingresos por ventas', 'Monto' => number_format($revenue, 2, '.', ''), 'Tipo' => 'Ingreso'],
            ['Concepto' => 'Costo de mercadería vendida', 'Monto' => '-' . number_format($cost, 2, '.', ''), 'Tipo' => 'Egreso'],
            ['Concepto' => 'Utilidad bruta', 'Monto' => number_format($grossProfit, 2, '.', ''), 'Tipo' => 'Resultado'],
            ['Concepto' => 'Devoluciones y notas de crédito', 'Monto' => '-' . number_format($creditNotes, 2, '.', ''), 'Tipo' => 'Egreso'],
            ['Concepto' => 'Gastos de caja chica', 'Monto' => '-' . number_format($pettyCash, 2, '.', ''), 'Tipo' => 'Egreso'],
            ['Concepto' => 'Utilidad neta', 'Monto' => number_format($netProfit, 2, '.', ''), 'Tipo' => 'Resultado'],
        ]);

        return [
            'summary' => [
                ['label' => 'Ingresos', 'value' => $revenue, 'format' => 'money'],
                ['label' => 'Costo de venta', 'value' => $cost, 'format' => 'money', 'negative' => true],
                ['label' => 'Utilidad bruta', 'value' => $grossProfit, 'format' => 'money'],
                ['label' => 'Margen bruto', 'value' => $revenue > 0 ? ($grossProfit / $revenue) * 100 : 0, 'format' => 'percent'],
                ['label' => 'Utilidad neta', 'value' => $netProfit, 'format' => 'money', 'highlight' => true],
            ],
            'chart' => ['type' => 'dual', 'data' => $daily, 'xKey' => 'fecha', 'yKey' => 'ingresos', 'yKey2' => 'utilidad'],
            'rows' => $rows,
        ];
    }

    private function inventoryReport(): array
    {
        $products = Product::with(['category:id,name', 'brand:id,name'])
            ->where('is_active', true)
            ->orderByDesc(DB::raw('stock * COALESCE(cost_price, 0)'))
            ->get();

        $deadStockDays = (int) SettingsService::get('dead_stock_days', 60);
        $soldIds = SaleItem::whereHas('sale', fn($q) => $q->where('created_at', '>=', now()->subDays($deadStockDays)))
            ->pluck('product_id')->unique();

        $rows = $products->map(function ($p) use ($soldIds) {
            $costValue = (float) $p->stock * (float) ($p->cost_price ?? 0);
            $saleValue = (float) $p->stock * (float) $p->price;

            return [
                'Producto' => $p->name,
                'Categoría' => $p->category?->name ?? '',
                'Marca' => $p->brand?->name ?? '',
                'Stock' => rtrim(rtrim(number_format($p->stock, 3, '.', ''), '0'), '.'),
                'Unidad' => $p->unit_type,
                'Stock mínimo' => rtrim(rtrim(number_format($p->min_stock, 3, '.', ''), '0'), '.'),
                'Costo unitario' => number_format($p->cost_price ?? 0, 2, '.', ''),
                'Precio venta' => number_format($p->price, 2, '.', ''),
                'Valor a costo' => number_format($costValue, 2, '.', ''),
                'Valor a venta' => number_format($saleValue, 2, '.', ''),
                'Estado' => $p->stock <= 0 ? 'Agotado' : ($p->stock <= $p->min_stock ? 'Stock bajo' : 'Normal'),
                'Rotación' => $soldIds->contains($p->id) ? 'Con rotación' : 'Sin rotación',
            ];
        })->values();

        $costValue = (float) $products->sum(fn($p) => (float) $p->stock * (float) ($p->cost_price ?? 0));
        $saleValue = (float) $products->sum(fn($p) => (float) $p->stock * (float) $p->price);
        $lowStock = $products->filter(fn($p) => $p->stock <= $p->min_stock)->count();
        $deadValue = (float) $products->filter(fn($p) => !$soldIds->contains($p->id) && $p->stock > 0)
            ->sum(fn($p) => (float) $p->stock * (float) ($p->cost_price ?? 0));

        $byCategory = $products->groupBy(fn($p) => $p->category?->name ?? 'Sin categoría')
            ->map(fn($g, $name) => [
                'name' => $name,
                'value' => (float) $g->sum(fn($p) => (float) $p->stock * (float) ($p->cost_price ?? 0)),
            ])->values()->sortByDesc('value')->values();

        return [
            'summary' => [
                ['label' => 'Productos activos', 'value' => $products->count(), 'format' => 'number'],
                ['label' => 'Valor a costo', 'value' => $costValue, 'format' => 'money', 'highlight' => true],
                ['label' => 'Valor a precio venta', 'value' => $saleValue, 'format' => 'money'],
                ['label' => 'Utilidad potencial', 'value' => $saleValue - $costValue, 'format' => 'money'],
                ['label' => 'Con stock bajo', 'value' => $lowStock, 'format' => 'number', 'negative' => $lowStock > 0],
                ['label' => 'Capital inmovilizado', 'value' => $deadValue, 'format' => 'money', 'negative' => true],
            ],
            'chart' => ['type' => 'pie', 'data' => $byCategory],
            'rows' => $rows,
        ];
    }

    private function purchasesReport($from, $to): array
    {
        $purchases = Purchase::with('supplier:id,name')
            ->whereBetween('purchase_date', [$from, $to])
            ->orderByDesc('purchase_date')
            ->get();

        $rows = $purchases->map(fn($p) => [
            'Compra' => "#{$p->id}",
            'Fecha' => $p->purchase_date->format('d/m/Y'),
            'Proveedor' => $p->supplier->name,
            'Factura' => $p->invoice_number ?? '',
            'Subtotal' => number_format($p->subtotal, 2, '.', ''),
            'IGV' => number_format($p->tax, 2, '.', ''),
            'Total' => number_format($p->total, 2, '.', ''),
            'Pagado' => number_format($p->paid_amount, 2, '.', ''),
            'Saldo' => number_format($p->balance(), 2, '.', ''),
            'Estado' => $p->status,
            'Pago' => $p->payment_status,
            'Vence' => $p->due_date?->format('d/m/Y') ?? '',
        ])->values();

        $bySupplier = $purchases->groupBy('supplier_id')
            ->map(fn($g) => [
                'name' => \Illuminate\Support\Str::limit($g->first()->supplier->name, 16),
                'value' => (float) $g->sum('total'),
            ])->values()->sortByDesc('value')->take(8)->values();

        $debt = $purchases->sum(fn($p) => $p->balance());
        $overdue = $purchases->filter(fn($p) => $p->due_date && $p->due_date->isPast() && $p->payment_status !== 'pagada');

        return [
            'summary' => [
                ['label' => 'Órdenes', 'value' => $purchases->count(), 'format' => 'number'],
                ['label' => 'Total comprado', 'value' => (float) $purchases->sum('total'), 'format' => 'money'],
                ['label' => 'Pagado', 'value' => (float) $purchases->sum('paid_amount'), 'format' => 'money'],
                ['label' => 'Deuda pendiente', 'value' => (float) $debt, 'format' => 'money', 'negative' => $debt > 0, 'highlight' => true],
                ['label' => 'Compras vencidas', 'value' => $overdue->count(), 'format' => 'number', 'negative' => $overdue->count() > 0],
                ['label' => 'Pendientes de recibir', 'value' => $purchases->where('status', 'pendiente')->count(), 'format' => 'number'],
            ],
            'chart' => ['type' => 'bar', 'data' => $bySupplier, 'xKey' => 'name', 'yKey' => 'value'],
            'rows' => $rows,
        ];
    }

    private function cashReport($from, $to): array
    {
        $sessions = CashSession::with('user:id,name,employee_code')
            ->whereBetween('opened_at', [$from, $to])
            ->orderByDesc('opened_at')
            ->get();

        $rows = $sessions->map(fn($s) => [
            'Caja' => "#{$s->id}",
            'Cajero' => $s->user->name,
            'Código' => $s->user->employee_code ?? '',
            'Apertura' => $s->opened_at->format('d/m/Y H:i'),
            'Cierre' => $s->closed_at?->format('d/m/Y H:i') ?? 'Abierta',
            'Monto inicial' => number_format($s->opening_amount, 2, '.', ''),
            'Esperado' => $s->expected_amount !== null ? number_format($s->expected_amount, 2, '.', '') : '',
            'Contado' => $s->blind_count_amount !== null ? number_format($s->blind_count_amount, 2, '.', '') : '',
            'Diferencia' => $s->difference !== null ? number_format($s->difference, 2, '.', '') : '',
            'Estado' => $s->status,
        ])->values();

        $closed = $sessions->where('status', 'cerrada');
        $withDiff = $closed->filter(fn($s) => abs((float) $s->difference) > 0.01);
        $totalDiff = (float) $closed->sum('difference');

        $chart = $closed->map(fn($s) => [
            'name' => "#{$s->id}",
            'diferencia' => (float) $s->difference,
        ])->values();

        return [
            'summary' => [
                ['label' => 'Cajas en el período', 'value' => $sessions->count(), 'format' => 'number'],
                ['label' => 'Cerradas', 'value' => $closed->count(), 'format' => 'number'],
                ['label' => 'Con descuadre', 'value' => $withDiff->count(), 'format' => 'number', 'negative' => $withDiff->count() > 0],
                ['label' => 'Diferencia acumulada', 'value' => $totalDiff, 'format' => 'money', 'negative' => $totalDiff < 0, 'highlight' => true],
                ['label' => 'Gastos de caja chica', 'value' => (float) \App\Models\PettyCashExpense::whereBetween('created_at', [$from, $to])->sum('amount'), 'format' => 'money'],
            ],
            'chart' => ['type' => 'bar', 'data' => $chart, 'xKey' => 'name', 'yKey' => 'diferencia'],
            'rows' => $rows,
        ];
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private function resolveRange(Request $request): array
    {
        $preset = $request->get('preset');

        return match ($preset) {
            'hoy' => [now()->startOfDay(), now()->endOfDay()],
            'ayer' => [now()->subDay()->startOfDay(), now()->subDay()->endOfDay()],
            'semana' => [now()->startOfWeek(), now()->endOfWeek()],
            'mes' => [now()->startOfMonth(), now()->endOfMonth()],
            'mes_anterior' => [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()],
            'trimestre' => [now()->startOfQuarter(), now()->endOfQuarter()],
            'anio' => [now()->startOfYear(), now()->endOfYear()],
            default => [
                $request->get('from') ? \Carbon\Carbon::parse($request->get('from'))->startOfDay() : now()->startOfMonth(),
                $request->get('to') ? \Carbon\Carbon::parse($request->get('to'))->endOfDay() : now()->endOfDay(),
            ],
        };
    }
}
