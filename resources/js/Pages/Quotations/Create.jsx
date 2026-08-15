import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function QuotationsCreate({ auth, clients, products, nextCode, defaultValidityDays }) {
    const [productSearch, setProductSearch] = useState('');
    const [showClientQuick, setShowClientQuick] = useState(false);
    const [quickName, setQuickName] = useState('');
    const [quickDoc, setQuickDoc] = useState('');
    const [quickLooking, setQuickLooking] = useState(false);
    const [localClients, setLocalClients] = useState(clients);
    const validUntilDate = new Date(Date.now() + defaultValidityDays * 86400000).toISOString().slice(0, 10);

    const today = new Date().toISOString().slice(0, 10);
    const in15Days = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

    const { data, setData, post, processing, errors } = useForm({
        client_id: '',
        issue_date: today,
        valid_until: in15Days,
        currency: 'PEN',
        exchange_rate: '',
        payment_terms: 'contado',
        delivery_time: '',
        delivery_place: '',
        discount_percent: '0',
        discount_amount: '0',
        valid_until: validUntilDate,
        notes: '',
        items: [],
    });

    const formatMoney = (amount) => `${data.currency === 'USD' ? '$' : 'S/'} ${Number(amount).toFixed(2)}`;

    const filteredProducts = productSearch.length >= 1
        ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8)
        : [];

    const addProduct = (product) => {
        setData('items', [...data.items, {
            product_id: product.id,
            name: product.name,
            description: '',
            quantity: 1,
            unit_price: product.price,
            discount_percent: 0,
            discount_amount: 0,
            stock: product.stock,
        }]);
        setProductSearch('');
    };

    const updateItem = (index, field, value) => {
        const items = [...data.items];
        items[index][field] = value;
        setData('items', items);
    };

    const removeItem = (index) => {
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const lineTotal = (item) => {
        const gross = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
        const disc = (gross * ((Number(item.discount_percent) || 0) / 100)) + (Number(item.discount_amount) || 0);
        return gross - disc;
    };

    const subtotal = data.items.reduce((sum, item) => sum + lineTotal(item), 0);
    const globalDiscount = (subtotal * ((Number(data.discount_percent) || 0) / 100)) + (Number(data.discount_amount) || 0);
    const afterDiscount = subtotal - globalDiscount;
    const tax = afterDiscount * 0.18;
    const total = afterDiscount + tax;

    const quickCreateClient = async () => {
        if (!quickName.trim()) return;
        const res = await fetch(route('clients.quick-store'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
            },
            body: JSON.stringify({
                name: quickName.trim(),
                document_number: quickDoc.replace(/\D/g, '') || null,
                document_type: quickDoc.replace(/\D/g, '').length === 8 ? 'dni' : quickDoc.replace(/\D/g, '').length === 11 ? 'ruc' : null,
            }),
        });
        if (res.ok) {
            const newClient = await res.json();
            setLocalClients((prev) => [...prev, newClient]);
            setData('client_id', newClient.id);
            setShowClientQuick(false);
            setQuickName('');
            setQuickDoc('');
        }
    };

    const quickLookupClient = async () => {
        const doc = quickDoc.replace(/\D/g, '');
        if (doc.length !== 8 && doc.length !== 11) return;
        setQuickLooking(true);
        try {
            const res = await fetch(`/clientes/consultar/${doc}`);
            const result = await res.json();
            if (res.ok) setQuickName(result.name || quickName);
        } finally {
            setQuickLooking(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        if (data.items.length === 0) {
            alert('Agrega al menos un producto');
            return;
        }
        post(route('quotations.store'));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Nueva cotización"
            subheader={nextCode}
        >
            <Head title="Nueva cotización - NEXO POS" />

            <form onSubmit={submit} className="space-y-5">
                {/* CLIENTE Y VENDEDOR */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-4">Cliente</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Cliente *</label>
                            <div className="flex gap-2">
                                <select
                                    value={data.client_id}
                                    onChange={(e) => setData('client_id', e.target.value)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                >
                                    <option value="">Seleccionar...</option>
                                    {localClients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}{c.document_number ? ` — ${c.document_number}` : ''}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => setShowClientQuick(true)}
                                    className="px-3 py-2.5 rounded-xl bg-[#4f46e5]/10 text-[#4f46e5] text-xs font-semibold hover:bg-[#4f46e5]/20 whitespace-nowrap">
                                    + Nuevo
                                </button>
                            </div>
                            {errors.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Vendedor</label>
                            <input type="text" value={auth.user.name} disabled className="w-full px-4 py-2.5 rounded-xl bg-[#f4f6fb] border border-[#e6e9f2] text-sm text-[#69708a]" />
                        </div>
                    </div>
                </div>

                {/* FECHAS Y MONEDA */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-4">Fechas y moneda</h3>
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Fecha emisión *</label>
                            <input type="date" value={data.issue_date} onChange={(e) => setData('issue_date', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Válida hasta *</label>
                            <input type="date" value={data.valid_until} onChange={(e) => setData('valid_until', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Moneda</label>
                            <select value={data.currency} onChange={(e) => setData('currency', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none">
                                <option value="PEN">Soles (PEN)</option>
                                <option value="USD">Dólares (USD)</option>
                            </select>
                        </div>
                        {data.currency === 'USD' && (
                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Tipo de cambio</label>
                                <input type="number" step="0.0001" value={data.exchange_rate} onChange={(e) => setData('exchange_rate', e.target.value)}
                                    placeholder="3.75" className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                            </div>
                        )}
                    </div>
                </div>

                {/* PRODUCTOS */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-4">Productos</h3>

                    <div className="relative mb-3">
                        <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Buscar producto por nombre o código..."
                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                        />
                        {filteredProducts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e9f2] rounded-xl overflow-hidden z-20 shadow-xl max-h-56 overflow-y-auto">
                                {filteredProducts.map((p) => (
                                    <button key={p.id} type="button" onClick={() => addProduct(p)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#f8f9fc] transition-colors border-b border-[#f4f6fb] last:border-0">
                                        <div>
                                            <div className="text-sm font-semibold text-[#101528]">{p.name}</div>
                                            <div className="text-[11px] text-[#a7aecb]">Stock: {p.stock} {p.unit_type}</div>
                                        </div>
                                        <div className="text-sm font-mono font-bold text-[#4f46e5]">S/ {Number(p.price).toFixed(2)}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {data.items.length === 0 ? (
                        <div className="text-center py-8 text-sm text-[#a7aecb] bg-[#f8f9fc] rounded-xl">Sin productos agregados</div>
                    ) : (
                        <div className="space-y-2">
                            {data.items.map((item, i) => (
                                <div key={i} className="border border-[#e6e9f2] rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-[#101528]">{item.name}</span>
                                        <button type="button" onClick={() => removeItem(i)} className="text-[#e0483e] hover:bg-red-50 p-1 rounded">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        <div>
                                            <label className="text-[10px] text-[#a7aecb] uppercase font-semibold">Cantidad</label>
                                            <input type="number" step="0.001" min="0.001" value={item.quantity}
                                                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                                className="w-full px-2 py-1.5 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#a7aecb] uppercase font-semibold">Precio unit.</label>
                                            <input type="number" step="0.01" min="0" value={item.unit_price}
                                                onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                                                className="w-full px-2 py-1.5 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#a7aecb] uppercase font-semibold">Desc. %</label>
                                            <input type="number" step="0.01" min="0" max="100" value={item.discount_percent}
                                                onChange={(e) => updateItem(i, 'discount_percent', e.target.value)}
                                                className="w-full px-2 py-1.5 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#a7aecb] uppercase font-semibold">Desc. monto</label>
                                            <input type="number" step="0.01" min="0" value={item.discount_amount}
                                                onChange={(e) => updateItem(i, 'discount_amount', e.target.value)}
                                                className="w-full px-2 py-1.5 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#a7aecb] uppercase font-semibold">Total línea</label>
                                            <div className="px-2 py-1.5 text-sm font-mono font-bold text-[#101528]">{formatMoney(lineTotal(item))}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* CONDICIONES COMERCIALES */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-4">Condiciones comerciales</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Términos de pago</label>
                            <select value={data.payment_terms} onChange={(e) => setData('payment_terms', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none">
                                <option value="contado">Al contado</option>
                                <option value="credito_15">Crédito 15 días</option>
                                <option value="credito_30">Crédito 30 días</option>
                                <option value="adelanto_50">50% adelanto</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Tiempo de entrega</label>
                            <input type="text" value={data.delivery_time} onChange={(e) => setData('delivery_time', e.target.value)}
                                placeholder="Ej. 3 días hábiles" className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Lugar de entrega</label>
                        <input type="text" value={data.delivery_place} onChange={(e) => setData('delivery_place', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Descuento global %</label>
                            <input type="number" step="0.01" min="0" max="100" value={data.discount_percent}
                                onChange={(e) => setData('discount_percent', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">Descuento global monto</label>
                            <input type="number" step="0.01" min="0" value={data.discount_amount}
                                onChange={(e) => setData('discount_amount', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Notas / condiciones adicionales</label>
                        <textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3}
                            placeholder="Garantías, términos y condiciones..."
                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none resize-none" />
                    </div>
                </div>

                {/* TOTALES */}
                <div className="bg-[#0f1729] rounded-2xl p-5 text-white">
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-[#a7aecb]"><span>Subtotal</span><span className="font-mono">{formatMoney(subtotal)}</span></div>
                        {globalDiscount > 0 && (
                            <div className="flex justify-between text-[#e0483e]"><span>Descuento</span><span className="font-mono">−{formatMoney(globalDiscount)}</span></div>
                        )}
                        <div className="flex justify-between text-[#a7aecb]"><span>IGV (18%)</span><span className="font-mono">{formatMoney(tax)}</span></div>
                        <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-lg"><span>Total</span><span className="font-mono text-[#0ea472]">{formatMoney(total)}</span></div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={() => router.visit(route('quotations.index'))}
                        className="flex-1 py-3 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                        Cancelar
                    </button>
                    <button type="submit" disabled={processing}
                        className="flex-1 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm disabled:opacity-50">
                        {processing ? 'Guardando...' : 'Crear cotización'}
                    </button>
                </div>
            </form>

            {/* MODAL CLIENTE RÁPIDO */}
            {showClientQuick && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-4">Cliente nuevo</h3>
                        <div className="flex gap-2 mb-3">
                            <input type="text" value={quickDoc} onChange={(e) => setQuickDoc(e.target.value)} placeholder="DNI o RUC" maxLength={11}
                                className="flex-1 px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" autoFocus />
                            <button type="button" onClick={quickLookupClient} disabled={quickLooking}
                                className="px-3 py-2 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] text-xs font-semibold hover:bg-[#4f46e5]/20 disabled:opacity-50">
                                {quickLooking ? '...' : 'Buscar'}
                            </button>
                        </div>
                        <input type="text" value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="Nombre"
                            className="w-full px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none mb-4" />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowClientQuick(false)} className="flex-1 py-2.5 rounded-lg border border-[#e6e9f2] text-[#69708a] text-sm font-semibold hover:bg-[#f8f9fc]">Cancelar</button>
                            <button type="button" onClick={quickCreateClient} className="flex-1 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-semibold">Guardar y usar</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}