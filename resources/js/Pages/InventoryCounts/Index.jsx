import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function InventoryCountsIndex({ auth, counts, categories }) {
    const [showModal, setShowModal] = useState(false);
    const { data, setData, post, processing } = useForm({ category_id: '' });

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('inventory-counts.create'));
    };

    const printUrl = () => {
        const params = data.category_id ? `?category_id=${data.category_id}` : '';
        return route('inventory-counts.print') + params;
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Toma de inventario"
            subheader="Conteo físico y ajuste de diferencias de stock"
        >
            <Head title="Toma de inventario - NEXO POS" />

            <div className="flex justify-end mb-5">
                <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    Nuevo conteo
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Conteo</th>
                            <th className="px-4 py-3 font-semibold">Categoría</th>
                            <th className="px-4 py-3 font-semibold">Usuario</th>
                            <th className="px-4 py-3 font-semibold">Progreso</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold">Fecha</th>
                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {counts.data.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-16 text-center text-[#a7aecb]">
                                    Aún no hay conteos registrados
                                </td>
                            </tr>
                        ) : (
                            counts.data.map((c) => (
                                <tr key={c.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-4 py-3 font-semibold text-[#101528]">#{c.id}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{c.category}</td>
                                    <td className="px-4 py-3 text-[#69708a]">{c.user}</td>
                                    <td className="px-4 py-3 text-[#69708a] font-mono">{c.counted_count} / {c.items_count}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.status === 'abierto' ? 'bg-amber-100 text-amber-700' : 'bg-[#0ea472]/10 text-[#0ea472]'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#69708a]">{formatDate(c.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => router.visit(route('inventory-counts.show', c.id))}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4f46e5]/10 text-[#4f46e5] hover:bg-[#4f46e5]/20 transition-colors"
                                        >
                                            {c.status === 'abierto' ? 'Continuar' : 'Ver'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {counts.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {counts.links.map((link, i) => (
                        <button
                            key={i}
                            disabled={!link.url}
                            onClick={() => link.url && router.visit(link.url)}
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

            {/* MODAL NUEVO CONTEO */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">Nuevo conteo de inventario</h3>

                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Categoría a contar</label>
                        <select
                            value={data.category_id}
                            onChange={(e) => setData('category_id', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none mb-2"
                        >
                            <option value="">Todas las categorías</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        {/* ENLACE CORREGIDO AQUÍ */}
                        <a
                            href={printUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4f46e5] hover:underline mb-5"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            Imprimir hoja de conteo antes de empezar
                        </a>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={submit}
                                disabled={processing}
                                className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Creando...' : 'Iniciar conteo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}