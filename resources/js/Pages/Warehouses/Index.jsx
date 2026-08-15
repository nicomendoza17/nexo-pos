import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';

export default function WarehousesIndex({ auth, warehouses }) {
    const { settings } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '', code: '', type: 'sucursal', address: '', phone: '',
        manager_name: '', allows_sales: true, replicate_products: true,
    });

    const formatMoney = (v) => `${settings.currency} ${Number(v).toFixed(2)}`;

    const openCreate = () => {
        setEditing(null);
        reset();
        setShowModal(true);
    };

    const openEdit = (w) => {
        setEditing(w);
        setData({
            name: w.name,
            code: w.code || '',
            type: w.type,
            address: w.address || '',
            phone: w.phone || '',
            manager_name: w.manager_name || '',
            allows_sales: w.allows_sales,
            replicate_products: false,
        });
        setShowModal(true);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            put(route('warehouses.update', editing.id), { onSuccess: () => setShowModal(false) });
        } else {
            post(route('warehouses.store'), { onSuccess: () => setShowModal(false) });
        }
    };

    const toggleStatus = (w) => {
        setConfirmDialog({
            message: w.is_active
                ? `¿Desactivar "${w.name}"? No podrá recibir ventas ni transferencias, pero su historial se conserva.`
                : `¿Reactivar "${w.name}"?`,
            onConfirm: () => {
                router.post(route('warehouses.toggle-status', w.id));
                setConfirmDialog(null);
            },
        });
    };

    const setDefault = (w) => {
        setConfirmDialog({
            message: `¿Establecer "${w.name}" como sucursal principal? Será la sucursal por defecto para nuevos usuarios y operaciones sin sucursal específica.`,
            onConfirm: () => {
                router.post(route('warehouses.set-default', w.id));
                setConfirmDialog(null);
            },
        });
    };

    const totalValue = warehouses.reduce((s, w) => s + w.inventory_value, 0);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Sucursales y almacenes"
            subheader={`${warehouses.length} ubicaciones · Inventario total ${formatMoney(totalValue)}`}
        >
            <Head title="Sucursales - NEXO POS" />

            <div className="flex justify-end mb-5">
                <button
                    onClick={openCreate}
                    className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    Nueva sucursal
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {warehouses.map((w) => (
                    <div
                        key={w.id}
                        className={`bg-white rounded-2xl border p-5 transition-all ${
                            !w.is_active ? 'opacity-60 border-[#e6e9f2]' : w.is_default ? 'border-[#4f46e5]' : 'border-[#e6e9f2]'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    w.type === 'almacen' ? 'bg-amber-100 text-amber-700' : 'bg-[#4f46e5]/10 text-[#4f46e5]'
                                }`}>
                                    {w.type === 'almacen' ? (
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8L12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></svg>
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-[#101528] leading-tight">{w.name}</div>
                                    <div className="text-[11px] text-[#a7aecb] font-mono">{w.code}</div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                {w.is_default && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#4f46e5] text-white">Principal</span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    w.is_active ? 'bg-[#0ea472]/10 text-[#0ea472]' : 'bg-[#e0483e]/10 text-[#e0483e]'
                                }`}>
                                    {w.is_active ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                        </div>

                        {(w.address || w.manager_name || w.phone) && (
                            <div className="text-xs text-[#69708a] mb-3 space-y-0.5">
                                {w.address && <div>{w.address}</div>}
                                {w.manager_name && <div>Responsable: {w.manager_name}</div>}
                                {w.phone && <div className="font-mono">{w.phone}</div>}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-[#f8f9fc] rounded-lg p-2.5">
                                <div className="text-[10px] text-[#a7aecb] uppercase font-semibold">Inventario</div>
                                <div className="text-sm font-mono font-bold text-[#101528]">{formatMoney(w.inventory_value)}</div>
                            </div>
                            <div className="bg-[#f8f9fc] rounded-lg p-2.5">
                                <div className="text-[10px] text-[#a7aecb] uppercase font-semibold">Con stock</div>
                                <div className="text-sm font-mono font-bold text-[#101528]">{w.with_stock} / {w.products}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#69708a] mb-4">
                            {w.low_stock > 0 && (
                                <span className="text-[#e0483e] font-semibold">{w.low_stock} con stock bajo</span>
                            )}
                            <span>{w.users_count} usuario(s)</span>
                            {!w.allows_sales && <span className="text-amber-600 font-semibold">Sin ventas</span>}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => openEdit(w)}
                                className="flex-1 py-2 rounded-lg border border-[#e6e9f2] text-[#69708a] text-xs font-semibold hover:border-[#4f46e5] hover:text-[#4f46e5] transition-colors"
                            >
                                Editar
                            </button>
                            {!w.is_default && w.is_active && (
                                <button
                                    onClick={() => setDefault(w)}
                                    className="flex-1 py-2 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] text-xs font-semibold hover:bg-[#4f46e5]/20 transition-colors"
                                >
                                    Hacer principal
                                </button>
                            )}
                            {!w.is_default && (
                                <button
                                    onClick={() => toggleStatus(w)}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                        w.is_active ? 'bg-[#e0483e]/10 text-[#e0483e] hover:bg-[#e0483e]/20' : 'bg-[#0ea472]/10 text-[#0ea472] hover:bg-[#0ea472]/20'
                                    }`}
                                >
                                    {w.is_active ? 'Desactivar' : 'Activar'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL CREAR / EDITAR */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">
                            {editing ? `Editar ${editing.name}` : 'Nueva sucursal'}
                        </h3>

                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Nombre *</label>
                                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Ej. Sucursal Norte"
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Código *</label>
                                    <input type="text" value={data.code} maxLength={20}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                        placeholder="NORTE"
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm font-mono focus:bg-white focus:border-[#4f46e5] outline-none" />
                                    {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Tipo *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setData({ ...data, type: 'sucursal', allows_sales: true })}
                                        className={`p-3 rounded-xl border text-left transition-colors ${
                                            data.type === 'sucursal' ? 'bg-[#4f46e5]/10 border-[#4f46e5]' : 'border-[#e6e9f2] hover:border-[#4f46e5]'
                                        }`}>
                                        <div className={`text-sm font-semibold ${data.type === 'sucursal' ? 'text-[#4f46e5]' : 'text-[#101528]'}`}>Sucursal</div>
                                        <div className="text-[11px] text-[#a7aecb] mt-0.5">Punto de venta al público</div>
                                    </button>
                                    <button type="button" onClick={() => setData({ ...data, type: 'almacen', allows_sales: false })}
                                        className={`p-3 rounded-xl border text-left transition-colors ${
                                            data.type === 'almacen' ? 'bg-amber-50 border-amber-500' : 'border-[#e6e9f2] hover:border-amber-500'
                                        }`}>
                                        <div className={`text-sm font-semibold ${data.type === 'almacen' ? 'text-amber-700' : 'text-[#101528]'}`}>Almacén</div>
                                        <div className="text-[11px] text-[#a7aecb] mt-0.5">Solo depósito, sin ventas</div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Dirección</label>
                                <input type="text" value={data.address} onChange={(e) => setData('address', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Responsable</label>
                                    <input type="text" value={data.manager_name} onChange={(e) => setData('manager_name', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Teléfono</label>
                                    <input type="text" value={data.phone} onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={data.allows_sales}
                                    onChange={(e) => setData('allows_sales', e.target.checked)}
                                    className="w-4 h-4 rounded accent-[#4f46e5]" />
                                <span className="text-sm text-[#101528]">Permite registrar ventas</span>
                            </label>

                            {!editing && (
                                <label className="flex items-start gap-2 cursor-pointer bg-[#f8f9fc] rounded-xl p-3">
                                    <input type="checkbox" checked={data.replicate_products}
                                        onChange={(e) => setData('replicate_products', e.target.checked)}
                                        className="w-4 h-4 rounded accent-[#4f46e5] mt-0.5" />
                                    <span className="text-xs text-[#69708a]">
                                        <strong className="text-[#101528]">Replicar catálogo de productos.</strong> Crea el registro de stock en cero para todos los productos activos, de modo que la sucursal ya pueda recibir transferencias y aparecer en inventario.
                                    </span>
                                </label>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={processing}
                                    className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm disabled:opacity-50">
                                    {processing ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear sucursal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONFIRMACIÓN */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-11 h-11 rounded-full bg-[#4f46e5]/10 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-[#4f46e5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                        </div>
                        <p className="text-sm text-[#101528] mb-6">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                                Cancelar
                            </button>
                            <button onClick={confirmDialog.onConfirm}
                                className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}