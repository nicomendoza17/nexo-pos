import { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';

export default function TransfersCreate({ auth, products, fromWarehouse, destinations, nextCode }) {
    const { settings } = usePage().props;
    const [search, setSearch] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        to_warehouse_id: '',
        notes: '',
        items: [],
    });

    const formatMoney = (v) => `${settings.currency} ${Number(v).toFixed(2)}`;

    const filtered = useMemo(() => {
        if (search.length < 1) return [];
        const added = data.items.map((i) => i.product_id);
        return products
            .filter((p) => !added.includes(p.id))
            .filter((p) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.barcode && p.barcode.includes(search))
            )
            .slice(0, 8);
    }, [search, products, data.items]);

    const addProduct = (p) => {
        setData('items', [...data.items, {
            product_id: p.id,
            name: p.name,
            unit_type: p.unit_type,
            available: p.available,
            cost_price: p.cost_price,
            quantity: '',
        }]);
        setSearch('');
    };

    const updateItem = (index, value) => {
        const items = [...data.items];
        items[index].quantity = value;
        setData('items', items);
    };

    const removeItem = (index) => {
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const totalValue = data.items.reduce((s, i) => s + (Number(i.quantity) || 0) * i.cost_price, 0);
    const totalUnits = data.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

    const hasErrors = data.items.some((i) => Number(i.quantity) > i.available || Number(i.quantity) <= 0);

    const submit = (e) => {
        e.preventDefault();
        if (data.items.length === 0) {
            alert('Agrega al menos un producto');
            return;
        }
        if (hasErrors) {
            alert('Revisa las cantidades: hay valores inválidos o mayores al stock disponible');
            return;
        }
        post(route('transfers.store'));
    };

    const destination = destinations.find((d) => d.id === Number(data.to_warehouse_id));

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Nueva transferencia"
            subheader={`${nextCode} · Saliendo de ${fromWarehouse?.name}`}
        >
            <Head title="Nueva transferencia - NEXO POS" />

            <form onSubmit={submit} className="space-y-5">
                {/* RUTA */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-4">Ruta de la transferencia</h3>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 bg-[#f8f9fc] rounded-xl p-4">
                            <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Origen</div>
                            <div className="text-sm font-bold text-[#101528] mt-1">{fromWarehouse?.name}</div>
                            <div className="text-[11px] text-[#a7aecb] font-mono">{fromWarehouse?.code}</div>
                        </div>

                        <svg className="w-6 h-6 text-[#4f46e5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>

                        <div className="flex-1">
                            <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1.5">Destino *</label>
                            <select
                                value={data.to_warehouse_id}
                                onChange={(e) => setData('to_warehouse_id', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                            >
                                <option value="">Seleccionar sucursal...</option>
                                {destinations.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} ({d.code}){d.type === 'almacen' ? ' — Almacén' : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.to_warehouse_id && <p className="text-red-500 text-xs mt-1">{errors.to_warehouse_id}</p>}
                        </div>
                    </div>

                    {destinations.length === 0 && (
                        <p className="text-xs text-amber-600 mt-3">
                            No hay otras sucursales activas. Crea una desde el módulo de Sucursales antes de transferir.
                        </p>
                    )}
                </div>

                {/* PRODUCTOS */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-1">Productos a transferir</h3>
                    <p className="text-xs text-[#a7aecb] mb-4">
                        Solo se listan productos con stock disponible en {fromWarehouse?.name}.
                    </p>

                    <div className="relative mb-4">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a7aecb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar producto por nombre o código..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                        />

                        {filtered.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e9f2] rounded-xl overflow-hidden z-20 shadow-xl max-h-64 overflow-y-auto">
                                {filtered.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => addProduct(p)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#f8f9fc] transition-colors border-b border-[#f4f6fb] last:border-0"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold text-[#101528]">{p.name}</div>
                                            <div className="text-[11px] text-[#a7aecb] font-mono">{p.barcode || 'Sin código'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-mono font-bold text-[#0ea472]">{p.available} {p.unit_type}</div>
                                            <div className="text-[10px] text-[#a7aecb]">disponible</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {data.items.length === 0 ? (
                        <div className="text-center py-10 text-sm text-[#a7aecb] bg-[#f8f9fc] rounded-xl">
                            Busca y agrega los productos que vas a transferir
                        </div>
                    ) : (
                        <div className="border border-[#e6e9f2] rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase">
                                        <th className="px-4 py-2.5 font-semibold">Producto</th>
                                        <th className="px-4 py-2.5 font-semibold text-right">Disponible</th>
                                        <th className="px-4 py-2.5 font-semibold text-right">A transferir</th>
                                        <th className="px-4 py-2.5 font-semibold text-right">Valor</th>
                                        <th className="px-4 py-2.5 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, i) => {
                                        const qty = Number(item.quantity) || 0;
                                        const excede = qty > item.available;

                                        return (
                                            <tr key={i} className="border-t border-[#e6e9f2]">
                                                <td className="px-4 py-2.5 font-semibold text-[#101528]">{item.name}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-[#69708a]">
                                                    {item.available} {item.unit_type}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0.001"
                                                        max={item.available}
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(i, e.target.value)}
                                                        placeholder="0"
                                                        className={`w-28 px-3 py-1.5 rounded-lg border text-sm text-right focus:bg-white outline-none ${
                                                            excede
                                                                ? 'bg-red-50 border-[#e0483e] text-[#e0483e]'
                                                                : 'bg-[#f8f9fc] border-[#e6e9f2] focus:border-[#4f46e5]'
                                                        }`}
                                                    />
                                                    {excede && (
                                                        <div className="text-[10px] text-[#e0483e] font-semibold mt-0.5">Excede el stock</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-mono text-[#69708a]">
                                                    {formatMoney(qty * item.cost_price)}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(i)}
                                                        className="p-1.5 text-[#e0483e] hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* NOTAS */}
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Notas de la transferencia</label>
                    <textarea
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        rows={3}
                        placeholder="Motivo del traslado, transportista, instrucciones especiales..."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none resize-none"
                    />
                </div>

                {/* RESUMEN */}
                {data.items.length > 0 && (
                    <div className="bg-[#0f1729] rounded-2xl p-5 text-white">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Productos</div>
                                <div className="text-xl font-mono font-bold mt-1">{data.items.length}</div>
                            </div>
                            <div>
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Unidades totales</div>
                                <div className="text-xl font-mono font-bold mt-1">{totalUnits.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Valor a costo</div>
                                <div className="text-xl font-mono font-bold text-[#0ea472] mt-1">{formatMoney(totalValue)}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                    Al crear la transferencia el stock <strong>todavía no se mueve</strong>. Quedará pendiente hasta que confirmes el despacho desde esta misma sucursal.
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => router.visit(route('transfers.index'))}
                        className="flex-1 py-3 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={processing || data.items.length === 0 || !data.to_warehouse_id}
                        className="flex-1 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm disabled:opacity-40"
                    >
                        {processing ? 'Creando...' : 'Crear transferencia'}
                    </button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}