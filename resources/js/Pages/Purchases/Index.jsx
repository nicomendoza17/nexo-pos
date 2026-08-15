import { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function PurchasesIndex({ auth, purchases, suppliers, products }) {
    const [showModal, setShowModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        supplier_id: '',
        purchase_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        invoice_number: '',
        notes: '',
        items: [],
    });

    const filteredPurchases = useMemo(() => {
        if (!statusFilter) return purchases.data;
        if (statusFilter === 'debt') return purchases.data.filter(p => p.payment_status !== 'pagada' && p.status !== 'anulada');
        return purchases.data.filter(p => p.status === statusFilter);
    }, [purchases.data, statusFilter]);

    const totalDebt = useMemo(() => {
        return purchases.data
            .filter(p => p.status !== 'anulada')
            .reduce((sum, p) => sum + p.balance, 0);
    }, [purchases.data]);

    const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`;
    const formatDate = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

    const openCreateModal = () => {
        reset();
        setData('items', []);
        setShowModal(true);
    };

    const addItem = () => {
        setData('items', [...data.items, { product_id: '', quantity: '', unit_cost: '' }]);
    };

    const updateItem = (index, field, value) => {
        const items = [...data.items];
        items[index][field] = value;

        // Autocompletar costo si el producto ya tiene cost_price
        if (field === 'product_id') {
            const product = products.find(p => p.id === Number(value));
            if (product?.cost_price) {
                items[index].unit_cost = product.cost_price;
            }
        }

        setData('items', items);
    };

    const removeItem = (index) => {
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const itemsSubtotal = data.items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0), 0);
    const itemsTax = itemsSubtotal * 0.18;
    const itemsTotal = itemsSubtotal + itemsTax;

    const submit = (e) => {
        e.preventDefault();
        if (data.items.length === 0) {
            alert('Agrega al menos un producto');
            return;
        }
        post(route('purchases.store'), {
            onSuccess: () => {
                setShowModal(false);
                reset();
            },
        });
    };

    const handleReceive = (purchase) => {
        setConfirmDialog({
            message: `¿Recibir la compra #${purchase.id}? Esto actualizará el stock de los productos y el costo de compra.`,
            onConfirm: () => {
                router.post(route('purchases.receive', purchase.id));
                setConfirmDialog(null);
            },
        });
    };

    const handleCancel = (purchase) => {
        setConfirmDialog({
            message: `¿Anular la compra #${purchase.id}?`,
            onConfirm: () => {
                router.post(route('purchases.cancel', purchase.id));
                setConfirmDialog(null);
            },
        });
    };

    const submitPayment = () => {
        if (!payAmount || Number(payAmount) <= 0) return;
        router.post(route('purchases.pay', showPayModal.id), { amount: payAmount }, {
            onSuccess: () => {
                setShowPayModal(null);
                setPayAmount('');
            },
        });
    };

    const statusBadge = (status) => {
        const map = {
            pendiente: 'bg-amber-100 text-amber-700',
            recibida: 'bg-[#0ea472]/10 text-[#0ea472]',
            anulada: 'bg-[#e0483e]/10 text-[#e0483e]',
        };
        return map[status] || 'bg-gray-100 text-gray-600';
    };

    const paymentBadge = (status) => {
        const map = {
            pendiente: 'bg-[#e0483e]/10 text-[#e0483e]',
            parcial: 'bg-amber-100 text-amber-700',
            pagada: 'bg-[#0ea472]/10 text-[#0ea472]',
        };
        return map[status] || 'bg-gray-100 text-gray-600';
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Órdenes de compra"
            subheader={`${purchases.total} compras registradas · Deuda total con proveedores: ${formatMoney(totalDebt)}`}
        >
            <Head title="Compras - NEXO POS" />

            <div className="flex items-center gap-2 mb-5">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none"
                >
                    <option value="">Todas</option>
                    <option value="pendiente">Pendientes de recibir</option>
                    <option value="recibida">Recibidas</option>
                    <option value="anulada">Anuladas</option>
                    <option value="debt">Con deuda pendiente</option>
                </select>

                <button
                    onClick={openCreateModal}
                    className="ml-auto px-5 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Nueva compra
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Compra</th>
                            <th className="px-4 py-3 font-semibold">Proveedor</th>
                            <th className="px-4 py-3 font-semibold">Fecha</th>
                            <th className="px-4 py-3 font-semibold text-right">Total</th>
                            <th className="px-4 py-3 font-semibold text-right">Saldo</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold">Pago</th>
                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPurchases.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-16 text-center text-[#a7aecb]">
                                    No hay compras registradas
                                </td>
                            </tr>
                        ) : (
                            filteredPurchases.map((p) => (
                                <tr key={p.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 font-semibold text-[#101528]">#{p.id}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{p.supplier}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{formatDate(p.purchase_date)}</td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#101528]">{formatMoney(p.total)}</td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#e0483e]">
                                        {p.balance > 0 ? formatMoney(p.balance) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(p.status)}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${paymentBadge(p.payment_status)}`}>
                                            {p.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            {p.status === 'pendiente' && (
                                                <>
                                                    <button
                                                        onClick={() => handleReceive(p)}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0ea472]/10 text-[#0ea472] hover:bg-[#0ea472]/20 transition-colors"
                                                    >
                                                        Recibir
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancel(p)}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#e0483e]/10 text-[#e0483e] hover:bg-[#e0483e]/20 transition-colors"
                                                    >
                                                        Anular
                                                    </button>
                                                </>
                                            )}
                                            {p.status === 'recibida' && p.payment_status !== 'pagada' && (
                                                <button
                                                    onClick={() => setShowPayModal(p)}
                                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#4f46e5]/10 text-[#4f46e5] hover:bg-[#4f46e5]/20 transition-colors"
                                                >
                                                    Registrar pago
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {purchases.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {purchases.links.map((link, i) => (
                        <button
                            key={i}
                            disabled={!link.url}
                            onClick={() => link.url && router.visit(link.url)}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                link.active
                                    ? 'bg-[#4f46e5] text-white'
                                    : link.url
                                    ? 'bg-white border border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]'
                                    : 'text-[#c7cde3] cursor-not-allowed'
                            }`}
                        />
                    ))}
                </div>
            )}

            {/* MODAL NUEVA COMPRA */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">Nueva orden de compra</h3>

                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Proveedor *</label>
                                    <select
                                        value={data.supplier_id}
                                        onChange={(e) => setData('supplier_id', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    {errors.supplier_id && <p className="text-red-500 text-xs mt-1">{errors.supplier_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">N° de factura</label>
                                    <input
                                        type="text"
                                        value={data.invoice_number}
                                        onChange={(e) => setData('invoice_number', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Fecha de compra *</label>
                                    <input
                                        type="date"
                                        value={data.purchase_date}
                                        onChange={(e) => setData('purchase_date', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Fecha límite de pago</label>
                                    <input
                                        type="date"
                                        value={data.due_date}
                                        onChange={(e) => setData('due_date', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                </div>
                            </div>

                            {/* PRODUCTOS */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-[#101528]">Productos *</label>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="text-xs font-semibold text-[#4f46e5] hover:underline"
                                    >
                                        + Agregar producto
                                    </button>
                                </div>

                                {data.items.length === 0 ? (
                                    <div className="text-center py-6 text-sm text-[#a7aecb] bg-[#f8f9fc] rounded-xl">
                                        Agrega al menos un producto
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {data.items.map((item, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <select
                                                    value={item.product_id}
                                                    onChange={(e) => updateItem(i, 'product_id', e.target.value)}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                                >
                                                    <option value="">Producto...</option>
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    min="0"
                                                    placeholder="Cant."
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                                    className="w-24 px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Costo"
                                                    value={item.unit_cost}
                                                    onChange={(e) => updateItem(i, 'unit_cost', e.target.value)}
                                                    className="w-24 px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(i)}
                                                    className="p-2 text-[#e0483e] hover:bg-red-50 rounded-lg"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {data.items.length > 0 && (
                                <div className="bg-[#f8f9fc] rounded-xl p-4 space-y-1.5 text-sm">
                                    <div className="flex justify-between text-[#69708a]">
                                        <span>Subtotal</span>
                                        <span className="font-mono">{formatMoney(itemsSubtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-[#69708a]">
                                        <span>IGV (18%)</span>
                                        <span className="font-mono">{formatMoney(itemsTax)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-[#101528] pt-1.5 border-t border-[#e6e9f2]">
                                        <span>Total</span>
                                        <span className="font-mono">{formatMoney(itemsTotal)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors disabled:opacity-50"
                                >
                                    {processing ? 'Guardando...' : 'Crear orden de compra'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL REGISTRAR PAGO */}
            {showPayModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-1">Registrar pago</h3>
                        <p className="text-xs text-[#69708a] mb-4">
                            Compra #{showPayModal.id} — Saldo pendiente: <strong>{formatMoney(showPayModal.balance)}</strong>
                        </p>

                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={showPayModal.balance}
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            placeholder="Monto a pagar"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none mb-4"
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowPayModal(null); setPayAmount(''); }}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={submitPayment}
                                className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors"
                            >
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMACIÓN */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-11 h-11 rounded-full bg-[#e0483e]/10 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-[#e0483e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <p className="text-sm text-[#101528] mb-6">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDialog.onConfirm}
                                className="flex-1 py-2.5 rounded-xl bg-[#e0483e] hover:bg-[#c93d34] text-white font-semibold text-sm transition-colors"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}