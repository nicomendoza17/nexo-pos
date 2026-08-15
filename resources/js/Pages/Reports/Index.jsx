import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4f46e5', '#0ea472', '#a855f7', '#f59e0b', '#e0483e', '#06b6d4', '#8b5cf6', '#ec4899'];

const PRESETS = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'ayer', label: 'Ayer' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes', label: 'Este mes' },
    { key: 'mes_anterior', label: 'Mes anterior' },
    { key: 'trimestre', label: 'Trimestre' },
    { key: 'anio', label: 'Este año' },
];

export default function ReportsIndex({ auth, type, types, filters, users, report, canSeeProfit }) {
    const { settings } = usePage().props;
    const [local, setLocal] = useState(filters);

    const formatMoney = (v) => `${settings.currency} ${Number(v).toFixed(2)}`;
    const formatShort = (v) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Number(v).toFixed(0);

    const formatValue = (item) => {
        switch (item.format) {
            case 'money': return formatMoney(item.value);
            case 'percent': return `${Number(item.value).toFixed(1)}%`;
            case 'decimal': return Number(item.value).toFixed(2);
            case 'number': return Number(item.value).toLocaleString('es-PE');
            default: return item.value;
        }
    };

    const navigate = (next) => {
        const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== ''));
        router.get(route('reports.index'), clean, { preserveState: true, replace: true });
    };

    const changeType = (newType) => {
        const next = { ...local, type: newType };
        setLocal(next);
        navigate(next);
    };

    const applyPreset = (preset) => {
        const next = { ...local, type, preset, from: '', to: '' };
        setLocal(next);
        navigate(next);
    };

    const applyDates = () => {
        const next = { ...local, type, preset: '' };
        setLocal(next);
        navigate(next);
    };

    const exportUrl = () => {
        const clean = Object.fromEntries(Object.entries({ ...local, type }).filter(([, v]) => v !== ''));
        return route('reports.export') + '?' + new URLSearchParams(clean).toString();
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white border border-[#e6e9f2] rounded-lg shadow-lg px-3 py-2 text-xs">
                <div className="font-semibold text-[#101528] mb-1">{label}</div>
                {payload.map((p, i) => (
                    <div key={i} style={{ color: p.color }} className="font-mono capitalize">
                        {p.name}: {formatMoney(p.value)}
                    </div>
                ))}
            </div>
        );
    };

    const renderChart = () => {
        const c = report.chart;
        if (!c || !c.data || c.data.length === 0) {
            return <div className="h-[260px] flex items-center justify-center text-sm text-[#a7aecb]">Sin datos para graficar en este período</div>;
        }

        const axisStyle = { fontSize: 11, fill: '#a7aecb' };

        if (c.type === 'pie') {
            return (
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie data={c.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95}>
                            {c.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                </ResponsiveContainer>
            );
        }

        if (c.type === 'barh') {
            return (
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={c.data} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f6fb" horizontal={false} />
                        <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                        <YAxis type="category" dataKey={c.xKey} tick={{ fontSize: 10, fill: '#69708a' }} axisLine={false} tickLine={false} width={110} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey={c.yKey} fill="#4f46e5" radius={[0, 6, 6, 0]} name="Ingresos" />
                    </BarChart>
                </ResponsiveContainer>
            );
        }

        if (c.type === 'bar') {
            return (
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={c.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f6fb" vertical={false} />
                        <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={false} tickLine={false} />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey={c.yKey} radius={[6, 6, 0, 0]} name="Monto">
                            {c.data.map((entry, i) => (
                                <Cell key={i} fill={entry[c.yKey] < 0 ? '#e0483e' : '#4f46e5'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        }

        if (c.type === 'dual') {
            return (
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={c.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f6fb" vertical={false} />
                        <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={false} tickLine={false} />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey={c.yKey} stroke="#4f46e5" strokeWidth={2} dot={false} name="Ingresos" />
                        <Line type="monotone" dataKey={c.yKey2} stroke="#0ea472" strokeWidth={2} dot={false} name="Utilidad" />
                    </LineChart>
                </ResponsiveContainer>
            );
        }

        // area (por defecto)
        return (
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={c.data}>
                    <defs>
                        <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f6fb" vertical={false} />
                    <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey={c.yKey} stroke="#4f46e5" strokeWidth={2} fill="url(#repGrad)" name="Ventas" />
                </AreaChart>
            </ResponsiveContainer>
        );
    };

    const columns = report.rows.length > 0 ? Object.keys(report.rows[0]) : [];
    const isNumeric = (col) => /monto|total|subtotal|igv|ventas|costo|margen|comisión|saldo|pagado|valor|precio|stock|cantidad|unidades|participación|diferencia|inicial|esperado|contado|ticket|transacciones/i.test(col);

    return (
        <AuthenticatedLayout user={auth.user} header="Reportes" subheader={types[type]?.[1] ?? ''}>
            <Head title="Reportes - NEXO POS" />

            {/* SELECTOR DE REPORTE */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {Object.entries(types).map(([key, [label]]) => (
                    <button
                        key={key}
                        onClick={() => changeType(key)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all ${type === key
                                ? 'bg-[#4f46e5] border-[#4f46e5] text-white'
                                : 'bg-white border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* FILTROS */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] p-4 mb-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex gap-1.5 flex-wrap">
                        {PRESETS.map((p) => (
                            <button
                                key={p.key}
                                onClick={() => applyPreset(p.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${local.preset === p.key
                                        ? 'bg-[#4f46e5] text-white'
                                        : 'bg-[#f8f9fc] text-[#69708a] hover:bg-[#e6e9f2]'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-px bg-[#e6e9f2]" />

                    <div>
                        <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Desde</label>
                        <input type="date" value={local.from}
                            onChange={(e) => setLocal({ ...local, from: e.target.value, preset: '' })}
                            className="px-3 py-1.5 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none" />
                    </div>
                    <div>
                        <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Hasta</label>
                        <input type="date" value={local.to}
                            onChange={(e) => setLocal({ ...local, to: e.target.value, preset: '' })}
                            className="px-3 py-1.5 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none" />
                    </div>
                    <button onClick={applyDates}
                        className="px-3 py-1.5 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] text-[13px] font-semibold hover:bg-[#4f46e5]/20 transition-colors">
                        Aplicar
                    </button>

                    {type === 'ventas' && (
                        <>
                            <div>
                                <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Vendedor</label>
                                <select value={local.user_id}
                                    onChange={(e) => { const n = { ...local, type, user_id: e.target.value }; setLocal(n); navigate(n); }}
                                    className="px-3 py-1.5 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none max-w-[160px]">
                                    <option value="">Todos</option>
                                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Pago</label>
                                <select value={local.payment_method}
                                    onChange={(e) => { const n = { ...local, type, payment_method: e.target.value }; setLocal(n); navigate(n); }}
                                    className="px-3 py-1.5 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none">
                                    <option value="">Todos</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                    <option value="Yape">Yape</option>
                                </select>
                            </div>
                        </>
                    )}

                    <a href={exportUrl()}
                        className="ml-auto px-4 py-2 rounded-lg bg-[#0ea472] hover:bg-[#0c9463] text-white font-semibold text-[13px] transition-colors flex items-center gap-1.5">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Exportar CSV
                    </a>
                </div>

                <div className="text-[11px] text-[#a7aecb] mt-3">
                    Período: {new Date(filters.from + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {' — '}
                    {new Date(filters.to + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* INDICADORES */}
            <div className={`grid gap-4 mb-4`} style={{ gridTemplateColumns: `repeat(${Math.min(report.summary.length, 6)}, minmax(0, 1fr))` }}>
                {report.summary.map((item, i) => (
                    <div key={i} className={`rounded-2xl border p-5 ${item.highlight ? 'bg-[#0f1729] border-[#0f1729]' : 'bg-white border-[#e6e9f2]'}`}>
                        <div className={`text-[11px] uppercase font-semibold ${item.highlight ? 'text-[#a7aecb]' : 'text-[#a7aecb]'}`}>
                            {item.label}
                        </div>
                        <div className={`font-mono font-bold mt-1 ${item.format === 'text' ? 'text-sm' : 'text-xl'} ${item.highlight ? 'text-white' : item.negative ? 'text-[#e0483e]' : 'text-[#101528]'
                            }`}>
                            {item.negative && item.format === 'money' ? '−' : ''}{formatValue(item)}
                        </div>
                    </div>
                ))}
            </div>

            {/* GRÁFICO */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5 mb-4">
                <h3 className="text-sm font-bold text-[#101528] mb-4">{types[type]?.[0]}</h3>
                {renderChart()}
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#e6e9f2] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#101528]">Detalle</h3>
                    <span className="text-xs text-[#a7aecb]">{report.rows.length} registro(s)</span>
                </div>

                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                                {columns.map((col) => (
                                    <th key={col} className={`px-4 py-3 font-semibold whitespace-nowrap ${isNumeric(col) ? 'text-right' : ''}`}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {report.rows.length === 0 ? (
                                <tr><td colSpan={columns.length || 1} className="px-6 py-16 text-center text-[#a7aecb]">
                                    Sin datos para el período seleccionado
                                </td></tr>
                            ) : (
                                report.rows.map((row, i) => (
                                    <tr key={i} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                        {columns.map((col) => {
                                            const val = row[col];
                                            const negative = typeof val === 'string' && val.startsWith('-');
                                            const isResult = row['Tipo'] === 'Resultado';

                                            return (
                                                <td key={col} className={`px-4 py-2.5 whitespace-nowrap ${isNumeric(col) ? 'text-right font-mono' : 'text-[#69708a]'
                                                    } ${isResult ? 'font-bold text-[#101528]' : ''} ${negative ? 'text-[#e0483e]' : ''
                                                    } ${col === 'Estado' && val === 'Stock bajo' ? 'text-amber-600 font-semibold' : ''} ${col === 'Estado' && val === 'Agotado' ? 'text-[#e0483e] font-semibold' : ''
                                                    } ${col === 'Rotación' && val === 'Sin rotación' ? 'text-amber-600' : ''}`}>
                                                    {val}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {!canSeeProfit && (
                <p className="text-[11px] text-[#a7aecb] mt-4 text-center">
                    Los reportes de utilidad y valorización de inventario requieren permisos adicionales.
                </p>
            )}
        </AuthenticatedLayout>
    );
}
