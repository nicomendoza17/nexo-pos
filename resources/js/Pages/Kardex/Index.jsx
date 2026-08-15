import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

const TYPE_LABELS = {
    venta: 'Venta',
    compra: 'Compra',
    ajuste_entrada: 'Ajuste (+)',
    ajuste_salida: 'Ajuste (-)',
    transferencia_entrada: 'Transferencia (+)',
    transferencia_salida: 'Transferencia (-)',
};

const TYPE_COLORS = {
    venta: 'bg-[#e0483e]/10 text-[#e0483e]',
    compra: 'bg-[#0ea472]/10 text-[#0ea472]',
    ajuste_entrada: 'bg-[#0ea472]/10 text-[#0ea472]',
    ajuste_salida: 'bg-[#e0483e]/10 text-[#e0483e]',
    transferencia_entrada: 'bg-[#4f46e5]/10 text-[#4f46e5]',
    transferencia_salida: 'bg-[#4f46e5]/10 text-[#4f46e5]',
};

const isOutbound = (type) => ['venta', 'ajuste_salida', 'transferencia_salida'].includes(type);

export default function KardexIndex({ auth, movements, products, filters }) {
    const [productFilter, setProductFilter] = useState(filters.product_id || '');

    const applyFilter = (value) => {
        setProductFilter(value);
        router.get(route('kardex.index'), value ? { product_id: value } : {}, {
            preserveState: true,
            replace: true,
        });
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Kardex"
            subheader="Historial de movimientos de inventario"
        >
            <Head title="Kardex - NEXO POS" />

            <div className="flex items-center gap-3 mb-5">
                <select
                    value={productFilter}
                    onChange={(e) => applyFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none max-w-[260px]"
                >
                    <option value="">Todos los productos</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
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
                            <th className="px-4 py-3 font-semibold">Usuario</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movements.data.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-16 text-center text-[#a7aecb]">
                                    Sin movimientos registrados
                                </td>
                            </tr>
                        ) : (
                            movements.data.map((m) => (
                                <tr key={m.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 text-[#69708a]">{formatDate(m.created_at)}</td>
                                    <td className="px-4 py-3 font-semibold text-[#101528]">{m.product}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TYPE_COLORS[m.type]}`}>
                                            {TYPE_LABELS[m.type]}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono font-semibold ${isOutbound(m.type) ? 'text-[#e0483e]' : 'text-[#0ea472]'}`}>
                                        {isOutbound(m.type) ? '−' : '+'}{m.quantity}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-[#69708a]">{m.stock_before}</td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#101528]">{m.stock_after}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{m.user}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {movements.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {movements.links.map((link, i) => (
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
        </AuthenticatedLayout>
    );
}