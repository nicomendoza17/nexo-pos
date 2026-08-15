import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function SuppliersIndex({ auth, suppliers }) {
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [looking, setLooking] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [confirmDialog, setConfirmDialog] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        document_number: '',
        document_type: '',
        name: '',
        address: '',
        phone: '',
        email: '',
        contact_name: '',
        is_active: true,
    });

    const openCreateModal = () => {
        setEditingSupplier(null);
        setLookupError('');
        reset();
        setShowModal(true);
    };

    const openEditModal = (supplier) => {
        setEditingSupplier(supplier);
        setLookupError('');
        setData({
            document_number: supplier.document_number || '',
            document_type: supplier.document_type || '',
            name: supplier.name || '',
            address: supplier.address || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            contact_name: supplier.contact_name || '',
            is_active: supplier.is_active,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSupplier(null);
        setLookupError('');
        reset();
    };

    const submit = (e) => {
        e.preventDefault();
        if (editingSupplier) {
            put(route('suppliers.update', editingSupplier.id), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('suppliers.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (supplier) => {
        setConfirmDialog({
            message: `¿Eliminar al proveedor "${supplier.name}"?`,
            onConfirm: () => {
                router.delete(route('suppliers.destroy', supplier.id));
                setConfirmDialog(null);
            },
        });
    };

    const lookupDocument = async () => {
        const doc = data.document_number.replace(/\D/g, '');
        if (doc.length !== 11) {
            setLookupError('Ingresa un RUC válido de 11 dígitos');
            return;
        }

        setLooking(true);
        setLookupError('');
        try {
            const res = await fetch(`/proveedores/consultar/${doc}`);
            const result = await res.json();

            if (!res.ok) {
                setLookupError(result.error || 'No se encontró el documento');
                return;
            }

            setData(prev => ({
                ...prev,
                document_type: result.document_type,
                name: result.name || prev.name,
                address: result.address || '',
            }));
        } catch (e) {
            setLookupError('Error al consultar el documento');
        } finally {
            setLooking(false);
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Proveedores"
            subheader={`${suppliers.total} proveedores registrados`}
        >
            <Head title="Proveedores - NEXO POS" />

            <div className="flex justify-end mb-5">
                <button
                    onClick={openCreateModal}
                    className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Nuevo proveedor
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-6 py-3 font-semibold">Nombre / Razón social</th>
                            <th className="px-6 py-3 font-semibold">RUC</th>
                            <th className="px-6 py-3 font-semibold">Contacto</th>
                            <th className="px-6 py-3 font-semibold">Teléfono</th>
                            <th className="px-6 py-3 font-semibold">Estado</th>
                            <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suppliers.data.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-16 text-center text-[#a7aecb]">
                                    Aún no hay proveedores registrados
                                </td>
                            </tr>
                        ) : (
                            suppliers.data.map((s) => (
                                <tr key={s.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-6 py-4 font-semibold text-[#101528]">{s.name}</td>
                                    <td className="px-6 py-4 text-[#69708a] font-mono">{s.document_number || '—'}</td>
                                    <td className="px-6 py-4 text-[#69708a]">{s.contact_name || '—'}</td>
                                    <td className="px-6 py-4 text-[#69708a]">{s.phone || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                            s.is_active ? 'bg-[#0ea472]/10 text-[#0ea472]' : 'bg-[#a7aecb]/10 text-[#69708a]'
                                        }`}>
                                            {s.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(s)}
                                                className="p-2 rounded-lg hover:bg-[#f4f6fb] text-[#4f46e5] transition-colors"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s)}
                                                className="p-2 rounded-lg hover:bg-red-50 text-[#e0483e] transition-colors"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {suppliers.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {suppliers.links.map((link, i) => (
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

            {/* MODAL CREAR/EDITAR */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">
                            {editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
                        </h3>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">RUC</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={data.document_number}
                                        onChange={(e) => {
                                            setData('document_number', e.target.value);
                                            setLookupError('');
                                        }}
                                        placeholder="Ej. 20100017491"
                                        maxLength={11}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none transition-all"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={lookupDocument}
                                        disabled={looking}
                                        className="px-4 py-2.5 rounded-xl bg-[#4f46e5]/10 text-[#4f46e5] font-semibold text-sm hover:bg-[#4f46e5]/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {looking ? 'Buscando...' : 'Buscar'}
                                    </button>
                                </div>
                                {lookupError && <p className="text-red-500 text-xs mt-1">{lookupError}</p>}
                                {errors.document_number && <p className="text-red-500 text-xs mt-1">{errors.document_number}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Razón social *</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none transition-all"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Dirección</label>
                                <input
                                    type="text"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Persona de contacto</label>
                                <input
                                    type="text"
                                    value={data.contact_name}
                                    onChange={(e) => setData('contact_name', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Teléfono</label>
                                    <input
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none transition-all"
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                </div>
                            </div>

                            {editingSupplier && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="w-4 h-4 rounded accent-[#4f46e5]"
                                    />
                                    <span className="text-sm text-[#101528] font-medium">Proveedor activo</span>
                                </label>
                            )}

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
                                    {processing ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMACIÓN */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-11 h-11 rounded-full bg-[#e0483e]/10 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-[#e0483e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <p className="text-sm text-[#101528] mb-6">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDialog.onConfirm}
                                className="flex-1 py-2.5 rounded-xl bg-[#e0483e] hover:bg-[#c93d34] text-white font-semibold text-sm transition-colors"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}