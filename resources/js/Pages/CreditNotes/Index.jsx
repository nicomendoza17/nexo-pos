import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

const TYPE_LABELS = {
    devolucion_total: 'Devolución total',
    devolucion_parcial: 'Devolución parcial',
    correccion_monto: 'Corrección de monto',
    anulacion: 'Anulación',
};

const TYPE_COLORS = {
    devolucion_total: 'bg-[#e0483e]/10 text-[#e0483e]',
    devolucion_parcial: 'bg-amber-100 text-amber-700',
    correccion_monto: 'bg-[#4f46e5]/10 text-[#4f46e5]',
    anulacion: 'bg-[#a7aecb]/10 text-[#69708a]',
};

export default function CreditNotesIndex({ auth, creditNotes }) {
    const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`;
    const formatDateTime = (d) => new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const totalCredited = creditNotes.data.reduce((sum, n) => sum + n.total, 0);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Notas de crédito"
            subheader={`${creditNotes.total} notas emitidas`}
        >
            <Head title="Notas de crédito - NEXO POS" />

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Código</th>
                            <th className="px-4 py-3 font-semibold">Venta origen</th>
                            <th className="px-4 py-3 font-semibold">Cliente</th>
                            <th className="px-4 py-3 font-semibold">Tipo</th>
                            <th className="px-4 py-3 font-semibold">Motivo</th>
                            <th className="px-4 py-3 font-semibold">Emitida por</th>
                            <th className="px-4 py-3 font-semibold">Fecha</th>
                            <th className="px-4 py-3 font-semibold text-right">Total</th>
                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {creditNotes.data.length === 0 ? (
                            <tr><td colSpan="9" className="px-6 py-16 text-center text-[#a7aecb]">Sin notas de crédito emitidas</td></tr>
                        ) : (
                            creditNotes.data.map((n) => (
                                <tr key={n.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 font-mono font-semibold text-[#101528]">{n.code}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => router.visit(route('sales.show', n.sale_id))}
                                            className="text-[#4f46e5] font-semibold hover:underline"
                                        >
                                            Venta #{n.sale_id}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-[#69708a]">{n.client}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TYPE_COLORS[n.type]}`}>
                                            {TYPE_LABELS[n.type]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#69708a] max-w-[180px] truncate" title={n.reason}>{n.reason}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{n.user}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{formatDateTime(n.created_at)}</td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#e0483e]">−{formatMoney(n.total)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => router.visit(route('credit-notes.show', n.id))}
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

            {creditNotes.data.length > 0 && (
                <>
                    <div className="flex justify-end mt-4">
                        <div className="bg-white rounded-xl border border-[#e6e9f2] px-5 py-3">
                            <span className="text-sm text-[#69708a] mr-3">Total acreditado en esta página:</span>
                            <span className="text-lg font-mono font-bold text-[#e0483e]">−{formatMoney(totalCredited)}</span>
                        </div>
                    </div>

                    <div className="flex justify-center gap-2 mt-6">
                        {creditNotes.links.map((link, i) => (
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
                </>
            )}
        </AuthenticatedLayout>
    );
}