import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#4f46e5', '#0ea472', '#a855f7', '#f59e0b', '#e0483e', '#06b6d4', '#8b5cf6', '#ec4899'];
const PAYMENT_COLORS = { Efectivo: '#0ea472', Tarjeta: '#4f46e5', Yape: '#a855f7' };

export default function Dashboard({
    auth, kpis, chartLast14Days, chartLast6Months, chartHourly,
    byPaymentMethod, byCategory, topProducts, topClients, deadStock, lowStock, cashStatus, deadStockDays,
}) {
    const [chartTab, setChartTab] = useState('dias');

    const formatMoney = (v) => `S/ ${Number(v).toFixed(2)}`;
    const formatShort = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
    const formatDateTime = (d) => new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white border border-[#e6e9f2] rounded-lg shadow-lg px-3 py-2 text-xs">
                <div className="font-semibold text-[#101528] mb-1">{label}</div>
                {payload.map((p, i) => (
                    <div key={i} style={{ color: p.color }} className="font-mono">
                        {p.name}: {typeof p.value === 'number' ? formatMoney(p.value) : p.value}
                    </div>
                ))}
            </div>
        );
    };

    const KpiCard = ({ label, value, sub, subColor = 'text-[#69708a]', valueColor = 'text-[#101528]', onClick }) => {
        const Wrapper = onClick ? 'button' : 'div';
        return (
            <Wrapper
                onClick={onClick}
                className={`bg-white rounded-2xl border border-[#e6e9f2] p-5 text-left ${onClick ? 'hover:border-[#4f46e5] transition-colors cursor-pointer' : ''}`}
            >
                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">{label}</div>
                <div className={`text-2xl font-mono font-bold mt-1 ${valueColor}`}>{value}</div>
                {sub && <div className={`text-xs mt-1 ${subColor}`}>{sub}</div>}
            </Wrapper>
        );
    };

    return (
        <AuthenticatedLayout user={auth.user} header="Panel general" subheader="Resumen de tu negocio">
            <Head title="Panel general - NEXO POS" />

            {/* ALERTA DE CAJA */}
            {!cashStatus && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <div>
                            <div className="text-sm font-semibold text-amber-900">No tienes una caja abierta</div>
                            <div className="text-xs text-amber-700">Debes abrir caja antes de poder registrar ventas.</div>
                        </div>
                    </div>
                    <button onClick={() => router.visit(route('cash-sessions.index'))}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors">
                        Abrir caja
                    </button>
                </div>
            )}

            {/* KPIs FILA 1 */}
            <div className="grid grid-cols-4 gap-4 mb-4">
                <KpiCard
                    label="Ventas de hoy"
                    value={formatMoney(kpis.sales_today)}
                    sub={
                        <>
                            {kpis.sales_today_count} ventas
                            {kpis.variation_day !== null && (
                                <span className={`ml-2 font-semibold ${kpis.variation_day >= 0 ? 'text-[#0ea472]' : 'text-[#e0483e]'}`}>
                                    {kpis.variation_day >= 0 ? '↑' : '↓'} {Math.abs(kpis.variation_day).toFixed(1)}% vs ayer
                                </span>
                            )}
                        </>
                    }
                />
                <KpiCard
                    label="Ventas del mes"
                    value={formatMoney(kpis.sales_month)}
                    sub={
                        kpis.variation_month !== null ? (
                            <span className={`font-semibold ${kpis.variation_month >= 0 ? 'text-[#0ea472]' : 'text-[#e0483e]'}`}>
                                {kpis.variation_month >= 0 ? '↑' : '↓'} {Math.abs(kpis.variation_month).toFixed(1)}% vs mes anterior
                            </span>
                        ) : `${kpis.sales_month_count} ventas`
                    }
                />
                <KpiCard
                    label="Margen del mes"
                    value={formatMoney(kpis.margin_month)}
                    valueColor="text-[#0ea472]"
                    sub={`${kpis.margin_percent.toFixed(1)}% sobre ventas`}
                />
                <KpiCard
                    label="Ticket promedio"
                    value={formatMoney(kpis.ticket_average)}
                    sub={`${kpis.sales_month_count} transacciones este mes`}
                />
            </div>

            {/* KPIs FILA 2 */}
            <div className="grid grid-cols-5 gap-4 mb-5">
                <KpiCard
                    label="Stock bajo"
                    value={kpis.low_stock_count}
                    valueColor={kpis.low_stock_count > 0 ? 'text-[#e0483e]' : 'text-[#101528]'}
                    sub="Requieren reposición"
                    onClick={() => router.visit(route('inventory.index'))}
                />
                <KpiCard
                    label="Deuda proveedores"
                    value={formatMoney(kpis.supplier_debt)}
                    valueColor={kpis.supplier_debt > 0 ? 'text-amber-600' : 'text-[#101528]'}
                    sub={kpis.overdue_purchases > 0 ? `${kpis.overdue_purchases} vencida(s)` : `${kpis.pending_receipt} por recibir`}
                    subColor={kpis.overdue_purchases > 0 ? 'text-[#e0483e] font-semibold' : 'text-[#69708a]'}
                    onClick={() => router.visit(route('purchases.index'))}
                />
                <KpiCard
                    label="Capital inmovilizado"
                    value={formatMoney(kpis.dead_stock_value)}
                    valueColor={kpis.dead_stock_value > 0 ? 'text-amber-600' : 'text-[#101528]'}
                    sub={`Sin ventas en ${deadStockDays} días`}
                />
                <KpiCard
                    label="Cotizaciones activas"
                    value={kpis.quotations_pending}
                    sub={kpis.quotations_expiring > 0 ? `${kpis.quotations_expiring} vencen esta semana` : `${kpis.quotations_accepted} aceptadas este mes`}
                    subColor={kpis.quotations_expiring > 0 ? 'text-amber-600 font-semibold' : 'text-[#69708a]'}
                    onClick={() => router.visit(route('quotations.index'))}
                />
                {cashStatus ? (
                    <button onClick={() => router.visit(route('cash-sessions.index'))}
                        className="bg-[#0f1729] rounded-2xl p-5 text-left text-white hover:brightness-110 transition-all">
                        <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Caja abierta</div>
                        <div className="text-2xl font-mono font-bold mt-1">{formatMoney(cashStatus.opening_amount + cashStatus.cash_sales)}</div>
                        <div className="text-xs text-[#a7aecb] mt-1">Desde {formatDateTime(cashStatus.opened_at)}</div>
                    </button>
                ) : (
                    <KpiCard label="Caja" value="Cerrada" valueColor="text-[#a7aecb]" sub="Sin turno activo" />
                )}
            </div>

            {/* GRÁFICO PRINCIPAL CON PESTAÑAS */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5 mb-4">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-[#101528]">Evolución de ventas</h3>
                    <div className="flex gap-1 bg-[#f4f6fb] p-1 rounded-lg">
                        {[
                            { key: 'dias', label: 'Últimos 14 días' },
                            { key: 'meses', label: 'Últimos 6 meses' },
                            { key: 'horas', label: 'Por hora' },
                        ].map((t) => (
                            <button key={t.key} onClick={() => setChartTab(t.key)}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${chartTab === t.key ? 'bg-white text-[#4f46e5] shadow-sm' : 'text-[#69708a] hover:text-[#101528]'
                                    }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                    {chartTab === 'dias' ? (
                        <AreaChart data={chartLast14Days}>
                            <defs>
                                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f4f6fb" vertical={false} />
                            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#a7aecb' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#a7aecb' }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="ventas" stroke="#4f46e5" strokeWidth={2} fill="url(#colorVentas)" name="Ventas" />
                        </AreaChart>
                    ) : chartTab === 'meses' ? (
                        <BarChart data={chartLast6Months}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f4f6fb" vertical={false} />
                            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#a7aecb' }} axisLine={false} tickLine={false} className="capitalize" />
                            <YAxis tick={{ fontSize: 11, fill: '#a7aecb' }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="ventas" fill="#4f46e5" radius={[8, 8, 0, 0]} name="Ventas" />
                        </BarChart>
                    ) : (
                        <LineChart data={chartHourly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f4f6fb" vertical={false} />
                            <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#a7aecb' }} axisLine={false} tickLine={false} interval={1} />
                            <YAxis tick={{ fontSize: 11, fill: '#a7aecb' }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="ventas" stroke="#0ea472" strokeWidth={2.5} dot={{ r: 3 }} name="Promedio ventas" />
                        </LineChart>
                    )}
                </ResponsiveContainer>

                {chartTab === 'horas' && (
                    <p className="text-[11px] text-[#a7aecb] mt-3 text-center">
                        Promedio por hora de los últimos 7 días — te ayuda a identificar las horas pico del negocio.
                    </p>
                )}
            </div>

            {/* GRÁFICOS SECUNDARIOS */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                {/* MÉTODOS DE PAGO */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-4">Métodos de pago (hoy)</h3>
                    {byPaymentMethod.length === 0 ? (
                        <p className="text-sm text-[#a7aecb] py-12 text-center">Sin ventas hoy</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={byPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                    innerRadius={45} outerRadius={75} paddingAngle={3}>
                                    {byPaymentMethod.map((entry, i) => (
                                        <Cell key={i} fill={PAYMENT_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* VENTAS POR CATEGORÍA */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-4">Ventas por categoría (mes)</h3>
                    {byCategory.length === 0 ? (
                        <p className="text-sm text-[#a7aecb] py-12 text-center">Sin datos</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* TOP PRODUCTOS */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-4">Top productos (mes)</h3>
                    {topProducts.length === 0 ? (
                        <p className="text-sm text-[#a7aecb] py-12 text-center">Sin ventas este mes</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={topProducts.slice(0, 5)} layout="vertical" margin={{ left: 10 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#69708a' }}
                                    axisLine={false} tickLine={false} width={90} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="ingresos" fill="#4f46e5" radius={[0, 6, 6, 0]} name="Ingresos" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* LISTAS */}
            <div className="grid grid-cols-3 gap-4">
                {/* STOCK CRÍTICO */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-[#101528]">Stock crítico</h3>
                        {lowStock.length > 0 && (
                            <button onClick={() => router.visit(route('purchases.index'))}
                                className="text-xs font-semibold text-[#4f46e5] hover:underline">
                                Reponer
                            </button>
                        )}
                    </div>
                    {lowStock.length === 0 ? (
                        <p className="text-sm text-[#0ea472]">Todo con stock suficiente</p>
                    ) : (
                        <div className="space-y-2">
                            {lowStock.map((p) => (
                                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-[#f4f6fb] last:border-0">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-[#101528] truncate">{p.name}</div>
                                        <div className="text-[10px] text-[#a7aecb]">Mín: {p.min_stock} {p.unit_type}</div>
                                    </div>
                                    <div className={`text-sm font-mono font-bold ${p.stock <= 0 ? 'text-[#e0483e]' : 'text-amber-600'}`}>
                                        {p.stock}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PRODUCTOS SIN ROTACIÓN */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-1">Sin rotación ({deadStockDays} días)</h3>                    <p className="text-[11px] text-[#a7aecb] mb-3">Capital inmovilizado en almacén</p>
                    {deadStock.length === 0 ? (
                        <p className="text-sm text-[#0ea472]">Todos los productos rotan</p>
                    ) : (
                        <div className="space-y-2">
                            {deadStock.map((p) => (
                                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-[#f4f6fb] last:border-0">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-[#101528] truncate">{p.name}</div>
                                        <div className="text-[10px] text-[#a7aecb]">{p.stock} {p.unit_type} en stock</div>
                                    </div>
                                    <div className="text-sm font-mono font-semibold text-amber-600">{formatMoney(p.capital)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* TOP CLIENTES */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-4">Mejores clientes (mes)</h3>
                    {topClients.length === 0 ? (
                        <p className="text-sm text-[#a7aecb]">Sin ventas con cliente asociado</p>
                    ) : (
                        <div className="space-y-2">
                            {topClients.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#f4f6fb] last:border-0">
                                    <div className="w-6 h-6 rounded-lg bg-[#4f46e5]/10 flex items-center justify-center text-[11px] font-bold text-[#4f46e5]">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-[#101528] truncate">{c.name}</div>
                                        <div className="text-[10px] text-[#a7aecb]">{c.compras} compra(s)</div>
                                    </div>
                                    <div className="text-sm font-mono font-bold text-[#101528]">{formatMoney(c.total)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}