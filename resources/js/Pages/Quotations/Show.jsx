import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

const STATUS_LABELS = { borrador: 'Borrador', enviada: 'Enviada', aceptada: 'Aceptada', rechazada: 'Rechazada', vencida: 'Vencida' };
const STATUS_COLORS = {
    borrador: 'bg-[#a7aecb]/10 text-[#69708a]', enviada: 'bg-[#4f46e5]/10 text-[#4f46e5]',
    aceptada: 'bg-[#0ea472]/10 text-[#0ea472]', rechazada: 'bg-[#e0483e]/10 text-[#e0483e]', vencida: 'bg-amber-100 text-amber-700',
};

const PAYMENT_TERMS_LABELS = {
    contado: 'Al contado',
    credito_15: 'Crédito a 15 días',
    credito_30: 'Crédito a 30 días',
    adelanto_50: '50% adelanto',
};

export default function QuotationsShow({ auth, quotation }) {
    const [showConvert, setShowConvert] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailInput, setEmailInput] = useState(quotation.client.email || '');
    const [sendingEmail, setSendingEmail] = useState(false);

    const formatMoney = (amount) => `${quotation.currency === 'USD' ? '$' : 'S/'} ${Number(amount).toFixed(2)}`;
    const formatDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

    const changeStatus = (status) => {
        router.post(route('quotations.status', quotation.id), { status });
    };

    const convert = () => {
        router.post(route('quotations.convert', quotation.id), { payment_method: paymentMethod }, {
            onSuccess: () => setShowConvert(false),
        });
    };

    const sendEmail = () => {
        setSendingEmail(true);
        router.post(route('quotations.send-email', quotation.id), { email: emailInput }, {
            onSuccess: () => setShowEmailModal(false),
            onFinish: () => setSendingEmail(false),
        });
    };

    const shareWhatsapp = async () => {
        const res = await fetch(route('quotations.share-link', quotation.id), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
            },
        });
        const { url } = await res.json();

        const phone = quotation.client.phone ? quotation.client.phone.replace(/\D/g, '') : '';
        const phoneWithCode = phone && !phone.startsWith('51') ? `51${phone}` : phone;

        const message = encodeURIComponent(
            `Hola ${quotation.client.name}, te compartimos la cotización ${quotation.code} por un total de ${quotation.currency === 'USD' ? '$' : 'S/'} ${Number(quotation.total).toFixed(2)}. Puedes verla aquí: ${url}`
        );

        const waUrl = phoneWithCode
            ? `https://wa.me/${phoneWithCode}?text=${message}`
            : `https://wa.me/?text=${message}`;

        window.open(waUrl, '_blank');
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={quotation.code}
            subheader={`Cliente: ${quotation.client.name}`}
        >
            <Head title={`${quotation.code} - NEXO POS`} />

            {/* BARRA DE ACCIONES */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_COLORS[quotation.status]}`}>
                        {STATUS_LABELS[quotation.status]}
                    </span>
                    {quotation.is_expired && quotation.status === 'vencida' && (
                        <span className="text-xs text-[#e0483e] font-semibold">Venció el {formatDate(quotation.valid_until)}</span>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap">
                    {/* Compartir / exportar */}
                    <a
                        href={route('quotations.pdf', quotation.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg bg-[#f4f6fb] text-[#69708a] text-sm font-semibold hover:bg-[#e6e9f2] transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        PDF
                    </a>
                    <button
                        onClick={() => setShowEmailModal(true)}
                        className="px-4 py-2 rounded-lg bg-[#f4f6fb] text-[#69708a] text-sm font-semibold hover:bg-[#e6e9f2] transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m22 7-10 5L2 7" />
                        </svg>
                        Correo
                    </button>
                    <button
                        onClick={shareWhatsapp}
                        className="px-4 py-2 rounded-lg bg-[#25D366]/10 text-[#1a9c4a] text-sm font-semibold hover:bg-[#25D366]/20 transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        WhatsApp
                    </button>

                    {/* Flujo de estados */}
                    {quotation.status === 'borrador' && (
                        <button onClick={() => changeStatus('enviada')} className="px-4 py-2 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] text-sm font-semibold hover:bg-[#4f46e5]/20 transition-colors">
                            Marcar como enviada
                        </button>
                    )}
                    {(quotation.status === 'enviada' || quotation.status === 'borrador') && (
                        <>
                            <button onClick={() => changeStatus('aceptada')} className="px-4 py-2 rounded-lg bg-[#0ea472]/10 text-[#0ea472] text-sm font-semibold hover:bg-[#0ea472]/20 transition-colors">
                                Aceptar
                            </button>
                            <button onClick={() => changeStatus('rechazada')} className="px-4 py-2 rounded-lg bg-[#e0483e]/10 text-[#e0483e] text-sm font-semibold hover:bg-[#e0483e]/20 transition-colors">
                                Rechazar
                            </button>
                        </>
                    )}
                    {quotation.status === 'aceptada' && !quotation.converted_sale_id && (
                        <button onClick={() => setShowConvert(true)} className="px-5 py-2 rounded-lg bg-[#0ea472] hover:bg-[#0c9463] text-white font-bold text-sm transition-colors">
                            Convertir a venta
                        </button>
                    )}
                    {quotation.converted_sale_id && (
                        <button onClick={() => router.visit(route('sales.index'))} className="px-4 py-2 rounded-lg bg-[#0ea472]/10 text-[#0ea472] text-sm font-semibold hover:bg-[#0ea472]/20 transition-colors">
                            Ver Venta #{quotation.converted_sale_id}
                        </button>
                    )}
                </div>
            </div>

            {/* RESUMEN */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Cliente</div>
                    <div className="text-sm font-semibold text-[#101528]">{quotation.client.name}</div>
                    <div className="text-xs text-[#69708a] mt-0.5">{quotation.client.document_number || 'Sin documento'}</div>
                    {quotation.client.email && <div className="text-xs text-[#69708a] mt-0.5">{quotation.client.email}</div>}
                    {quotation.client.phone && <div className="text-xs text-[#69708a] mt-0.5">{quotation.client.phone}</div>}
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Fechas</div>
                    <div className="text-sm text-[#101528]">Emisión: {formatDate(quotation.issue_date)}</div>
                    <div className="text-sm text-[#101528]">Vence: {formatDate(quotation.valid_until)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Vendedor</div>
                    <div className="text-sm font-semibold text-[#101528]">{quotation.user}</div>
                    <div className="text-xs text-[#69708a] mt-0.5">
                        Moneda: {quotation.currency === 'USD' ? 'Dólares (USD)' : 'Soles (PEN)'}
                        {quotation.exchange_rate ? ` · TC ${quotation.exchange_rate}` : ''}
                    </div>
                </div>
            </div>

            {/* PRODUCTOS */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden mb-5">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Producto</th>
                            <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                            <th className="px-4 py-3 font-semibold text-right">Precio unit.</th>
                            <th className="px-4 py-3 font-semibold text-right">Descuento</th>
                            <th className="px-4 py-3 font-semibold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotation.items.map((item) => (
                            <tr key={item.id} className="border-t border-[#e6e9f2]">
                                <td className="px-4 py-3">
                                    <div className="font-semibold text-[#101528]">{item.product}</div>
                                    {item.description && <div className="text-[11px] text-[#a7aecb] mt-0.5">{item.description}</div>}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-[#69708a]">{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-mono text-[#69708a]">{formatMoney(item.unit_price)}</td>
                                <td className="px-4 py-3 text-right font-mono text-[#e0483e]">
                                    {item.discount_percent > 0 || item.discount_amount > 0
                                        ? `${item.discount_percent}% + ${formatMoney(item.discount_amount)}`
                                        : '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-[#101528]">{formatMoney(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CONDICIONES Y TOTALES */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <h3 className="text-sm font-bold text-[#101528] mb-3">Condiciones comerciales</h3>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#69708a]">Términos de pago</span>
                            <span className="text-[#101528]">{PAYMENT_TERMS_LABELS[quotation.payment_terms] || quotation.payment_terms || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#69708a]">Tiempo de entrega</span>
                            <span className="text-[#101528]">{quotation.delivery_time || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#69708a]">Lugar de entrega</span>
                            <span className="text-[#101528]">{quotation.delivery_place || '—'}</span>
                        </div>
                    </div>
                    {quotation.notes && (
                        <div className="mt-3 pt-3 border-t border-[#e6e9f2]">
                            <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-1">Notas</div>
                            <p className="text-sm text-[#69708a]">{quotation.notes}</p>
                        </div>
                    )}
                </div>

                <div className="bg-[#0f1729] rounded-2xl p-5 text-white">
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-[#a7aecb]"><span>Subtotal</span><span className="font-mono">{formatMoney(quotation.subtotal)}</span></div>
                        {(quotation.discount_percent > 0 || quotation.discount_amount > 0) && (
                            <div className="flex justify-between text-[#e0483e]">
                                <span>Descuento global</span>
                                <span className="font-mono">{quotation.discount_percent}% + {formatMoney(quotation.discount_amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[#a7aecb]"><span>IGV (18%)</span><span className="font-mono">{formatMoney(quotation.tax)}</span></div>
                        <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-lg">
                            <span>Total</span>
                            <span className="font-mono text-[#0ea472]">{formatMoney(quotation.total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL CONVERTIR */}
            {showConvert && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-4">Convertir a venta</h3>
                        <p className="text-xs text-[#69708a] mb-4">Se creará una venta con los mismos productos y totales de esta cotización, sin volver a digitar nada.</p>

                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Método de pago</label>
                        <div className="grid grid-cols-3 gap-2 mb-5">
                            {['Efectivo', 'Tarjeta', 'Yape'].map((m) => (
                                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                                    className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${paymentMethod === m ? 'bg-[#4f46e5] border-[#4f46e5] text-white' : 'border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]'}`}>
                                    {m}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowConvert(false)} className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors">Cancelar</button>
                            <button onClick={convert} className="flex-1 py-2.5 rounded-xl bg-[#0ea472] hover:bg-[#0c9463] text-white font-semibold text-sm transition-colors">Confirmar conversión</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ENVIAR POR CORREO */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-1">Enviar por correo</h3>
                        <p className="text-xs text-[#69708a] mb-4">Se enviará la cotización {quotation.code} en PDF adjunto.</p>

                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Correo del destinatario</label>
                        <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="cliente@correo.com"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none mb-5"
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <button onClick={() => setShowEmailModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors">Cancelar</button>
                            <button onClick={sendEmail} disabled={sendingEmail || !emailInput} className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm disabled:opacity-50 transition-colors">
                                {sendingEmail ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}