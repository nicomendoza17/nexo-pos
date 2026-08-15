import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function PettyCashShow({ auth, fund, expenses, replenishments }) {
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const isAdmin = auth.user.role === 'admin';

    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '', concept: '', category: '', receipt_type: '', receipt_ruc: '', receipt_number: '',
    });

    const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`;
    const formatDateTime = (d) => new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const openModal = () => { reset(); setShowExpenseModal(true); };
    const submitExpense = (e) => {
        e.preventDefault();
        post(route('petty-cash.expense', fund.id), { onSuccess: () => setShowExpenseModal(false) });
    };

    const submitReplenish = () => {
        router.post(route('petty-cash.replenish', fund.id));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={fund.name}
            subheader={`Custodio: ${fund.custodian}`}
        >
            <Head title={`${fund.name} - NEXO POS`} />

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Monto fijo</div>
                    <div className="text-xl font-mono font-bold text-[#101528] mt-1">{formatMoney(fund.fixed_amount)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Saldo disponible</div>
                    <div className={`text-xl font-mono font-bold mt-1 ${fund.current_balance <= fund.fixed_amount * 0.2 ? 'text-[#e0483e]' : 'text-[#0ea472]'}`}>
                        {formatMoney(fund.current_balance)}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Pendiente de reponer</div>
                    <div className="text-xl font-mono font-bold text-amber-600 mt-1">{formatMoney(fund.spent_since_replenishment)}</div>
                </div>
            </div>

            <div className="flex justify-end gap-2 mb-5">
                {isAdmin && fund.spent_since_replenishment > 0 && (
                    <button
                        onClick={submitReplenish}
                        className="px-5 py-2.5 rounded-xl bg-[#0ea472] hover:bg-[#0c9463] text-white font-bold text-sm transition-all"
                    >
                        Reponer fondo ({formatMoney(fund.spent_since_replenishment)})
                    </button>
                )}
                <button
                    onClick={openModal}
                    className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all"
                >
                    Registrar gasto
                </button>
            </div>

            <h3 className="text-sm font-bold text-[#101528] mb-3">Gastos registrados</h3>
            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden mb-6">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Fecha</th>
                            <th className="px-4 py-3 font-semibold">Concepto</th>
                            <th className="px-4 py-3 font-semibold">Categoría</th>
                            <th className="px-4 py-3 font-semibold">Comprobante</th>
                            <th className="px-4 py-3 font-semibold">Registrado por</th>
                            <th className="px-4 py-3 font-semibold text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-[#a7aecb]">Sin gastos registrados</td></tr>
                        ) : (
                            expenses.map((e) => (
                                <tr key={e.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 text-[#69708a]">{formatDateTime(e.created_at)}</td>
                                    <td className="px-4 py-3 font-semibold text-[#101528]">{e.concept}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{e.category || '—'}</td>
                                    <td className="px-4 py-3 text-[#69708a]">
                                        {e.receipt_type || '—'}{e.receipt_number ? ` #${e.receipt_number}` : ''}
                                    </td>
                                    <td className="px-4 py-3 text-[#69708a]">{e.user}</td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#e0483e]">−{formatMoney(e.amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <h3 className="text-sm font-bold text-[#101528] mb-3">Historial de reposiciones</h3>
            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Fecha</th>
                            <th className="px-4 py-3 font-semibold">Aprobado por</th>
                            <th className="px-4 py-3 font-semibold text-right">Monto repuesto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {replenishments.length === 0 ? (
                            <tr><td colSpan="3" className="px-6 py-12 text-center text-[#a7aecb]">Sin reposiciones registradas</td></tr>
                        ) : (
                            replenishments.map((r) => (
                                <tr key={r.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 text-[#69708a]">{formatDateTime(r.created_at)}</td>
                                    <td className="px-4 py-3 font-semibold text-[#101528]">{r.approver}</td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#0ea472]">+{formatMoney(r.amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL NUEVO GASTO */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">Registrar gasto</h3>

                        <form onSubmit={submitExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Concepto *</label>
                                <input
                                    type="text"
                                    value={data.concept}
                                    onChange={(e) => setData('concept', e.target.value)}
                                    placeholder="Ej. Compra de útiles de limpieza"
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                />
                                {errors.concept && <p className="text-red-500 text-xs mt-1">{errors.concept}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Monto *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={data.amount}
                                        onChange={(e) => setData('amount', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                    {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Categoría</label>
                                    <input
                                        type="text"
                                        value={data.category}
                                        onChange={(e) => setData('category', e.target.value)}
                                        placeholder="Ej. Limpieza"
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Tipo de comprobante</label>
                                <select
                                    value={data.receipt_type}
                                    onChange={(e) => setData('receipt_type', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                >
                                    <option value="">Sin especificar</option>
                                    <option value="Boleta">Boleta</option>
                                    <option value="Factura">Factura</option>
                                    <option value="Sin comprobante">Sin comprobante</option>
                                </select>
                            </div>

                            {(data.receipt_type === 'Boleta' || data.receipt_type === 'Factura') && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">RUC del emisor</label>
                                        <input
                                            type="text"
                                            value={data.receipt_ruc}
                                            onChange={(e) => setData('receipt_ruc', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">N° de comprobante</label>
                                        <input
                                            type="text"
                                            value={data.receipt_number}
                                            onChange={(e) => setData('receipt_number', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={processing} className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm disabled:opacity-50">
                                    {processing ? 'Guardando...' : 'Registrar gasto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}