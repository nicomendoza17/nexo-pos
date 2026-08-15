import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function PettyCashIndex({ auth, funds, users }) {
    const [showModal, setShowModal] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '', custodian_id: '', fixed_amount: '',
    });

    const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`;

    const openModal = () => { reset(); setShowModal(true); };
    const submit = (e) => {
        e.preventDefault();
        post(route('petty-cash.store'), { onSuccess: () => setShowModal(false) });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Caja chica"
            subheader="Fondos fijos y custodios"
        >
            <Head title="Caja chica - NEXO POS" />

            <div className="flex justify-end mb-5">
                <button
                    onClick={openModal}
                    className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Nuevo fondo
                </button>
            </div>

            {funds.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-16 text-center text-[#a7aecb]">
                    No hay fondos de caja chica registrados
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {funds.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => router.visit(route('petty-cash.show', f.id))}
                            className="text-left bg-white rounded-2xl border border-[#e6e9f2] p-5 hover:border-[#4f46e5] hover:shadow-lg hover:shadow-indigo-500/10 transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-bold text-[#101528]">{f.name}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    f.status === 'activo' ? 'bg-[#0ea472]/10 text-[#0ea472]' : 'bg-[#a7aecb]/10 text-[#69708a]'
                                }`}>
                                    {f.status}
                                </span>
                            </div>
                            <p className="text-xs text-[#69708a] mb-4">Custodio: {f.custodian}</p>

                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[#69708a]">Monto fijo</span>
                                    <span className="font-mono font-semibold text-[#101528]">{formatMoney(f.fixed_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#69708a]">Saldo disponible</span>
                                    <span className={`font-mono font-bold ${f.current_balance <= f.fixed_amount * 0.2 ? 'text-[#e0483e]' : 'text-[#0ea472]'}`}>
                                        {formatMoney(f.current_balance)}
                                    </span>
                                </div>
                                {f.spent_since_replenishment > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-[#69708a]">Por reponer</span>
                                        <span className="font-mono font-semibold text-amber-600">{formatMoney(f.spent_since_replenishment)}</span>
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* MODAL NUEVO FONDO */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">Nuevo fondo de caja chica</h3>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Nombre del fondo *</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ej. Caja chica tienda principal"
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Custodio *</label>
                                <select
                                    value={data.custodian_id}
                                    onChange={(e) => setData('custodian_id', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                >
                                    <option value="">Seleccionar...</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                {errors.custodian_id && <p className="text-red-500 text-xs mt-1">{errors.custodian_id}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Monto fijo asignado *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={data.fixed_amount}
                                    onChange={(e) => setData('fixed_amount', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                />
                                {errors.fixed_amount && <p className="text-red-500 text-xs mt-1">{errors.fixed_amount}</p>}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={processing} className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm disabled:opacity-50">
                                    {processing ? 'Creando...' : 'Crear fondo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}