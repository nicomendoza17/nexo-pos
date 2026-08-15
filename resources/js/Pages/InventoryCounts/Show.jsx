import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

export default function InventoryCountShow({ auth, count, items }) {
    const [values, setValues] = useState(
        Object.fromEntries(items.map((i) => [i.id, i.counted_stock ?? '']))
    );
    const [saving, setSaving] = useState(null);
    const [confirmClose, setConfirmClose] = useState(false);

    const saveItem = async (itemId) => {
        const value = values[itemId];
        if (value === '' || value === null) return;

        setSaving(itemId);
        await fetch(route('inventory-counts.update-item', itemId), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
            },
            body: JSON.stringify({ counted_stock: value }),
        });
        setSaving(null);
    };

    const difference = (item) => {
        const counted = values[item.id];
        if (counted === '' || counted === null || counted === undefined) return null;
        return Number(counted) - item.system_stock;
    };

    const closeCount = () => {
        router.post(route('inventory-counts.close', count.id));
        setConfirmClose(false);
    };

    const pendingCount = items.filter((i) => values[i.id] === '' || values[i.id] === null).length;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={`Conteo #${count.id}`}
            subheader={`${count.category} · ${items.length - pendingCount} de ${items.length} contados`}
        >
            <Head title={`Conteo #${count.id} - NEXO POS`} />

            {count.status === 'abierto' && (
                <div className="flex justify-end mb-5">
                    <button
                        onClick={() => setConfirmClose(true)}
                        className="px-5 py-2.5 rounded-xl bg-[#0ea472] hover:bg-[#0c9463] text-white font-bold text-sm transition-all"
                    >
                        Cerrar conteo y aplicar ajustes
                    </button>
                </div>
            )}

            {count.status === 'cerrado' && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-[#0ea472]/10 text-[#0ea472] text-sm font-semibold">
                    Este conteo ya fue cerrado. Los ajustes de stock ya fueron aplicados.
                </div>
            )}

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Producto</th>
                            <th className="px-4 py-3 font-semibold">Código</th>
                            <th className="px-4 py-3 font-semibold text-right">Stock sistema</th>
                            <th className="px-4 py-3 font-semibold text-right">Cantidad contada</th>
                            <th className="px-4 py-3 font-semibold text-right">Diferencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => {
                            const diff = difference(item);
                            return (
                                <tr key={item.id} className="border-t border-[#e6e9f2]">
                                    <td className="px-4 py-3 font-semibold text-[#101528]">{item.product}</td>
                                    <td className="px-4 py-3 text-[#a7aecb] font-mono">{item.barcode || '—'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-[#69708a]">{item.system_stock} {item.unit_type}</td>
                                    <td className="px-4 py-3 text-right">
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            disabled={count.status !== 'abierto'}
                                            value={values[item.id]}
                                            onChange={(e) => setValues((v) => ({ ...v, [item.id]: e.target.value }))}
                                            onBlur={() => saveItem(item.id)}
                                            className="w-28 px-3 py-1.5 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm text-right focus:bg-white focus:border-[#4f46e5] outline-none disabled:opacity-50"
                                        />
                                        {saving === item.id && <span className="ml-2 text-xs text-[#a7aecb]">guardando...</span>}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono font-semibold ${
                                        diff === null ? 'text-[#a7aecb]' : diff === 0 ? 'text-[#69708a]' : diff > 0 ? 'text-[#0ea472]' : 'text-[#e0483e]'
                                    }`}>
                                        {diff === null ? '—' : diff > 0 ? `+${diff}` : diff}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MODAL CONFIRMAR CIERRE */}
            {confirmClose && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <p className="text-sm text-[#101528] mb-2 font-semibold">¿Cerrar este conteo?</p>
                        <p className="text-sm text-[#69708a] mb-6">
                            Se generarán ajustes de stock automáticos por cada producto con diferencia.
                            {pendingCount > 0 && ` ${pendingCount} producto(s) sin contar quedarán sin ajuste.`}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmClose(false)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={closeCount}
                                className="flex-1 py-2.5 rounded-xl bg-[#0ea472] hover:bg-[#0c9463] text-white font-semibold text-sm transition-colors"
                            >
                                Confirmar cierre
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}