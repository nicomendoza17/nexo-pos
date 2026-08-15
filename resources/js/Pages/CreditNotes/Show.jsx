import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

const TYPE_LABELS = {
    devolucion_total: 'Devolución total',
    devolucion_parcial: 'Devolución parcial',
    correccion_monto: 'Corrección de monto',
    anulacion: 'Anulación',
};

export default function CreditNotesShow({ auth, creditNote }) {
    const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`;
    const formatDateTime = (d) => new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={creditNote.code}
            subheader={`${TYPE_LABELS[creditNote.type]} · Sobre la Venta #${creditNote.sale_id}`}
        >
            <Head title={`${creditNote.code} - NEXO POS`} />

            <div className="flex items-center justify-between mb-5">
                <button
                    onClick={() => router.visit(route('credit-notes.index'))}
                    className="text-sm font-semibold text-[#69708a] hover:text-[#4f46e5] flex items-center gap-1.5"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                    Volver
                </button>

                <button
                    onClick={() => router.visit(route('sales.show', creditNote.sale_id))}
                    className="px-4 py-2 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] text-sm font-semibold hover:bg-[#4f46e5]/20 transition-colors"
                >
                    Ver venta original
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Cliente</div>
                    <div className="text-sm font-semibold text-[#101528]">{creditNote.client}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Emitida por</div>
                    <div className="text-sm font-semibold text-[#101528]">{creditNote.user}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Fecha</div>
                    <div className="text-sm text-[#101528]">{formatDateTime(creditNote.created_at)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Método devolución</div>
                    <div className="text-sm font-semibold text-[#101528]">{creditNote.refund_method}</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5 mb-5">
                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Motivo</div>
                <p className="text-sm text-[#101528]">{creditNote.reason}</p>
            </div>

            {creditNote.items.length > 0 && (
                <>
                    <h3 className="text-sm font-bold text-[#101528] mb-3">Productos devueltos</h3>
                    <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden mb-5">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                                    <th className="px-4 py-3 font-semibold">Producto</th>
                                    <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                                    <th className="px-4 py-3 font-semibold text-right">Precio unit.</th>
                                    <th className="px-4 py-3 font-semibold">Devuelto al stock</th>
                                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {creditNote.items.map((item) => (
                                    <tr key={item.id} className="border-t border-[#e6e9f2]">
                                        <td className="px-4 py-3 font-semibold text-[#101528]">{item.product}</td>
                                        <td className="px-4 py-3 text-right font-mono text-[#69708a]">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right font-mono text-[#69708a]">{formatMoney(item.unit_price)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                item.restock ? 'bg-[#0ea472]/10 text-[#0ea472]' : 'bg-[#e0483e]/10 text-[#e0483e]'
                                            }`}>
                                                {item.restock ? 'Sí' : 'No (dañado)'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#101528]">{formatMoney(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <div className="flex justify-end">
                <div className="bg-[#0f1729] rounded-2xl p-5 text-white w-full max-w-sm">
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-[#a7aecb]"><span>Subtotal</span><span className="font-mono">{formatMoney(creditNote.subtotal)}</span></div>
                        <div className="flex justify-between text-[#a7aecb]"><span>IGV (18%)</span><span className="font-mono">{formatMoney(creditNote.tax)}</span></div>
                        <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-lg">
                            <span>Total acreditado</span>
                            <span className="font-mono text-[#e0483e]">−{formatMoney(creditNote.total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}