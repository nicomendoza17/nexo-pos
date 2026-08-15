import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

const TYPE_LABELS = {
    ajuste_entrada: 'Entrada (+)',
    ajuste_salida: 'Salida (−)',
};

export default function InventoryAdjustmentsIndex({ auth, adjustments, products }) {
    const [showModal, setShowModal] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        product_id: '',
        type: 'ajuste_salida',
        quantity: '',
        reason: '',
    });

    const selectedProduct = products.find((p) => p.id === Number(data.product_id));

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const openModal = () => {
        reset();
        setShowModal(true);
    };
1
    const closeModal = () => {
        setShowModal(false);
        reset();
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('inventory-adjustments.store'), {
            onSuccess: () => closeModal(),
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Ajustes de inventario"
            subheader="Mermas, correcciones de conteo y ajustes manuales de stock"
        >
            <Head title="Ajustes de inventario - NEXO POS" />

            <div className="flex justify-end mb-5">
                <button
                    onClick={openModal}
                    className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Nuevo ajuste
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Fecha</th>
                            <th className="px-4 py-3 font-semibold">Producto</th>
                            <th className="px-4 py-3 font-semibold">Tipo</th>
                            <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                            <th className="px-4 py-3 font-semibold text-right">Stock antes</th>
                            <th className="px-4 py-3 font-semibold text-right">Stock después</th>
                            <th className="px-4 py-3 font-semibold">Motivo</th>
                            <th className="px-4 py-3 font-semibold">Usuario</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adjustments.data.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-16 text-center text-[#a7aecb]">
                                    Sin ajustes registrados
                                </td>
                            </tr>
                        ) : (
                            adjustments.data.map((a) => (
                                <tr key={a.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 text-[#69708a]">{formatDate(a.created_at)}</td>
                                    <td className="px-4 py-3 font-semibold text-[#101528]">{a.product}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                            a.type === 'ajuste_entrada' ? 'bg-[#0ea472]/10 text-[#0ea472]' : 'bg-[#e0483e]/10 text-[#e0483e]'
                                        }`}>
                                            {TYPE_LABELS[a.type]}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono font-semibold ${
                                        a.type === 'ajuste_entrada' ? 'text-[#0ea472]' : 'text-[#e0483e]'
                                    }`}>
                                        {a.type === 'ajuste_entrada' ? '+' : '−'}{a.quantity}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-[#69708a]">{a.stock_before}</td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#101528]">{a.stock_after}</td>
                                    <td className="px-4 py-3 text-[#69708a] max-w-[200px] truncate" title={a.notes}>{a.notes || '—'}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{a.user}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {adjustments.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {adjustments.links.map((link, i) => (
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

            {/* MODAL NUEVO AJUSTE */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">Nuevo ajuste de inventario</h3>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Producto *</label>
                                <select
                                    value={data.product_id}
                                    onChange={(e) => setData('product_id', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                >
                                    <option value="">Seleccionar...</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} (stock: {p.stock} {p.unit_type})</option>
                                    ))}
                                </select>
                                {errors.product_id && <p className="text-red-500 text-xs mt-1">{errors.product_id}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Tipo de ajuste *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setData('type', 'ajuste_entrada')}
                                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                                            data.type === 'ajuste_entrada'
                                                ? 'bg-[#0ea472]/10 border-[#0ea472] text-[#0ea472]'
                                                : 'border-[#e6e9f2] text-[#69708a] hover:border-[#0ea472]'
                                        }`}
                                    >
                                        + Entrada
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData('type', 'ajuste_salida')}
                                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                                            data.type === 'ajuste_salida'
                                                ? 'bg-[#e0483e]/10 border-[#e0483e] text-[#e0483e]'
                                                : 'border-[#e6e9f2] text-[#69708a] hover:border-[#e0483e]'
                                        }`}
                                    >
                                        − Salida
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">
                                    Cantidad * {selectedProduct ? `(${selectedProduct.unit_type})` : ''}
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={data.quantity}
                                    onChange={(e) => setData('quantity', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                />
                                {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Motivo *</label>
                                <textarea
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    placeholder="Ej. Producto vencido, conteo físico, rotura..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none resize-none"
                                />
                                {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors disabled:opacity-50"
                                >
                                    {processing ? 'Guardando...' : 'Registrar ajuste'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}