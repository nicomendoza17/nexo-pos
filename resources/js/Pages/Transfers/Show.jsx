import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';

const STATUS = {
    pendiente: { label: 'Pendiente de despacho', badge: 'bg-amber-100 text-amber-700' },
    en_transito: { label: 'En tránsito', badge: 'bg-[#4f46e5]/10 text-[#4f46e5]' },
    recibida: { label: 'Recibida', badge: 'bg-[#0ea472]/10 text-[#0ea472]' },
    anulada: { label: 'Anulada', badge: 'bg-[#e0483e]/10 text-[#e0483e]' },
};

export default function TransfersShow({ auth, transfer, canDispatch, canReceive, canCancel }) {
    const { settings } = usePage().props;
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [showReceive, setShowReceive] = useState(false);
    const [receptionNotes, setReceptionNotes] = useState('');
    const [received, setReceived] = useState(
        Object.fromEntries(transfer.items.map((i) => [i.id, { quantity: i.quantity_sent, reason: '' }]))
    );
    const [processing, setProcessing] = useState(false);

    const formatMoney = (v) => `${settings.currency} ${Number(v).toFixed(2)}`;
    const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

    const dispatchTransfer = () => {
        setConfirmDialog({
            title: 'Despachar mercadería',
            message: `El stock saldrá de ${transfer.from.name} y quedará en tránsito hasta que ${transfer.to.name} confirme la recepción. Esta acción no se puede deshacer.`,
            confirmLabel: 'Confirmar despacho',
            onConfirm: () => {
                router.post(route('transfers.dispatch', transfer.id));
                setConfirmDialog(null);
            },
        });
    };

    const cancelTransfer = () => {
        setConfirmDialog({
            title: 'Anular transferencia',
            message: 'La transferencia quedará anulada. Como aún no se despachó, el stock no se ve afectado.',
            confirmLabel: 'Anular',
            danger: true,
            onConfirm: () => {
                router.post(route('transfers.cancel', transfer.id));
                setConfirmDialog(null);
            },
        });
    };

    const submitReception = () => {
        setProcessing(true);
        router.post(route('transfers.receive', transfer.id), {
            reception_notes: receptionNotes,
            items: transfer.items.map((i) => ({
                id: i.id,
                quantity_received: Number(received[i.id].quantity),
                discrepancy_reason: received[i.id].reason || null,
            })),
        }, {
            onSuccess: () => setShowReceive(false),
            onFinish: () => setProcessing(false),
        });
    };

    const hasPendingDiscrepancy = transfer.items.some(
        (i) => Number(received[i.id]?.quantity) !== i.quantity_sent && !received[i.id]?.reason
    );

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={transfer.code}
            subheader={`${transfer.from.name} → ${transfer.to.name}`}
        >
            <Head title={`${transfer.code} - NEXO POS`} />

            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <button
                    onClick={() => router.visit(route('transfers.index'))}
                    className="text-sm font-semibold text-[#69708a] hover:text-[#4f46e5] flex items-center gap-1.5"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    Volver
                </button>

                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${STATUS[transfer.status]?.badge}`}>
                        {STATUS[transfer.status]?.label}
                    </span>
                    {transfer.has_discrepancies && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#e0483e]/10 text-[#e0483e]">
                            Con diferencias
                        </span>
                    )}

                    {canCancel && (
                        <button onClick={cancelTransfer}
                            className="px-4 py-2 rounded-lg bg-[#e0483e]/10 text-[#e0483e] text-sm font-semibold hover:bg-[#e0483e]/20 transition-colors">
                            Anular
                        </button>
                    )}
                    {canDispatch && (
                        <button onClick={dispatchTransfer}
                            className="px-5 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-colors">
                            Despachar mercadería
                        </button>
                    )}
                    {canReceive && (
                        <button onClick={() => setShowReceive(true)}
                            className="px-5 py-2 rounded-lg bg-[#0ea472] hover:bg-[#0c9463] text-white font-bold text-sm transition-colors">
                            Confirmar recepción
                        </button>
                    )}
                </div>
            </div>

            {/* LÍNEA DE TIEMPO */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5 mb-4">
                <div className="flex items-center justify-between">
                    {[
                        { label: 'Creada', user: transfer.creator, date: transfer.created_at, done: true },
                        { label: 'Despachada', user: transfer.dispatcher, date: transfer.dispatched_at, done: !!transfer.dispatched_at },
                        { label: 'Recibida', user: transfer.receiver, date: transfer.received_at, done: !!transfer.received_at },
                    ].map((step, i, arr) => (
                        <div key={i} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                    step.done ? 'bg-[#0ea472] text-white' : 'bg-[#f4f6fb] text-[#c7cde3]'
                                }`}>
                                    {step.done ? (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-current" />
                                    )}
                                </div>
                                <div className={`text-xs font-semibold mt-2 ${step.done ? 'text-[#101528]' : 'text-[#a7aecb]'}`}>
                                    {step.label}
                                </div>
                                {step.done && (
                                    <>
                                        <div className="text-[10px] text-[#69708a] mt-0.5">{step.user}</div>
                                        <div className="text-[10px] text-[#a7aecb]">{formatDateTime(step.date)}</div>
                                    </>
                                )}
                            </div>
                            {i < arr.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-3 -mt-8 ${arr[i + 1].done ? 'bg-[#0ea472]' : 'bg-[#e6e9f2]'}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* RUTA Y VALOR */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Origen</div>
                    <div className="text-sm font-bold text-[#101528]">{transfer.from.name}</div>
                    <div className="text-[11px] text-[#a7aecb] font-mono">{transfer.from.code}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Destino</div>
                    <div className="text-sm font-bold text-[#101528]">{transfer.to.name}</div>
                    <div className="text-[11px] text-[#a7aecb] font-mono">{transfer.to.code}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Valor a costo</div>
                    <div className="text-lg font-mono font-bold text-[#101528]">{formatMoney(transfer.total_value)}</div>
                    <div className="text-[11px] text-[#a7aecb]">{transfer.items.length} producto(s)</div>
                </div>
            </div>

            {/* PRODUCTOS */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden mb-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Producto</th>
                            <th className="px-4 py-3 font-semibold text-right">Enviado</th>
                            {transfer.status === 'recibida' && (
                                <>
                                    <th className="px-4 py-3 font-semibold text-right">Recibido</th>
                                    <th className="px-4 py-3 font-semibold text-right">Diferencia</th>
                                    <th className="px-4 py-3 font-semibold">Motivo</th>
                                </>
                            )}
                            <th className="px-4 py-3 font-semibold text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfer.items.map((item) => (
                            <tr key={item.id} className="border-t border-[#e6e9f2]">
                                <td className="px-4 py-3">
                                    <div className="font-semibold text-[#101528]">{item.product}</div>
                                    <div className="text-[11px] text-[#a7aecb] font-mono">{item.barcode || 'Sin código'}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-[#69708a]">
                                    {item.quantity_sent} {item.unit_type}
                                </td>
                                {transfer.status === 'recibida' && (
                                    <>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#101528]">
                                            {item.quantity_received} {item.unit_type}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-mono font-semibold ${
                                            item.difference === 0 ? 'text-[#a7aecb]' : 'text-[#e0483e]'
                                        }`}>
                                            {item.difference === 0 ? '—' : item.difference}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[#69708a]">{item.discrepancy_reason || '—'}</td>
                                    </>
                                )}
                                <td className="px-4 py-3 text-right font-mono text-[#69708a]">
                                    {formatMoney(item.quantity_sent * item.unit_cost)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(transfer.notes || transfer.reception_notes) && (
                <div className="grid grid-cols-2 gap-4">
                    {transfer.notes && (
                        <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                            <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Notas del envío</div>
                            <p className="text-sm text-[#101528]">{transfer.notes}</p>
                        </div>
                    )}
                    {transfer.reception_notes && (
                        <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                            <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Notas de recepción</div>
                            <p className="text-sm text-[#101528]">{transfer.reception_notes}</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL RECEPCIÓN */}
            {showReceive && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8">
                        <h3 className="text-lg font-bold text-[#101528] mb-1">Confirmar recepción</h3>
                        <p className="text-xs text-[#69708a] mb-5">
                            Verifica físicamente la mercadería recibida. Si llegó menos de lo enviado, ajusta la cantidad e indica el motivo.
                        </p>

                        <div className="border border-[#e6e9f2] rounded-xl overflow-hidden mb-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase">
                                        <th className="px-4 py-2.5 font-semibold">Producto</th>
                                        <th className="px-4 py-2.5 font-semibold text-right">Enviado</th>
                                        <th className="px-4 py-2.5 font-semibold text-right">Recibido</th>
                                        <th className="px-4 py-2.5 font-semibold">Motivo de la diferencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transfer.items.map((item) => {
                                        const qty = Number(received[item.id]?.quantity) || 0;
                                        const diff = qty - item.quantity_sent;

                                        return (
                                            <tr key={item.id} className="border-t border-[#e6e9f2]">
                                                <td className="px-4 py-2.5 font-semibold text-[#101528]">{item.product}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-[#69708a]">{item.quantity_sent}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0"
                                                        max={item.quantity_sent}
                                                        value={received[item.id]?.quantity ?? ''}
                                                        onChange={(e) => setReceived((r) => ({
                                                            ...r,
                                                            [item.id]: { ...r[item.id], quantity: e.target.value },
                                                        }))}
                                                        className={`w-24 px-3 py-1.5 rounded-lg border text-sm text-right focus:bg-white outline-none ${
                                                            diff !== 0 ? 'bg-amber-50 border-amber-400' : 'bg-[#f8f9fc] border-[#e6e9f2] focus:border-[#4f46e5]'
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {diff !== 0 ? (
                                                        <input
                                                            type="text"
                                                            value={received[item.id]?.reason ?? ''}
                                                            onChange={(e) => setReceived((r) => ({
                                                                ...r,
                                                                [item.id]: { ...r[item.id], reason: e.target.value },
                                                            }))}
                                                            placeholder="Obligatorio: rotura, faltante..."
                                                            className="w-full px-3 py-1.5 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-xs focus:bg-white focus:border-[#4f46e5] outline-none"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-[#a7aecb]">Sin diferencia</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Notas de recepción</label>
                            <textarea
                                value={receptionNotes}
                                onChange={(e) => setReceptionNotes(e.target.value)}
                                rows={2}
                                placeholder="Estado de la mercadería, observaciones del transporte..."
                                className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none resize-none"
                            />
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 mb-4">
                            Las cantidades que no lleguen se registrarán como <strong>merma en tránsito</strong> y quedarán en el Kardex con el motivo indicado.
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowReceive(false)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={submitReception}
                                disabled={processing || hasPendingDiscrepancy}
                                className="flex-1 py-2.5 rounded-xl bg-[#0ea472] hover:bg-[#0c9463] text-white font-semibold text-sm disabled:opacity-40"
                            >
                                {processing ? 'Procesando...' : 'Confirmar recepción'}
                            </button>
                        </div>

                        {hasPendingDiscrepancy && (
                            <p className="text-xs text-[#e0483e] text-center mt-2">
                                Indica el motivo de cada diferencia antes de confirmar
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* CONFIRMACIÓN */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${
                            confirmDialog.danger ? 'bg-[#e0483e]/10' : 'bg-[#4f46e5]/10'
                        }`}>
                            <svg className={`w-5 h-5 ${confirmDialog.danger ? 'text-[#e0483e]' : 'text-[#4f46e5]'}`}
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-[#101528] mb-2">{confirmDialog.title}</h3>
                        <p className="text-sm text-[#69708a] mb-6">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                                Cancelar
                            </button>
                            <button onClick={confirmDialog.onConfirm}
                                className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm ${
                                    confirmDialog.danger ? 'bg-[#e0483e] hover:bg-[#c93d34]' : 'bg-[#4f46e5] hover:bg-[#4338ca]'
                                }`}>
                                {confirmDialog.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}