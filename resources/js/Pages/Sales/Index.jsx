import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function SalesIndex({ auth, sales }) {
    const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`;

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleString('es-PE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const paymentBadge = (method) => {
        const colors = {
            Efectivo: 'bg-[#0ea472]/10 text-[#0ea472]',
            Tarjeta: 'bg-[#4f46e5]/10 text-[#4f46e5]',
            Yape: 'bg-[#a855f7]/10 text-[#a855f7]',
        };
        return colors[method] || 'bg-gray-100 text-gray-600';
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Historial de Ventas"
            subheader={`${sales.total} ventas registradas`}
        >
            <Head title="Ventas - NEXO POS" />

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-6 py-3 font-semibold">Venta</th>
                            <th className="px-6 py-3 font-semibold">Fecha</th>
                            <th className="px-6 py-3 font-semibold">Cajero</th>
                            <th className="px-6 py-3 font-semibold">Items</th>
                            <th className="px-6 py-3 font-semibold">Pago</th>
                            <th className="px-6 py-3 font-semibold text-right">Total</th>
                            <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.data.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-16 text-center text-[#a7aecb]">
                                    Aún no hay ventas registradas
                                </td>
                            </tr>
                        ) : (
                            sales.data.map((sale) => (
                                <tr key={sale.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-6 py-4 font-semibold text-[#101528]">#{sale.id}</td>
                                    <td className="px-6 py-4 text-[#69708a]">{formatDate(sale.created_at)}</td>
                                    <td className="px-6 py-4 text-[#69708a]">{sale.user?.name ?? '—'}</td>
                                    <td className="px-6 py-4 text-[#69708a]">
                                        {sale.items.reduce((sum, i) => sum + i.quantity, 0)} und
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${paymentBadge(sale.payment_method)}`}>
                                            {sale.payment_method}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-[#101528]">
                                        {formatMoney(sale.total)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => router.visit(route('sales.show', sale.id))}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4f46e5]/10 text-[#4f46e5] hover:bg-[#4f46e5]/20 transition-colors"
                                        >
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            {sales.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {sales.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url || '#'}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${link.active
                                    ? 'bg-[#4f46e5] text-white'
                                    : link.url
                                        ? 'bg-white border border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]'
                                        : 'text-[#c7cde3] cursor-not-allowed'
                                }`}
                        />
                    ))}
                </div>
            )}
        </AuthenticatedLayout>
    );
}