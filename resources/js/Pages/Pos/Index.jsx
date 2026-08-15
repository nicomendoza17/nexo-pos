import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { printPdf } from '@/lib/printer';

export default function PosIndex({ auth, initialProducts }) {
    // ============ CONFIGURACIÓN DEL SISTEMA ============
    const { settings, flash } = usePage().props;
    const PLACEHOLDER_IMG = settings.product_placeholder;
    const TAX_RATE = Number(settings.tax_rate) / 100;
    const autoPrint = settings.ticket_auto_print;

    // ============ ESTADOS ============
    const [cart, setCart] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [errorMessage, setErrorMessage] = useState(null);

    // ============ IMPRESIÓN Y RESULTADOS ============
    const [lastSale, setLastSale] = useState(null);
    const [printing, setPrinting] = useState(false);
    const [printError, setPrintError] = useState(null);

    // ============ CLIENTE ============
    const [clientQuery, setClientQuery] = useState('');
    const [clientResults, setClientResults] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const debounceRef = useRef(null);
    const clientBoxRef = useRef(null);

    // ============ ALTA RÁPIDA DE CLIENTE ============
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickName, setQuickName] = useState('');
    const [quickDoc, setQuickDoc] = useState('');
    const [quickLooking, setQuickLooking] = useState(false);
    const [quickSaving, setQuickSaving] = useState(false);
    const [quickError, setQuickError] = useState('');

    // ============ DESCUENTOS ============
    const [showDiscountModal, setShowDiscountModal] = useState(null); // null | 'global' | itemId
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountAmount, setDiscountAmount] = useState('');
    const [discountReason, setDiscountReason] = useState('');
    const [globalDiscount, setGlobalDiscount] = useState({ percent: 0, amount: 0, reason: '', authorizedBy: null });

    // ============ AUTORIZACIÓN POR PIN ============
    const [showPinModal, setShowPinModal] = useState(null); // { onAuthorized }
    const [pinValue, setPinValue] = useState('');
    const [pinChecking, setPinChecking] = useState(false);
    const [pinError, setPinError] = useState('');

    // ============ PAGO ============
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [payments, setPayments] = useState([]);
    const [paymentInput, setPaymentInput] = useState({ method: 'Efectivo', amount: '', received: '', reference: '' });

    const maxDiscount = Number(settings.discount_max_percent ?? 100);
    const requireReason = settings.discount_require_reason;
    const methods = settings.payment_methods ?? ['Efectivo'];
    const allowMixed = settings.allow_mixed_payment;

    const handlePrint = async (saleId) => {
        setPrinting(true);
        setPrintError(null);

        try {
            await printPdf(route('sales.ticket', saleId));
            setLastSale(null);
        } catch (e) {
            setPrintError(e.message);
        } finally {
            setPrinting(false);
        }
    };

    useEffect(() => {
        if (!flash?.last_sale_id) return;

        if (autoPrint) {
            // Imprime directo, sin pedir confirmación
            handlePrint(flash.last_sale_id);
        } else {
            setLastSale(flash.last_sale_id);
        }
    }, [flash?.last_sale_id, autoPrint]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (clientQuery.length < 2) {
            setClientResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/clientes/buscar?q=${encodeURIComponent(clientQuery)}`);
                setClientResults(await res.json());
            } catch (e) {
                setClientResults([]);
            }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [clientQuery]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (clientBoxRef.current && !clientBoxRef.current.contains(e.target)) {
                setShowClientDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectClient = (client) => {
        setSelectedClient(client);
        setClientQuery(client.name);
        setShowClientDropdown(false);
    };

    const clearClient = () => {
        setSelectedClient(null);
        setClientQuery('');
        setClientResults([]);
    };

    const openQuickAdd = () => {
        setQuickName(/^\d+$/.test(clientQuery) ? '' : clientQuery);
        setQuickDoc(/^\d+$/.test(clientQuery) ? clientQuery : '');
        setQuickError('');
        setShowQuickAdd(true);
        setShowClientDropdown(false);
    };

    const quickLookup = async () => {
        const doc = quickDoc.replace(/\D/g, '');
        if (doc.length !== 8 && doc.length !== 11) return;

        setQuickLooking(true);
        try {
            const res = await fetch(`/clientes/consultar/${doc}`);
            const result = await res.json();
            if (res.ok) {
                setQuickName(result.name || quickName);
            }
        } catch (e) {
            // silencioso: el cajero puede llenar el nombre a mano
        } finally {
            setQuickLooking(false);
        }
    };

    const saveQuickClient = async () => {
        if (!quickName.trim()) {
            setQuickError('El nombre es obligatorio');
            return;
        }

        setQuickSaving(true);
        setQuickError('');
        try {
            const doc = quickDoc.replace(/\D/g, '');
            const res = await fetch(route('clients.quick-store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify({
                    name: quickName.trim(),
                    document_type: doc.length === 8 ? 'dni' : doc.length === 11 ? 'ruc' : null,
                    document_number: doc || null,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                setQuickError(err.message || Object.values(err.errors || {})[0]?.[0] || 'Error al crear el cliente');
                return;
            }

            const newClient = await res.json();
            selectClient(newClient);
            setShowQuickAdd(false);
        } catch (e) {
            setQuickError('Error al crear el cliente');
        } finally {
            setQuickSaving(false);
        }
    };

    // ============ CATEGORÍAS ============
    const categories = ['Todos', ...new Set(initialProducts.map(p => p.category))];
    const filteredProducts = activeCategory === 'Todos'
        ? initialProducts
        : initialProducts.filter(p => p.category === activeCategory);

    // ============ CARRITO ============
    const addToCart = (product) => {
        if (product.stock <= 0) return;

        setCart(prevCart => {
            const existing = prevCart.find(item => item.id === product.id);
            if (existing) {
                if (existing.qty >= product.stock) return prevCart;
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, qty: item.qty + 1 } : item
                );
            }
            return [...prevCart, { ...product, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id === id) {
                const product = initialProducts.find(p => p.id === id);
                const newQty = item.qty + delta;
                if (newQty <= 0) return null;
                if (newQty > product.stock) return item;
                return { ...item, qty: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

    // ============ CÁLCULOS ============
    const lineTotal = (item) => {
        const gross = item.price * item.qty;
        const disc = (gross * ((item.discount_percent || 0) / 100)) + (item.discount_amount || 0);
        return Math.max(0, gross - disc);
    };

    const itemsSubtotal = cart.reduce((sum, item) => sum + lineTotal(item), 0);
    const itemsDiscount = cart.reduce((sum, item) => sum + (item.price * item.qty) - lineTotal(item), 0);

    const globalDiscountValue = (itemsSubtotal * (globalDiscount.percent / 100)) + globalDiscount.amount;
    const gross = Math.max(0, itemsSubtotal - globalDiscountValue);
    const totalDiscount = itemsDiscount + globalDiscountValue;

    const taxIncluded = settings.tax_included_in_price;
    const subtotal = taxIncluded ? gross / (1 + TAX_RATE) : gross;
    const tax = taxIncluded ? gross - subtotal : subtotal * TAX_RATE;
    const total = taxIncluded ? gross : subtotal + tax;

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const pendingAmount = Math.max(0, total - totalPaid);
    const changeAmount = Math.max(0, totalPaid - total);

    const formatMoney = (amount) => `${settings.currency} ${Number(amount).toFixed(2)}`;

    // ============ DESCUENTOS LÓGICA ============
    const openDiscount = (target) => {
        setShowDiscountModal(target);
        if (target === 'global') {
            setDiscountPercent(globalDiscount.percent || '');
            setDiscountAmount(globalDiscount.amount || '');
            setDiscountReason(globalDiscount.reason || '');
        } else {
            const item = cart.find((i) => i.id === target);
            setDiscountPercent(item?.discount_percent || '');
            setDiscountAmount(item?.discount_amount || '');
            setDiscountReason('');
        }
    };

    const applyDiscount = (authorizedBy = null) => {
        const pct = Number(discountPercent) || 0;
        const amt = Number(discountAmount) || 0;

        if (showDiscountModal === 'global') {
            setGlobalDiscount({ percent: pct, amount: amt, reason: discountReason, authorizedBy });
        } else {
            setCart((prev) => prev.map((i) =>
                i.id === showDiscountModal
                    ? { ...i, discount_percent: pct, discount_amount: amt }
                    : i
            ));
        }

        setShowDiscountModal(null);
        setDiscountPercent('');
        setDiscountAmount('');
        setDiscountReason('');
    };

    const confirmDiscount = () => {
        const pct = Number(discountPercent) || 0;
        const amt = Number(discountAmount) || 0;

        if (pct === 0 && amt === 0) {
            applyDiscount();
            return;
        }

        if (requireReason && !discountReason.trim()) {
            setErrorMessage('Indica el motivo del descuento.');
            return;
        }

        // Calcula el porcentaje efectivo para comparar contra el máximo permitido
        const base = showDiscountModal === 'global'
            ? itemsSubtotal
            : (cart.find((i) => i.id === showDiscountModal)?.price ?? 0) * (cart.find((i) => i.id === showDiscountModal)?.qty ?? 0);

        const effectivePct = base > 0 ? (((base * (pct / 100)) + amt) / base) * 100 : 0;

        if (effectivePct > maxDiscount) {
            // Supera el límite: requiere autorización de un supervisor
            setShowPinModal({
                onAuthorized: (authorizerId) => applyDiscount(authorizerId),
                message: `Este descuento (${effectivePct.toFixed(1)}%) supera el máximo permitido de ${maxDiscount}%.`,
            });
            return;
        }

        applyDiscount();
    };

    const clearGlobalDiscount = () => {
        setGlobalDiscount({ percent: 0, amount: 0, reason: '', authorizedBy: null });
    };

    const clearItemDiscount = (itemId) => {
        setCart((prev) => prev.map((i) =>
            i.id === itemId ? { ...i, discount_percent: 0, discount_amount: 0 } : i
        ));
    };

    // ============ AUTORIZACIÓN POR PIN LÓGICA ============
    const verifyPin = async () => {
        if (!pinValue.trim()) return;

        setPinChecking(true);
        setPinError('');

        try {
            const res = await fetch(route('users.verify-pin'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify({ pin: pinValue, permission: 'ventas.aplicar-descuento' }),
            });

            const result = await res.json();

            if (!res.ok || !result.authorized) {
                setPinError(result.message || 'PIN inválido o sin permiso para autorizar.');
                return;
            }

            const callback = showPinModal.onAuthorized;
            setShowPinModal(null);
            setPinValue('');
            callback(result.authorizer.id);
        } catch (e) {
            setPinError('No se pudo verificar el PIN.');
        } finally {
            setPinChecking(false);
        }
    };

    // ============ PAGOS LÓGICA ============
    const openPayment = () => {
        if (cart.length === 0) return;
        setPayments([]);
        setPaymentInput({ method: methods[0], amount: total.toFixed(2), received: '', reference: '' });
        setShowPaymentModal(true);
    };

    const addPayment = () => {
        const amount = Number(paymentInput.amount);
        if (!amount || amount <= 0) return;

        if (amount > pendingAmount + 0.01 && paymentInput.method !== 'Efectivo') {
            setErrorMessage('El monto supera lo pendiente por pagar.');
            return;
        }

        setPayments((prev) => [...prev, {
            method: paymentInput.method,
            amount: Math.min(amount, paymentInput.method === 'Efectivo' ? amount : pendingAmount),
            received: paymentInput.method === 'Efectivo' ? (Number(paymentInput.received) || amount) : null,
            reference: paymentInput.reference || null,
        }]);

        const remaining = Math.max(0, pendingAmount - amount);
        setPaymentInput({
            method: methods[0],
            amount: remaining > 0 ? remaining.toFixed(2) : '',
            received: '',
            reference: '',
        });
    };

    const removePayment = (index) => {
        setPayments((prev) => prev.filter((_, i) => i !== index));
    };

    const checkout = () => {
        if (cart.length === 0 || processing) return;

        if (payments.length === 0) {
            setErrorMessage('Registra al menos una forma de pago.');
            return;
        }

        if (Math.abs(totalPaid - total) > 0.01 && totalPaid < total) {
            setErrorMessage(`Falta cubrir ${settings.currency} ${pendingAmount.toFixed(2)} del total.`);
            return;
        }

        setProcessing(true);

        router.post(route('pos.checkout'), {
            items: cart.map((item) => ({
                id: item.id,
                qty: item.qty,
                discount_percent: item.discount_percent || 0,
                discount_amount: item.discount_amount || 0,
            })),
            client_id: selectedClient?.id || null,
            discount_percent: globalDiscount.percent,
            discount_amount: globalDiscount.amount,
            discount_reason: globalDiscount.reason || null,
            discount_authorized_by: globalDiscount.authorizedBy,
            payments: payments.map((p) => ({
                method: p.method,
                // El monto registrado nunca excede el total, aunque el cliente entregue más
                amount: Math.min(p.amount, total),
                received: p.received,
                reference: p.reference,
            })),
        }, {
            onSuccess: () => {
                setCart([]);
                clearClient();
                clearGlobalDiscount();
                setPayments([]);
                setShowPaymentModal(false);
            },
            onError: (errors) => setErrorMessage(errors.message || 'Error al procesar la venta'),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Punto de Venta"
            subheader="Registra una nueva venta"
            onSearchSelect={addToCart}
        >
            <Head title="Punto de Venta - NEXO POS" />

            <div className="flex h-[calc(100vh-140px)] gap-5">

                {/* PANEL IZQUIERDO: PRODUCTOS */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 shrink-0">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all ${activeCategory === cat
                                    ? 'bg-[#4f46e5] border-[#4f46e5] text-white'
                                    : 'bg-white border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pr-2 content-start">
                        {filteredProducts.map(p => (
                            <div
                                key={p.id}
                                onClick={() => addToCart(p)}
                                className={`bg-white border rounded-xl p-4 transition-all relative ${p.stock === 0
                                    ? 'opacity-50 cursor-not-allowed border-[#e6e9f2]'
                                    : 'cursor-pointer border-[#e6e9f2] hover:border-[#4f46e5] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10'
                                    }`}
                            >
                                <div className="absolute top-2 right-2 text-[10px] font-bold text-[#69708a] bg-[#f4f6fb] px-2 py-0.5 rounded-md">
                                    {p.stock === 0 ? 'Agotado' : `${p.stock} und`}
                                </div>

                                <img
                                    src={p.image_url || PLACEHOLDER_IMG}
                                    alt={p.name}
                                    className="w-full h-20 object-cover rounded-lg mb-2"
                                />

                                <div className="text-sm font-semibold text-[#101528] leading-tight min-h-[36px]">{p.name}</div>
                                {(p.brand || p.barcode) && (
                                    <div className="text-[10px] text-[#a7aecb] mt-0.5 truncate">
                                        {p.brand}{p.brand && p.barcode ? ' · ' : ''}{p.barcode}
                                    </div>
                                )}
                                <div className="text-[15px] font-extrabold text-[#4f46e5] mt-1 font-mono">{formatMoney(p.price)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PANEL DERECHO: CARRITO */}
                <div className="w-[380px] bg-[#0f1729] rounded-[20px] flex flex-col text-white shrink-0 shadow-xl overflow-hidden">

                    {/* SELECTOR DE CLIENTE */}
                    <div ref={clientBoxRef} className="p-4 border-b border-white/10 relative">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={clientQuery}
                                    onChange={(e) => {
                                        setClientQuery(e.target.value);
                                        setSelectedClient(null);
                                        setShowClientDropdown(true);
                                    }}
                                    onFocus={() => setShowClientDropdown(true)}
                                    placeholder="Buscar cliente (opcional)"
                                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-[#5c6484] focus:bg-white/10 focus:border-[#4f46e5] outline-none transition-all"
                                />

                                {showClientDropdown && clientQuery.length >= 2 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#151e33] border border-white/10 rounded-lg overflow-hidden z-20 shadow-xl max-h-48 overflow-y-auto">
                                        {clientResults.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => selectClient(c)}
                                                className="w-full text-left px-3 py-2 text-xs text-[#c7cde3] hover:bg-white/10 transition-colors"
                                            >
                                                <div className="font-semibold">{c.name}</div>
                                                {c.document_number && (
                                                    <div className="text-[10px] text-[#5c6484]">{c.document_number}</div>
                                                )}
                                            </button>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={openQuickAdd}
                                            className="w-full text-left px-3 py-2 text-xs text-[#0ea472] hover:bg-white/10 transition-colors border-t border-white/10 flex items-center gap-1.5 font-semibold"
                                        >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                                            Crear cliente nuevo
                                        </button>
                                    </div>
                                )}
                            </div>

                            {selectedClient && (
                                <button type="button" onClick={clearClient} className="text-[#5c6484] hover:text-white p-1">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>

                        {selectedClient ? (
                            <div className="mt-1.5 text-[11px] text-[#0ea472] font-semibold">
                                ✓ {selectedClient.name}
                            </div>
                        ) : (
                            <div className="mt-1.5 text-[11px] text-[#5c6484]">Sin cliente = venta general</div>
                        )}
                    </div>

                    <div className="p-5 border-b border-white/10 shrink-0">
                        <h3 className="text-lg font-bold flex justify-between items-center">
                            Venta actual
                            <span className="text-xs font-mono opacity-60 bg-white/10 px-2 py-1 rounded-md">
                                {cart.reduce((sum, item) => sum + item.qty, 0)} items
                            </span>
                        </h3>
                    </div>

                    {/* Lista de items */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[#5c6484] p-6 text-center">
                                <svg className="w-12 h-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6" /></svg>
                                <div className="font-semibold text-sm">El carrito está vacío</div>
                                <div className="text-xs mt-1">Selecciona productos para empezar</div>
                            </div>
                        ) : (
                            cart.map(item => {
                                const hasDiscount = (item.discount_percent > 0 || item.discount_amount > 0);
                                const grossItem = item.price * item.qty;

                                return (
                                    <div key={item.id} className="flex items-center gap-3 p-3 border-b border-white/5 hover:bg-white/5 rounded-xl transition-colors">
                                        <img src={item.image_url || PLACEHOLDER_IMG} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />

                                        <div className="flex-1 min-w-0">
                                            <div className="text-[13px] font-semibold truncate">{item.name}</div>
                                            <div className="text-[11px] text-[#8891b3] font-mono">
                                                {formatMoney(item.price)} c/u
                                                {hasDiscount && (
                                                    <span className="text-[#0ea472] ml-1">
                                                        −{item.discount_percent > 0 ? `${item.discount_percent}%` : formatMoney(item.discount_amount)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                                            <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-lg leading-none">−</button>
                                            <span className="w-5 text-center text-xs font-mono">{item.qty}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-lg leading-none">+</button>
                                        </div>

                                        <div className="w-16 text-right">
                                            {hasDiscount && (
                                                <div className="text-[10px] text-[#5c6484] line-through font-mono">{formatMoney(grossItem)}</div>
                                            )}
                                            <div className="text-[13px] font-bold font-mono">{formatMoney(lineTotal(item))}</div>
                                        </div>

                                        <button
                                            onClick={() => hasDiscount ? clearItemDiscount(item.id) : openDiscount(item.id)}
                                            title={hasDiscount ? 'Quitar descuento' : 'Aplicar descuento'}
                                            className={`p-1.5 rounded-lg transition-colors ${hasDiscount ? 'text-[#0ea472] hover:bg-[#0ea472]/20' : 'text-[#5c6484] hover:bg-white/10'}`}
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
                                            </svg>
                                        </button>

                                        <button onClick={() => removeFromCart(item.id)} className="text-[#e0483e] hover:bg-red-500/20 p-1.5 rounded-lg transition-colors">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Resumen y pago */}
                    <div className="p-5 border-t border-white/10 shrink-0 bg-[#0b1220]">
                        <div className="space-y-2 text-[13px] text-[#a7aecb]">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="font-mono">{formatMoney(subtotal)}</span>
                            </div>

                            {totalDiscount > 0 && (
                                <div className="flex justify-between text-[#0ea472]">
                                    <span>Descuentos</span>
                                    <span className="font-mono">−{formatMoney(totalDiscount)}</span>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <span>IGV ({settings.tax_rate}%)</span>
                                <span className="font-mono">{formatMoney(tax)}</span>
                            </div>

                            {taxIncluded && (
                                <div className="text-[10px] text-[#5c6484] italic">Los precios mostrados ya incluyen IGV</div>
                            )}
                        </div>

                        {/* DESCUENTO GLOBAL */}
                        <button
                            onClick={() => globalDiscount.percent || globalDiscount.amount ? clearGlobalDiscount() : openDiscount('global')}
                            disabled={cart.length === 0}
                            className={`w-full mt-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-30 ${globalDiscount.percent || globalDiscount.amount
                                ? 'bg-[#0ea472]/20 text-[#0ea472] hover:bg-[#0ea472]/30'
                                : 'bg-white/5 text-[#a7aecb] hover:bg-white/10'
                                }`}
                        >
                            {globalDiscount.percent || globalDiscount.amount
                                ? `Descuento aplicado: ${globalDiscount.percent > 0 ? globalDiscount.percent + '%' : formatMoney(globalDiscount.amount)} — quitar`
                                : 'Aplicar descuento a la venta'}
                        </button>

                        <div className="flex justify-between items-end my-4 pt-4 border-t border-dashed border-white/20">
                            <span className="text-sm text-[#a7aecb] font-bold">TOTAL</span>
                            <span className="text-2xl font-extrabold text-[#0ea472] font-mono tracking-tight">{formatMoney(total)}</span>
                        </div>

                        <button
                            onClick={openPayment}
                            disabled={cart.length === 0 || processing}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0ea472] to-[#0dbf85] text-white font-bold text-sm tracking-wide shadow-[0_8px_20px_-6px_rgba(14,164,114,0.5)] transition-all hover:brightness-110 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
                            COBRAR VENTA
                        </button>
                    </div>
                </div>

            </div>

            {/* MODAL ALTA RÁPIDA DE CLIENTE */}
            {showQuickAdd && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-4">Cliente nuevo</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-[#69708a] mb-1">DNI / RUC (opcional)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={quickDoc}
                                        onChange={(e) => setQuickDoc(e.target.value)}
                                        placeholder="Ej. 12345678"
                                        maxLength={11}
                                        className="flex-1 px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={quickLookup}
                                        disabled={quickLooking}
                                        className="px-3 py-2 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] text-xs font-semibold hover:bg-[#4f46e5]/20 disabled:opacity-50"
                                    >
                                        {quickLooking ? '...' : 'Buscar'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#69708a] mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={quickName}
                                    onChange={(e) => setQuickName(e.target.value)}
                                    placeholder="Nombre del cliente"
                                    className="w-full px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                />
                            </div>

                            {quickError && <p className="text-red-500 text-xs">{quickError}</p>}

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowQuickAdd(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-[#e6e9f2] text-[#69708a] text-sm font-semibold hover:bg-[#f8f9fc]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={saveQuickClient}
                                    disabled={quickSaving}
                                    className="flex-1 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-semibold disabled:opacity-50"
                                >
                                    {quickSaving ? 'Guardando...' : 'Guardar y usar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ERROR */}
            {errorMessage && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-[#101528] mb-2">No se pudo completar la venta</h3>
                        <p className="text-sm text-[#69708a] mb-6">{errorMessage}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setErrorMessage(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]"
                            >
                                Entendido
                            </button>
                            {errorMessage.includes('caja') && (
                                <button
                                    onClick={() => router.visit(route('cash-sessions.index'))}
                                    className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm"
                                >
                                    Abrir caja
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE VENTA COMPLETADA / IMPRESIÓN */}
            {lastSale && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
                        <div className="w-14 h-14 rounded-full bg-[#0ea472]/10 flex items-center justify-center mb-4 mx-auto">
                            <svg className="w-7 h-7 text-[#0ea472]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-[#101528] mb-1">Venta registrada</h3>
                        <p className="text-sm text-[#69708a] mb-6">Venta #{lastSale} completada correctamente.</p>

                        {printError && (
                            <div className="flex items-start gap-2 bg-red-50 border border-[#e0483e]/30 rounded-xl px-3 py-2.5 mb-4 text-left">
                                <svg className="w-4 h-4 text-[#e0483e] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <div>
                                    <div className="text-xs text-[#e0483e] font-medium">{printError}</div>
                                    <a
                                        href={route('sales.ticket', lastSale)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-[#4f46e5] font-semibold hover:underline"
                                    >
                                        Abrir el ticket en otra pestaña
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setLastSale(null); setPrintError(null); }}
                                disabled={printing}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] disabled:opacity-50"
                            >
                                Continuar
                            </button>
                            <button
                                onClick={() => handlePrint(lastSale)}
                                disabled={printing}
                                className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {printing ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                        </svg>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="6 9 6 2 18 2 18 9" />
                                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                            <rect x="6" y="14" width="12" height="8" />
                                        </svg>
                                        {printError ? 'Reintentar' : 'Imprimir'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Aviso flotante cuando falla la impresión automática */}
            {autoPrint && printError && !lastSale && (
                <div className="fixed bottom-6 right-6 bg-white border border-[#e0483e]/30 rounded-xl shadow-xl p-4 max-w-sm z-[60]">
                    <div className="flex items-start gap-2.5">
                        <svg className="w-5 h-5 text-[#e0483e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-[#101528] mb-0.5">No se pudo imprimir</div>
                            <div className="text-xs text-[#69708a] mb-2">{printError}</div>
                            <button
                                onClick={() => setPrintError(null)}
                                className="text-xs font-semibold text-[#4f46e5] hover:underline"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE DESCUENTO */}
            {showDiscountModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-1">
                            {showDiscountModal === 'global' ? 'Descuento a la venta' : 'Descuento al producto'}
                        </h3>
                        <p className="text-xs text-[#69708a] mb-4">
                            Máximo sin autorización: {maxDiscount}%. Por encima se pedirá el PIN de un supervisor.
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-semibold text-[#69708a] mb-1">Porcentaje (%)</label>
                                <input
                                    type="number" step="0.01" min="0" max="100"
                                    value={discountPercent}
                                    onChange={(e) => { setDiscountPercent(e.target.value); setDiscountAmount(''); }}
                                    placeholder="0"
                                    className="w-full px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#69708a] mb-1">Monto fijo</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={discountAmount}
                                    onChange={(e) => { setDiscountAmount(e.target.value); setDiscountPercent(''); }}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                />
                            </div>
                        </div>

                        {requireReason && (
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-[#69708a] mb-1">Motivo *</label>
                                <input
                                    type="text"
                                    value={discountReason}
                                    onChange={(e) => setDiscountReason(e.target.value)}
                                    placeholder="Ej. Cliente frecuente, producto próximo a vencer..."
                                    className="w-full px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDiscountModal(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDiscount}
                                className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE AUTORIZACIÓN POR PIN */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>

                        <h3 className="text-base font-bold text-[#101528] mb-1">Autorización requerida</h3>
                        <p className="text-sm text-[#69708a] mb-4">{showPinModal.message}</p>

                        <label className="block text-xs font-semibold text-[#69708a] mb-1">PIN del supervisor</label>
                        <input
                            type="password"
                            maxLength={6}
                            value={pinValue}
                            onChange={(e) => { setPinValue(e.target.value); setPinError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
                            placeholder="••••"
                            className="w-full px-4 py-3 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-lg font-mono text-center tracking-widest focus:bg-white focus:border-[#4f46e5] outline-none mb-2"
                            autoFocus
                        />

                        {pinError && <p className="text-[#e0483e] text-xs mb-3">{pinError}</p>}

                        <div className="flex gap-3 mt-3">
                            <button
                                onClick={() => { setShowPinModal(null); setPinValue(''); setPinError(''); }}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={verifyPin}
                                disabled={pinChecking}
                                className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm disabled:opacity-50"
                            >
                                {pinChecking ? 'Verificando...' : 'Autorizar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE PAGO */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl my-8">
                        <h3 className="text-lg font-bold text-[#101528] mb-1">Cobrar venta</h3>
                        <p className="text-xs text-[#69708a] mb-4">
                            {allowMixed ? 'Puedes combinar varios métodos de pago.' : 'Selecciona el método de pago.'}
                        </p>

                        {/* RESUMEN */}
                        <div className="bg-[#0f1729] rounded-xl p-4 mb-4 text-white">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-[#a7aecb]">Total a cobrar</span>
                                <span className="font-mono font-bold text-lg">{formatMoney(total)}</span>
                            </div>
                            {payments.length > 0 && (
                                <>
                                    <div className="flex justify-between text-xs text-[#a7aecb]">
                                        <span>Pagado</span>
                                        <span className="font-mono">{formatMoney(totalPaid)}</span>
                                    </div>
                                    <div className={`flex justify-between text-sm font-bold mt-1 pt-1 border-t border-white/10 ${pendingAmount > 0 ? 'text-amber-400' : 'text-[#0ea472]'
                                        }`}>
                                        <span>{pendingAmount > 0 ? 'Pendiente' : changeAmount > 0 ? 'Vuelto' : 'Completo'}</span>
                                        <span className="font-mono">
                                            {formatMoney(pendingAmount > 0 ? pendingAmount : changeAmount)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* PAGOS REGISTRADOS */}
                        {payments.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {payments.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between bg-[#f8f9fc] rounded-lg px-3 py-2">
                                        <div>
                                            <div className="text-sm font-semibold text-[#101528]">{p.method}</div>
                                            {p.reference && <div className="text-[10px] text-[#a7aecb]">Ref: {p.reference}</div>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono font-bold text-[#101528]">{formatMoney(p.amount)}</span>
                                            <button onClick={() => removePayment(i)} className="text-[#e0483e] p-1 hover:bg-red-50 rounded">
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AGREGAR PAGO */}
                        {pendingAmount > 0.01 && (
                            <div className="border border-[#e6e9f2] rounded-xl p-3 mb-4">
                                <div className="grid grid-cols-3 gap-1.5 mb-3">
                                    {methods.map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setPaymentInput((p) => ({ ...p, method: m, received: '', reference: '' }))}
                                            className={`py-2 rounded-lg text-xs font-bold transition-colors ${paymentInput.method === m
                                                ? 'bg-[#4f46e5] text-white'
                                                : 'bg-[#f8f9fc] text-[#69708a] hover:bg-[#e6e9f2]'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-[#a7aecb] uppercase mb-1">Monto</label>
                                        <input
                                            type="number" step="0.01" min="0.01"
                                            value={paymentInput.amount}
                                            onChange={(e) => setPaymentInput((p) => ({ ...p, amount: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                            autoFocus
                                        />
                                    </div>

                                    {paymentInput.method === 'Efectivo' ? (
                                        <div>
                                            <label className="block text-[10px] font-semibold text-[#a7aecb] uppercase mb-1">Recibido</label>
                                            <input
                                                type="number" step="0.01" min="0"
                                                value={paymentInput.received}
                                                onChange={(e) => setPaymentInput((p) => ({ ...p, received: e.target.value }))}
                                                placeholder={paymentInput.amount}
                                                className="w-full px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-[10px] font-semibold text-[#a7aecb] uppercase mb-1">N° operación</label>
                                            <input
                                                type="text"
                                                value={paymentInput.reference}
                                                onChange={(e) => setPaymentInput((p) => ({ ...p, reference: e.target.value }))}
                                                placeholder="Opcional"
                                                className="w-full px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                            />
                                        </div>
                                    )}
                                </div>

                                {paymentInput.method === 'Efectivo' && Number(paymentInput.received) > Number(paymentInput.amount) && (
                                    <div className="text-xs text-[#0ea472] font-semibold mb-2">
                                        Vuelto: {formatMoney(Number(paymentInput.received) - Number(paymentInput.amount))}
                                    </div>
                                )}

                                <button
                                    onClick={addPayment}
                                    className="w-full py-2 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] text-sm font-semibold hover:bg-[#4f46e5]/20"
                                >
                                    {allowMixed && payments.length > 0 ? 'Agregar otro pago' : 'Agregar pago'}
                                </button>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowPaymentModal(false); setPayments([]); }}
                                className="flex-1 py-3 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={checkout}
                                disabled={processing || pendingAmount > 0.01}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#0ea472] to-[#0dbf85] text-white font-bold text-sm disabled:opacity-40"
                            >
                                {processing ? 'PROCESANDO...' : 'CONFIRMAR COBRO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}