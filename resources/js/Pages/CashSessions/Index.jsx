import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { can } from '@/lib/permissions';
export default function CashSessionsIndex({ auth, sessions, currentSession, denominations }) {
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [openingAmount, setOpeningAmount] = useState('');

    const [showMovementModal, setShowMovementModal] = useState(false);
    const [movementType, setMovementType] = useState('retiro');
    const [movementConcept, setMovementConcept] = useState('');
    const [movementAmount, setMovementAmount] = useState('');

    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeStep, setCloseStep] = useState('count'); // 'count' -> 'result'
    const [blindAmount, setBlindAmount] = useState('');
    const [useDenominations, setUseDenominations] = useState(false);
    const [denomQty, setDenomQty] = useState({});
    const [closeResult, setCloseResult] = useState(null);

    const [showXReport, setShowXReport] = useState(false);
    const [xReportData, setXReportData] = useState(null);

    const canWithdraw = can(auth.user, 'caja.retirar-efectivo');
    const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`;
    const formatDateTime = (d) => new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const submitOpen = () => {
        if (openingAmount === '') return;
        router.post(route('cash-sessions.open'), { opening_amount: openingAmount }, {
            onSuccess: () => { setShowOpenModal(false); setOpeningAmount(''); },
        });
    };

    const submitMovement = () => {
        if (!movementConcept.trim() || !movementAmount) return;
        router.post(route('cash-sessions.movement', currentSession.id), {
            type: movementType,
            concept: movementConcept,
            amount: movementAmount,
        }, {
            onSuccess: () => { setShowMovementModal(false); setMovementConcept(''); setMovementAmount(''); },
        });
    };

    const denomTotal = () => {
        return denominations.reduce((sum, d) => sum + (Number(denomQty[d]) || 0) * d, 0);
    };

    const openXReport = async () => {
        const res = await fetch(route('cash-sessions.report-x', currentSession.id));
        setXReportData(await res.json());
        setShowXReport(true);
    };

    // Paso 1: conteo ciego — el cajero declara SIN ver el esperado
    const submitBlindCount = async () => {
        const amount = useDenominations ? denomTotal() : Number(blindAmount);
        if (!amount && amount !== 0) return;

        const payload = { blind_count_amount: amount };
        if (useDenominations) {
            payload.denominations = denominations
                .filter((d) => Number(denomQty[d]) > 0)
                .map((d) => ({ denomination: d, quantity: Number(denomQty[d]) }));
        }

        const res = await fetch(route('cash-sessions.blind-count', currentSession.id), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
            },
            body: JSON.stringify(payload),
        });
        const result = await res.json();
        setCloseResult({ blindAmount: amount, ...result });
        setCloseStep('result');
    };

    const confirmClose = () => {
        router.post(route('cash-sessions.close', currentSession.id), {}, {
            onSuccess: () => {
                setShowCloseModal(false);
                setCloseStep('count');
                setBlindAmount('');
                setDenomQty({});
                setCloseResult(null);
            },
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Caja"
            subheader="Apertura, cierre y arqueo de caja"
        >
            <Head title="Caja - NEXO POS" />

            {currentSession ? (
                <div className="bg-[#0f1729] rounded-2xl p-6 mb-6 text-white">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-lg font-bold">Caja abierta</h3>
                            <p className="text-xs text-[#a7aecb]">Desde {formatDateTime(currentSession.opened_at)}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={openXReport}
                                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all"
                            >
                                Corte X
                            </button>
                            <button
                                onClick={() => setShowMovementModal(true)}
                                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all"
                            >
                                Registrar movimiento
                            </button>
                            <button
                                onClick={() => setShowCloseModal(true)}
                                className="px-5 py-2.5 rounded-xl bg-[#e0483e] hover:bg-[#c93d34] text-white font-bold text-sm transition-all"
                            >
                                Cerrar caja (Corte Z)
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Monto inicial declarado</div>
                        <div className="text-lg font-mono font-bold mt-1">{formatMoney(currentSession.opening_amount)}</div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-8 text-center mb-6">
                    <p className="text-sm text-[#69708a] mb-4">No tienes una caja abierta actualmente</p>
                    <button
                        onClick={() => setShowOpenModal(true)}
                        className="px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all"
                    >
                        Abrir caja
                    </button>
                </div>
            )}

            <h3 className="text-sm font-bold text-[#101528] mb-3">Historial de cajas (Cortes Z)</h3>
            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Cajero</th>
                            <th className="px-4 py-3 font-semibold">Apertura</th>
                            <th className="px-4 py-3 font-semibold">Cierre</th>
                            <th className="px-4 py-3 font-semibold text-right">Esperado</th>
                            <th className="px-4 py-3 font-semibold text-right">Contado (ciego)</th>
                            <th className="px-4 py-3 font-semibold text-right">Diferencia</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.data.length === 0 ? (
                            <tr><td colSpan="7" className="px-6 py-16 text-center text-[#a7aecb]">Sin historial de caja</td></tr>
                        ) : (
                            sessions.data.map((s) => (
                                <tr key={s.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 font-semibold text-[#101528]">{s.user}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{formatDateTime(s.opened_at)}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{s.closed_at ? formatDateTime(s.closed_at) : '—'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-[#69708a]">{s.expected_amount !== null ? formatMoney(s.expected_amount) : '—'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-[#69708a]">{s.blind_count_amount !== null ? formatMoney(s.blind_count_amount) : '—'}</td>
                                    <td className={`px-4 py-3 text-right font-mono font-semibold ${s.difference === null ? 'text-[#a7aecb]' : s.difference === 0 ? 'text-[#69708a]' : s.difference > 0 ? 'text-[#0ea472]' : 'text-[#e0483e]'
                                        }`}>
                                        {s.difference !== null ? (s.difference > 0 ? `+${formatMoney(s.difference)}` : formatMoney(s.difference)) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.status === 'abierta' ? 'bg-amber-100 text-amber-700' : 'bg-[#0ea472]/10 text-[#0ea472]'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {sessions.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {sessions.links.map((link, i) => (
                        <button key={i} disabled={!link.url} onClick={() => link.url && router.visit(link.url)}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${link.active ? 'bg-[#4f46e5] text-white' : link.url ? 'bg-white border border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]' : 'text-[#c7cde3] cursor-not-allowed'
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* MODAL ABRIR CAJA */}
            {showOpenModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-4">Abrir caja</h3>
                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Monto inicial en efectivo</label>
                        <input type="number" step="0.01" min="0" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)}
                            placeholder="0.00" className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none mb-5" autoFocus />
                        <div className="flex gap-3">
                            <button onClick={() => setShowOpenModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">Cancelar</button>
                            <button onClick={submitOpen} className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm">Abrir caja</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL MOVIMIENTO (retiro / ingreso manual) */}
            {showMovementModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-4">Registrar movimiento</h3>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <button
                                onClick={() => setMovementType('ingreso_manual')}
                                className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${movementType === 'ingreso_manual' ? 'bg-[#0ea472]/10 border-[#0ea472] text-[#0ea472]' : 'border-[#e6e9f2] text-[#69708a]'
                                    }`}
                            >
                                + Ingreso
                            </button>
                            <button
                                onClick={() => setMovementType('retiro')}
                                className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${movementType === 'retiro' ? 'bg-[#e0483e]/10 border-[#e0483e] text-[#e0483e]' : 'border-[#e6e9f2] text-[#69708a]'
                                    }`}
                            >
                                − Retiro
                            </button>
                        </div>

                        {movementType === 'retiro' && !canWithdraw && (
                            <p className="text-xs text-[#e0483e] mb-3">Los retiros requieren autorización de un administrador.</p>
                        )}

                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Concepto</label>
                        <input type="text" value={movementConcept} onChange={(e) => setMovementConcept(e.target.value)}
                            placeholder="Ej. Retiro para depósito bancario" className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none mb-3" autoFocus />

                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Monto</label>
                        <input type="number" step="0.01" min="0.01" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)}
                            placeholder="0.00" className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none mb-5" />

                        <div className="flex gap-3">
                            <button onClick={() => setShowMovementModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">Cancelar</button>
                            <button onClick={submitMovement} className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm">Registrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CORTE X */}
            {showXReport && xReportData && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-1">Corte X</h3>
                        <p className="text-xs text-[#69708a] mb-4">Reporte de control — la caja sigue abierta</p>

                        <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between"><span className="text-[#69708a]">Monto inicial</span><span className="font-mono font-semibold">{formatMoney(xReportData.opening_amount)}</span></div>
                            {xReportData.sales_by_method.map((m) => (
                                <div key={m.method} className="flex justify-between"><span className="text-[#69708a]">Ventas {m.method} ({m.count})</span><span className="font-mono font-semibold">{formatMoney(m.total)}</span></div>
                            ))}
                            <div className="flex justify-between"><span className="text-[#69708a]">Ingresos manuales</span><span className="font-mono font-semibold text-[#0ea472]">+{formatMoney(xReportData.manual_income)}</span></div>
                            <div className="flex justify-between"><span className="text-[#69708a]">Retiros</span><span className="font-mono font-semibold text-[#e0483e]">−{formatMoney(xReportData.withdrawals)}</span></div>
                            <div className="flex justify-between pt-2 border-t border-[#e6e9f2] font-bold"><span>Esperado en caja ahora</span><span className="font-mono">{formatMoney(xReportData.expected_now)}</span></div>
                        </div>

                        <button onClick={() => setShowXReport(false)} className="w-full py-2.5 rounded-xl bg-[#f4f6fb] text-[#69708a] font-semibold text-sm hover:bg-[#e6e9f2]">Cerrar</button>
                    </div>
                </div>
            )}

            {/* MODAL CERRAR CAJA — Conteo ciego */}
            {showCloseModal && currentSession && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl my-8">
                        {closeStep === 'count' ? (
                            <>
                                <h3 className="text-lg font-bold text-[#101528] mb-1">Cierre de caja — Conteo ciego</h3>
                                <p className="text-xs text-[#69708a] mb-4">Cuenta el efectivo físico e ingrésalo. El sistema no te mostrará el monto esperado hasta que confirmes.</p>

                                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                                    <input type="checkbox" checked={useDenominations} onChange={(e) => setUseDenominations(e.target.checked)} className="w-4 h-4 rounded accent-[#4f46e5]" />
                                    <span className="text-sm text-[#101528] font-medium">Desglosar por billetes y monedas (opcional)</span>
                                </label>

                                {useDenominations ? (
                                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                                        {denominations.map((d) => (
                                            <div key={d} className="flex items-center gap-3">
                                                <span className="w-20 text-sm font-mono text-[#69708a]">S/ {d.toFixed(2)}</span>
                                                <input
                                                    type="number" min="0" step="1"
                                                    value={denomQty[d] || ''}
                                                    onChange={(e) => setDenomQty((v) => ({ ...v, [d]: e.target.value }))}
                                                    placeholder="0"
                                                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                                />
                                                <span className="w-20 text-right text-sm font-mono text-[#101528]">{formatMoney((Number(denomQty[d]) || 0) * d)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between pt-2 border-t border-[#e6e9f2] font-bold text-sm">
                                            <span>Total contado</span><span className="font-mono">{formatMoney(denomTotal())}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Monto total contado</label>
                                        <input type="number" step="0.01" min="0" value={blindAmount} onChange={(e) => setBlindAmount(e.target.value)}
                                            placeholder="0.00" className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none mb-4" autoFocus />
                                    </>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => setShowCloseModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">Cancelar</button>
                                    <button onClick={submitBlindCount} className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm">Confirmar conteo</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold text-[#101528] mb-4">Resultado del arqueo</h3>
                                <div className="space-y-2 text-sm mb-5">
                                    <div className="flex justify-between"><span className="text-[#69708a]">Contado (declarado)</span><span className="font-mono font-semibold">{formatMoney(closeResult.blindAmount)}</span></div>
                                    <div className="flex justify-between"><span className="text-[#69708a]">Esperado por el sistema</span><span className="font-mono font-semibold">{formatMoney(closeResult.expected_amount)}</span></div>
                                    <div className={`flex justify-between pt-2 border-t border-[#e6e9f2] font-bold text-base ${closeResult.difference === 0 ? 'text-[#69708a]' : closeResult.difference > 0 ? 'text-[#0ea472]' : 'text-[#e0483e]'
                                        }`}>
                                        <span>Diferencia</span>
                                        <span className="font-mono">{closeResult.difference > 0 ? `+${formatMoney(closeResult.difference)}` : formatMoney(closeResult.difference)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setCloseStep('count')} className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">Volver a contar</button>
                                    <button onClick={confirmClose} className="flex-1 py-2.5 rounded-xl bg-[#e0483e] hover:bg-[#c93d34] text-white font-semibold text-sm">Confirmar cierre (Corte Z)</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}