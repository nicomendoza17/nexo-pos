import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

const STATUS = {
    pendiente: { label: 'Pendiente', badge: 'bg-amber-100 text-amber-700' },
    en_transito: { label: 'En tránsito', badge: 'bg-[#4f46e5]/10 text-[#4f46e5]' },
    recibida: { label: 'Recibida', badge: 'bg-[#0ea472]/10 text-[#0ea472]' },
    anulada: { label: 'Anulada', badge: 'bg-[#e0483e]/10 text-[#e0483e]' },
};

const FILTERS = [
    { key: 'todas', label: 'Todas' },
    { key: 'por_despachar', label: 'Por despachar' },
    { key: 'por_recibir', label: 'Por recibir' },
    { key: 'salientes', label: 'Salientes' },
    { key: 'entrantes', label: 'Entrantes' },
];

export default function TransfersIndex({ auth, transfers, filter, currentWarehouse, counters }) {
    const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

    const applyFilter = (key) => {
        router.get(route('transfers.index'), key === 'todas' ? {} : { filter: key }, { preserveState: true, replace: true });
    };

    const badgeCount = (key) => {
        if (key === 'por_despachar') return counters.por_despachar;
        if (key === 'por_recibir') return counters.por_recibir;
        return null;
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Transferencias"
            subheader={`Movimiento de mercadería entre sucursales · Operando en ${currentWarehouse?.name}`}
        >
            <Head title="Transferencias - NEXO POS" />

            {/* ALERTAS DE PENDIENTES */}
            {(counters.por_despachar > 0 || counters.por_recibir > 0) && (
                <div className="grid grid-cols-2 gap-4 mb-5">
                    {counters.por_despachar > 0 && (
                        <button
                            onClick={() => applyFilter('por_despachar')}
                            className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-left hover:border-amber-400 transition-colors"
                        >
                            <svg className="w-5 h-5 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M21 3l-7 7" /><path d="M3 3l7 7" /><path d="M12 12v9" />
                            </svg>
                            <div>
                                <div className="text-sm font-semibold text-amber-900">{counters.por_despachar} transferencia(s) por despachar</div>
                                <div className="text-xs text-amber-700">Mercadería lista para salir de esta sucursal</div>
                            </div>
                        </button>
                    )}
                    {counters.por_recibir > 0 && (
                        <button
                            onClick={() => applyFilter('por_recibir')}
                            className="flex items-center gap-3 bg-[#4f46e5]/5 border border-[#4f46e5]/20 rounded-xl px-5 py-4 text-left hover:border-[#4f46e5] transition-colors"
                        >
                            <svg className="w-5 h-5 text-[#4f46e5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <div>
                                <div className="text-sm font-semibold text-[#101528]">{counters.por_recibir} transferencia(s) en camino</div>
                                <div className="text-xs text-[#69708a]">Esperando confirmación de recepción</div>
                            </div>
                        </button>
                    )}
                </div>
            )}

            <div className="flex items-center gap-2 mb-5 flex-wrap">
                {FILTERS.map((f) => {
                    const count = badgeCount(f.key);
                    return (
                        <button
                            key={f.key}
                            onClick={() => applyFilter(f.key)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                                filter === f.key
                                    ? 'bg-[#4f46e5] border-[#4f46e5] text-white'
                                    : 'bg-white border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]'
                            }`}
                        >
                            {f.label}
                            {count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    filter === f.key ? 'bg-white/20' : 'bg-[#e0483e] text-white'
                                }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}

                <button
                    onClick={() => router.visit(route('transfers.create'))}
                    className="ml-auto px-5 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    Nueva transferencia
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Código</th>
                            <th className="px-4 py-3 font-semibold">Ruta</th>
                            <th className="px-4 py-3 font-semibold">Productos</th>
                            <th className="px-4 py-3 font-semibold">Creada</th>
                            <th className="px-4 py-3 font-semibold">Despachada</th>
                            <th className="px-4 py-3 font-semibold">Recibida</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfers.data.length === 0 ? (
                            <tr><td colSpan="8" className="px-6 py-16 text-center text-[#a7aecb]">
                                No hay transferencias con este filtro
                            </td></tr>
                        ) : (
                            transfers.data.map((t) => (
                                <tr key={t.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 font-mono font-semibold text-[#101528]">{t.code}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`font-semibold ${t.is_outgoing ? 'text-[#e0483e]' : 'text-[#69708a]'}`}>
                                                {t.from_code}
                                            </span>
                                            <svg className="w-3.5 h-3.5 text-[#a7aecb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                            <span className={`font-semibold ${!t.is_outgoing ? 'text-[#0ea472]' : 'text-[#69708a]'}`}>
                                                {t.to_code}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-[#a7aecb] mt-0.5">{t.from} → {t.to}</div>
                                    </td>
                                    <td className="px-4 py-3 text-[#69708a] font-mono">{t.items_count}</td>
                                    <td className="px-4 py-3 text-[#69708a] text-xs">{formatDateTime(t.created_at)}</td>
                                    <td className="px-4 py-3 text-[#69708a] text-xs">{formatDateTime(t.dispatched_at)}</td>
                                    <td className="px-4 py-3 text-[#69708a] text-xs">{formatDateTime(t.received_at)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS[t.status]?.badge}`}>
                                            {STATUS[t.status]?.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => router.visit(route('transfers.show', t.id))}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4f46e5]/10 text-[#4f46e5] hover:bg-[#4f46e5]/20 transition-colors"
                                        >
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {transfers.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {transfers.links.map((link, i) => (
                        <button key={i} disabled={!link.url} onClick={() => link.url && router.visit(link.url)}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                link.active ? 'bg-[#4f46e5] text-white' : link.url ? 'bg-white border border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]' : 'text-[#c7cde3] cursor-not-allowed'
                            }`}
                        />
                    ))}
                </div>
            )}
        </AuthenticatedLayout>
    );
}