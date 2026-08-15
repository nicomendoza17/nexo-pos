import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { can } from '@/lib/permissions';
import { printPdf } from '@/lib/printer';
import { useState } from 'react';

const TYPE_LABELS = {
    devolucion_total: 'Devolución total',
    devolucion_parcial: 'Devolución parcial',
    correccion_monto: 'Corrección de monto',
    anulacion: 'Anulación',
};

export default function SalesShow({ auth, sale }) {
    const canEmitCreditNote = can(auth.user, 'notas-credito.emitir');
    const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`;
    const formatDateTime = (d) => new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const netTotal = sale.total - sale.total_credited;

    const [printing, setPrinting] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const printTicket = async () => {
        setPrinting(true);
        try {
            await printPdf(route('sales.ticket', sale.id));
        } catch (e) {
            setConfirmDialog({
                message: e.message + ' Puedes abrirlo manualmente en otra pestaña.',
                onConfirm: () => {
                    window.open(route('sales.ticket', sale.id), '_blank');
                    setConfirmDialog(null);
                },
            });
        } finally {
            setPrinting(false);
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={`Venta #${sale.id}`}
            subheader={formatDateTime(sale.created_at)}
        >
            <Head title={`Venta #${sale.id} - NEXO POS`} />

            <div className="flex items-center justify-between mb-5">
                <button
                    onClick={() => router.visit(route('sales.index'))}
                    className="text-sm font-semibold text-[#69708a] hover:text-[#4f46e5] flex items-center gap-1.5"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    Volver a ventas
                </button>

                <div className="flex items-center gap-3">
                    <a
                        href={route('sales.receipt', sale.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg bg-[#f4f6fb] text-[#69708a] text-sm font-semibold hover:bg-[#e6e9f2] transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                            <path d="M14 2v6h6" />
                        </svg>
                        Boleta A4
                    </a>

                    <button
                        onClick={printTicket}
                        disabled={printing}
                        className="px-4 py-2 rounded-lg bg-[#f4f6fb] text-[#69708a] text-sm font-semibold hover:bg-[#e6e9f2] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {printing ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect x="6" y="14" width="12" height="8" />
                            </svg>
                        )}
                        {printing ? 'Enviando...' : 'Imprimir ticket'}
                    </button>

                    {canEmitCreditNote && (
                        <button
                            onClick={() => router.visit(route('credit-notes.create', sale.id))}
                            className="px-5 py-2.5 rounded-xl bg-[#e0483e] hover:bg-[#c93d34] text-white font-bold text-sm transition-all"
                        >
                            Emitir nota de crédito
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Cliente</div>
                    <div className="text-sm font-semibold text-[#101528]">{sale.client}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Cajero</div>
                    <div className="text-sm font-semibold text-[#101528]">{sale.user}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Método de pago</div>
                    <div className="text-sm font-semibold text-[#101528]">{sale.payment_method}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Total neto</div>
                    <div className={`text-lg font-mono font-bold ${sale.total_credited > 0 ? 'text-amber-600' : 'text-[#101528]'}`}>
                        {formatMoney(netTotal)}
                    </div>
                    {sale.total_credited > 0 && (
                        <div className="text-[11px] text-[#e0483e] mt-0.5">−{formatMoney(sale.total_credited)} acreditado</div>
                    )}
                </div>
            </div>

            <h3 className="text-sm font-bold text-[#101528] mb-3">Productos vendidos</h3>
            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden mb-5">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Producto</th>
                            <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                            <th className="px-4 py-3 font-semibold text-right">Devuelto</th>
                            <th className="px-4 py-3 font-semibold text-right">Precio unit.</th>
                            <th className="px-4 py-3 font-semibold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item) => (
                            <tr key={item.id} className="border-t border-[#e6e9f2]">
                                <td className="px-4 py-3 font-semibold text-[#101528]">{item.product}</td>
                                <td className="px-4 py-3 text-right font-mono text-[#69708a]">{item.quantity}</td>
                                <td className={`px-4 py-3 text-right font-mono ${item.returned > 0 ? 'text-[#e0483e] font-semibold' : 'text-[#a7aecb]'}`}>
                                    {item.returned > 0 ? item.returned : '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-[#69708a]">{formatMoney(item.price)}</td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-[#101528]">{formatMoney(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* NOTAS DE CRÉDITO ASOCIADAS */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-3">Notas de crédito emitidas</h3>
                    {sale.credit_notes.length === 0 ? (
                        <p className="text-sm text-[#a7aecb]">Ninguna</p>
                    ) : (
                        <div className="space-y-2">
                            {sale.credit_notes.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => router.visit(route('credit-notes.show', n.id))}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#f8f9fc] hover:bg-[#e6e9f2] transition-colors text-left"
                                >
                                    <div>
                                        <div className="text-sm font-mono font-semibold text-[#101528]">{n.code}</div>
                                        <div className="text-[11px] text-[#69708a]">{TYPE_LABELS[n.type]} · {formatDateTime(n.created_at)}</div>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-[#e0483e]">−{formatMoney(n.total)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-[#0f1729] rounded-2xl p-5 text-white">
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-[#a7aecb]"><span>Subtotal</span><span className="font-mono">{formatMoney(sale.subtotal)}</span></div>
                        {sale.discount > 0 && (
                            <div className="flex justify-between text-[#e0483e]"><span>Descuento</span><span className="font-mono">−{formatMoney(sale.discount)}</span></div>
                        )}
                        <div className="flex justify-between text-[#a7aecb]"><span>IGV (18%)</span><span className="font-mono">{formatMoney(sale.tax)}</span></div>
                        <div className="flex justify-between pt-2 border-t border-white/10 font-bold"><span>Total venta</span><span className="font-mono">{formatMoney(sale.total)}</span></div>
                        {sale.total_credited > 0 && (
                            <>
                                <div className="flex justify-between text-[#e0483e]"><span>Notas de crédito</span><span className="font-mono">−{formatMoney(sale.total_credited)}</span></div>
                                <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-lg">
                                    <span>Total neto</span><span className="font-mono text-[#0ea472]">{formatMoney(netTotal)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL DE ERROR/CONFIRMACIÓN DE IMPRESIÓN */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-[#101528] mb-2">Aviso de impresión</h3>
                        <p className="text-sm text-[#69708a] mb-6">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDialog.onConfirm}
                                className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm"
                            >
                                Abrir manual
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}