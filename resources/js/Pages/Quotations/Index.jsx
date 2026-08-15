import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

const STATUS_LABELS = {
    borrador: 'Borrador',
    enviada: 'Enviada',
    aceptada: 'Aceptada',
    rechazada: 'Rechazada',
    vencida: 'Vencida',
};

const STATUS_COLORS = {
    borrador: 'bg-[#a7aecb]/10 text-[#69708a]',
    enviada: 'bg-[#4f46e5]/10 text-[#4f46e5]',
    aceptada: 'bg-[#0ea472]/10 text-[#0ea472]',
    rechazada: 'bg-[#e0483e]/10 text-[#e0483e]',
    vencida: 'bg-amber-100 text-amber-700',
};

export default function QuotationsIndex({ auth, quotations }) {
    const [statusFilter, setStatusFilter] = useState('');

    const formatMoney = (amount, currency) => `${currency === 'USD' ? '$' : 'S/'} ${Number(amount).toFixed(2)}`;
    const formatDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

    const filtered = statusFilter
        ? quotations.data.filter((q) => q.status === statusFilter)
        : quotations.data;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Cotizaciones"
            subheader={`${quotations.total} cotizaciones registradas`}
        >
            <Head title="Cotizaciones - NEXO POS" />

            <div className="flex items-center gap-2 mb-5">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none"
                >
                    <option value="">Todos los estados</option>
                    <option value="borrador">Borrador</option>
                    <option value="enviada">Enviada</option>
                    <option value="aceptada">Aceptada</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="vencida">Vencida</option>
                </select>

                <button
                    onClick={() => router.visit(route('quotations.create'))}
                    className="ml-auto px-5 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Nueva cotización
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Código</th>
                            <th className="px-4 py-3 font-semibold">Cliente</th>
                            <th className="px-4 py-3 font-semibold">Vendedor</th>
                            <th className="px-4 py-3 font-semibold">Emisión</th>
                            <th className="px-4 py-3 font-semibold">Vence</th>
                            <th className="px-4 py-3 font-semibold text-right">Total</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="8" className="px-6 py-16 text-center text-[#a7aecb]">Sin cotizaciones registradas</td></tr>
                        ) : (
                            filtered.map((q) => (
                                <tr key={q.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 font-mono font-semibold text-[#101528]">{q.code}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{q.client}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{q.user}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{formatDate(q.issue_date)}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{formatDate(q.valid_until)}</td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#101528]">{formatMoney(q.total, q.currency)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[q.status]}`}>
                                            {STATUS_LABELS[q.status]}
                                        </span>
                                        {q.converted_sale_id && (
                                            <span className="ml-1.5 text-[10px] font-bold text-[#0ea472]">→ Venta #{q.converted_sale_id}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => router.visit(route('quotations.show', q.id))}
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

            {quotations.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {quotations.links.map((link, i) => (
                        <button
                            key={i}
                            disabled={!link.url}
                            onClick={() => link.url && router.visit(link.url)}
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