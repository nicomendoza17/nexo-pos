import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';

export default function CreditNotesCreate({ auth, sale, items, nextCode }) {
    const { settings } = usePage().props;
    const TAX_RATE = Number(settings.tax_rate) / 100;

    const [formError, setFormError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [type, setType] = useState('devolucion_parcial');
    const [selected, setSelected] = useState({}); // { sale_item_id: { quantity, restock } }

    const { data, setData } = useForm({
        type: 'devolucion_parcial',
        reason: '',
        refund_method: 'Efectivo',
        correction_amount: '',
        items: [],
    });

    const formatMoney = (amount) => `${settings.currency} ${Number(amount).toFixed(2)}`;
    const formatDateTime = (d) => new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const isProductReturn = type === 'devolucion_total' || type === 'devolucion_parcial' || type === 'anulacion';

    const changeType = (newType) => {
        setType(newType);
        setData('type', newType);
        setFormError(null);

        // Devolución total y anulación preseleccionan todo lo disponible
        if (newType === 'devolucion_total' || newType === 'anulacion') {
            const all = {};
            items.forEach((i) => {
                if (i.available > 0) all[i.sale_item_id] = { quantity: i.available, restock: true };
            });
            setSelected(all);
        } else if (newType === 'correccion_monto') {
            setSelected({});
        }
    };

    const toggleItem = (item) => {
        setFormError(null);
        setSelected((prev) => {
            const next = { ...prev };
            if (next[item.sale_item_id]) {
                delete next[item.sale_item_id];
            } else {
                next[item.sale_item_id] = { quantity: item.available, restock: true };
            }
            return next;
        });
    };

    const updateSelected = (saleItemId, field, value) => {
        setSelected((prev) => ({
            ...prev,
            [saleItemId]: { ...prev[saleItemId], [field]: value },
        }));
    };

    // ============ CÁLCULOS ============
    const subtotal = isProductReturn
        ? Object.entries(selected).reduce((sum, [id, sel]) => {
            const item = items.find((i) => i.sale_item_id === Number(id));
            return sum + (Number(sel.quantity) || 0) * (item?.unit_price || 0);
        }, 0)
        : (Number(data.correction_amount) || 0) / (1 + TAX_RATE);

    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    const submit = (e) => {
        e.preventDefault();
        setFormError(null);

        if (isProductReturn && Object.keys(selected).length === 0) {
            setFormError('Selecciona al menos un producto a devolver.');
            return;
        }

        if (type === 'correccion_monto' && !data.correction_amount) {
            setFormError('Indica el monto a corregir.');
            return;
        }

        if (!data.reason.trim()) {
            setFormError('El motivo es obligatorio. Queda registrado permanentemente para auditoría.');
            return;
        }

        const payload = {
            ...data,
            type,
            items: isProductReturn
                ? Object.entries(selected).map(([id, sel]) => ({
                    sale_item_id: Number(id),
                    quantity: Number(sel.quantity),
                    restock: sel.restock,
                }))
                : [],
        };

        setProcessing(true);
        router.post(route('credit-notes.store', sale.id), payload, {
            onError: (errors) => {
                setFormError(Object.values(errors)[0] || 'No se pudo emitir la nota de crédito.');
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Emitir nota de crédito"
            subheader={`${nextCode} · Sobre la Venta #${sale.id}`}
        >
            <Head title="Nueva nota de crédito - NEXO POS" />

            <form onSubmit={submit} className="space-y-5">

                {/* DATOS DE LA VENTA ORIGINAL */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-3">Venta original</h3>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Venta</div>
                            <div className="text-[#101528] font-semibold">#{sale.id}</div>
                        </div>
                        <div>
                            <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Cliente</div>
                            <div className="text-[#101528]">{sale.client}</div>
                        </div>
                        <div>
                            <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Fecha</div>
                            <div className="text-[#101528]">{formatDateTime(sale.created_at)}</div>
                        </div>
                        <div>
                            <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Total</div>
                            <div className="text-[#101528] font-mono font-semibold">{formatMoney(sale.total)}</div>
                            {sale.total_credited > 0 && (
                                <div className="text-[11px] text-[#e0483e]">−{formatMoney(sale.total_credited)} ya acreditado</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* TIPO DE NOTA */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-3">Tipo de nota de crédito</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { value: 'devolucion_parcial', label: 'Devolución parcial', desc: 'Algunos productos' },
                            { value: 'devolucion_total', label: 'Devolución total', desc: 'Toda la venta' },
                            { value: 'anulacion', label: 'Anulación', desc: 'Venta por error' },
                            { value: 'correccion_monto', label: 'Corrección de monto', desc: 'Sin devolver producto' },
                        ].map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => changeType(t.value)}
                                className={`p-3 rounded-xl border text-left transition-colors ${
                                    type === t.value ? 'bg-[#4f46e5]/10 border-[#4f46e5]' : 'border-[#e6e9f2] hover:border-[#4f46e5]'
                                }`}
                            >
                                <div className={`text-sm font-semibold ${type === t.value ? 'text-[#4f46e5]' : 'text-[#101528]'}`}>{t.label}</div>
                                <div className="text-[11px] text-[#a7aecb] mt-0.5">{t.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* PRODUCTOS A DEVOLVER */}
                {isProductReturn && (
                    <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                        <h3 className="text-sm font-bold text-[#101528] mb-3">Productos a devolver</h3>
                        <div className="space-y-2">
                            {items.map((item) => {
                                const isSelected = !!selected[item.sale_item_id];
                                const disabled = item.available <= 0;

                                return (
                                    <div
                                        key={item.sale_item_id}
                                        className={`border rounded-xl p-3 transition-colors ${
                                            disabled ? 'opacity-50 border-[#e6e9f2]' : isSelected ? 'border-[#4f46e5] bg-[#4f46e5]/5' : 'border-[#e6e9f2]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={disabled}
                                                onChange={() => toggleItem(item)}
                                                className="w-4 h-4 rounded accent-[#4f46e5]"
                                            />
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold text-[#101528]">{item.product}</div>
                                                <div className="text-[11px] text-[#a7aecb]">
                                                    Vendido: {item.quantity} {item.unit_type} · Ya devuelto: {item.returned} · Disponible: {item.available}
                                                </div>
                                            </div>
                                            <div className="text-sm font-mono text-[#69708a]">{formatMoney(item.unit_price)} c/u</div>
                                        </div>

                                        {isSelected && (
                                            <div className="flex items-center gap-4 mt-3 pl-7">
                                                <div>
                                                    <label className="text-[10px] text-[#a7aecb] uppercase font-semibold block mb-1">Cantidad a devolver</label>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0.001"
                                                        max={item.available}
                                                        value={selected[item.sale_item_id].quantity}
                                                        onChange={(e) => updateSelected(item.sale_item_id, 'quantity', e.target.value)}
                                                        className="w-28 px-3 py-1.5 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                                    />
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer mt-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected[item.sale_item_id].restock}
                                                        onChange={(e) => updateSelected(item.sale_item_id, 'restock', e.target.checked)}
                                                        className="w-4 h-4 rounded accent-[#0ea472]"
                                                    />
                                                    <span className="text-xs text-[#69708a]">Devolver al stock (producto en buen estado)</span>
                                                </label>
                                                <div className="ml-auto mt-4 text-sm font-mono font-bold text-[#101528]">
                                                    {formatMoney((Number(selected[item.sale_item_id].quantity) || 0) * item.unit_price)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* CORRECCIÓN DE MONTO */}
                {type === 'correccion_monto' && (
                    <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                        <h3 className="text-sm font-bold text-[#101528] mb-3">Monto a corregir</h3>
                        <p className="text-xs text-[#69708a] mb-3">
                            Usa esta opción cuando se cobró de más y no hay devolución de producto, por ejemplo un error de precio o un descuento no aplicado. No afecta el stock.
                        </p>
                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Monto total a acreditar (IGV incluido)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={data.correction_amount}
                            onChange={(e) => {
                                setData('correction_amount', e.target.value);
                                if (formError) setFormError(null);
                            }}
                            placeholder="0.00"
                            className="w-full max-w-xs px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                        />
                    </div>
                )}

                {/* MOTIVO Y DEVOLUCIÓN */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-3">Detalles</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Motivo *</label>
                            <textarea
                                value={data.reason}
                                onChange={(e) => {
                                    setData('reason', e.target.value);
                                    if (formError) setFormError(null);
                                }}
                                rows={3}
                                placeholder="Ej. Producto defectuoso, cliente se arrepintió, error de cobro..."
                                className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none transition-colors ${
                                    formError && !data.reason.trim()
                                        ? 'bg-red-50 border border-[#e0483e] focus:border-[#e0483e]'
                                        : 'bg-[#f8f9fc] border border-[#e6e9f2] focus:bg-white focus:border-[#4f46e5]'
                                }`}
                            />
                            {formError && !data.reason.trim() && (
                                <p className="text-[#e0483e] text-xs mt-1 font-medium">Este campo es obligatorio</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Método de devolución *</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Efectivo', 'Tarjeta', 'Yape', 'Sin devolución'].map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setData('refund_method', m)}
                                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                                            data.refund_method === m ? 'bg-[#4f46e5] border-[#4f46e5] text-white' : 'border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                            {data.refund_method === 'Efectivo' && (
                                <p className="text-[11px] text-[#a7aecb] mt-2">
                                    Se registrará automáticamente como salida en tu caja abierta.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* TOTALES */}
                <div className="bg-[#0f1729] rounded-2xl p-5 text-white">
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-[#a7aecb]">
                            <span>Subtotal a acreditar</span>
                            <span className="font-mono">{formatMoney(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[#a7aecb]">
                            <span>IGV ({settings.tax_rate}%)</span>
                            <span className="font-mono">{formatMoney(tax)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-lg">
                            <span>Total nota de crédito</span>
                            <span className="font-mono text-[#e0483e]">{formatMoney(total)}</span>
                        </div>
                    </div>
                </div>

                {/* MENSAJE DE ERROR */}
                {formError && (
                    <div className="flex items-center gap-2.5 bg-red-50 border border-[#e0483e]/30 rounded-xl px-4 py-3">
                        <svg className="w-4 h-4 text-[#e0483e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="text-sm text-[#e0483e] font-medium">{formError}</span>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => router.visit(route('sales.show', sale.id))}
                        className="flex-1 py-3 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex-1 py-3 rounded-xl bg-[#e0483e] hover:bg-[#c93d34] text-white font-bold text-sm disabled:opacity-50"
                    >
                        {processing ? 'Emitiendo...' : 'Emitir nota de crédito'}
                    </button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}