import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

export default function PosIndex({ auth, initialProducts }) {
    // ============ ESTADOS ============
    const [cart, setCart] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');

    // ============ LÓGICA DE CATEGORÍAS ============
    const categories = ['Todos', ...new Set(initialProducts.map(p => p.category))];
    const filteredProducts = activeCategory === 'Todos'
        ? initialProducts
        : initialProducts.filter(p => p.category === activeCategory);

    // ============ LÓGICA DEL CARRITO ============
    const addToCart = (product) => {
        if (product.stock <= 0) return; // Validación de stock

        setCart(prevCart => {
            const existing = prevCart.find(item => item.id === product.id);
            if (existing) {
                if (existing.qty >= product.stock) return prevCart; // Límite de stock
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
                if (newQty <= 0) return null; // Se elimina en el filter
                if (newQty > product.stock) return item; // No superar stock
                return { ...item, qty: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
    const checkout = () => {
        if (cart.length === 0 || processing) return;
        setProcessing(true);

        router.post(route('pos.checkout'), {
            items: cart.map(item => ({ id: item.id, qty: item.qty })),
            payment_method: paymentMethod,
        }, {
            onSuccess: () => setCart([]),
            onError: (errors) => alert(errors.message || 'Error al procesar la venta'),
            onFinish: () => setProcessing(false),
        });
    };

    // ============ CÁLCULOS ============
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * 0.18; // IGV
    const total = subtotal + tax;

    const formatMoney = (amount) => `S/ ${amount.toFixed(2)}`;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Punto de Venta"
            subheader="Registra una nueva venta"
        >
            <Head title="Punto de Venta - NEXO POS" />

            <div className="flex h-[calc(100vh-140px)] gap-5">

                {/* PANEL IZQUIERDO: PRODUCTOS */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Tabs de Categorías */}
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

                    {/* Grilla de Productos */}
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
                                <div className="text-3xl mb-2">{p.emoji}</div>
                                <div className="text-sm font-semibold text-[#101528] leading-tight min-h-[36px]">{p.name}</div>
                                <div className="text-[15px] font-extrabold text-[#4f46e5] mt-1 font-mono">{formatMoney(p.price)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PANEL DERECHO: CARRITO */}
                <div className="w-[380px] bg-[#0f1729] rounded-[20px] flex flex-col text-white shrink-0 shadow-xl overflow-hidden">
                    <div className="p-5 border-b border-white/10 shrink-0">
                        <h3 className="text-lg font-bold flex justify-between items-center">
                            Venta actual
                            <span className="text-xs font-mono opacity-60 bg-white/10 px-2 py-1 rounded-md">
                                {cart.reduce((sum, item) => sum + item.qty, 0)} items
                            </span>
                        </h3>
                    </div>

                    {/* Lista de Items */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[#5c6484] p-6 text-center">
                                <svg className="w-12 h-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6" /></svg>
                                <div className="font-semibold text-sm">El carrito está vacío</div>
                                <div className="text-xs mt-1">Selecciona productos para empezar</div>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-3 border-b border-white/5 hover:bg-white/5 rounded-xl transition-colors">
                                    <div className="text-2xl">{item.emoji}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-semibold truncate">{item.name}</div>
                                        <div className="text-[11px] text-[#8891b3] font-mono">{formatMoney(item.price)} c/u</div>
                                    </div>

                                    {/* Controles de Cantidad */}
                                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-lg leading-none">−</button>
                                        <span className="w-5 text-center text-xs font-mono">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-lg leading-none">+</button>
                                    </div>

                                    <div className="text-[13px] font-bold w-14 text-right font-mono">{formatMoney(item.price * item.qty)}</div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-[#e0483e] hover:bg-red-500/20 p-1.5 rounded-lg transition-colors">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Resumen y Pago */}
                    <div className="p-5 border-t border-white/10 shrink-0 bg-[#0b1220]">
                        <div className="space-y-2 text-[13px] text-[#a7aecb]">
                            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{formatMoney(subtotal)}</span></div>
                            <div className="flex justify-between"><span>IGV (18%)</span><span className="font-mono">{formatMoney(tax)}</span></div>
                        </div>

                        <div className="flex gap-2 my-4">
                            {['Efectivo', 'Tarjeta', 'Yape'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${paymentMethod === method
                                            ? 'bg-[#4f46e5] text-white'
                                            : 'bg-white/5 text-[#a7aecb] hover:bg-white/10'
                                        }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between items-end mb-4 pt-4 border-t border-dashed border-white/20">
                            <span className="text-sm text-[#a7aecb] font-bold">TOTAL</span>
                            <span className="text-2xl font-extrabold text-[#0ea472] font-mono tracking-tight">{formatMoney(total)}</span>
                        </div>

                        <button
                            onClick={checkout}
                            disabled={cart.length === 0 || processing}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0ea472] to-[#0dbf85] text-white font-bold text-sm tracking-wide shadow-[0_8px_20px_-6px_rgba(14,164,114,0.5)] transition-all hover:brightness-110 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
                            {processing ? 'PROCESANDO...' : 'COBRAR VENTA'}
                        </button>
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}