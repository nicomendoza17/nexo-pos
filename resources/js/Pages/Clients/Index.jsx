import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function ClientsIndex({ auth, clients }) {
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [looking, setLooking] = useState(false);
    const [lookupError, setLookupError] = useState('');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        document_number: '',
        document_type: '',
        name: '',
        address: '',
        phone: '',
        email: '',
    });

    const openCreateModal = () => {
        setEditingClient(null);
        setLookupError('');
        reset();
        setShowModal(true);
    };

    const openEditModal = (client) => {
        setEditingClient(client);
        setLookupError('');
        setData({
            document_number: client.document_number || '',
            document_type: client.document_type || '',
            name: client.name || '',
            address: client.address || '',
            phone: client.phone || '',
            email: client.email || '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingClient(null);
        setLookupError('');
        reset();
    };

    const submit = (e) => {
        e.preventDefault();
        if (editingClient) {
            put(route('clients.update', editingClient.id), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('clients.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (client) => {
        if (!confirm(`¿Eliminar a ${client.name}?`)) return;
        router.delete(route('clients.destroy', client.id));
    };

    const lookupDocument = async () => {
        const doc = data.document_number.replace(/\D/g, '');
        if (doc.length !== 8 && doc.length !== 11) {
            setLookupError('Ingresa un DNI (8 dígitos) o RUC (11 dígitos) válido');
            return;
        }

        setLooking(true);
        setLookupError('');
        try {
            const res = await fetch(`/clientes/consultar/${doc}`);
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

    const isRuc = data.document_type === 'ruc';

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Clientes"
            subheader={`${clients.total} clientes registrados`}
        >
            <Head title="Clientes - NEXO POS" />

            <div className="flex justify-end mb-5">
                <button
                    onClick={openCreateModal}
                    className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Nuevo cliente
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-6 py-3 font-semibold">Nombre / Razón social</th>
                            <th className="px-6 py-3 font-semibold">Documento</th>
                            <th className="px-6 py-3 font-semibold">Teléfono</th>
                            <th className="px-6 py-3 font-semibold">Email</th>
                            <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.data.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-16 text-center text-[#a7aecb]">
                                    Aún no hay clientes registrados
                                </td>
                            </tr>
                        ) : (
                            clients.data.map((client) => (
                                <tr key={client.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="px-6 py-4 font-semibold text-[#101528]">{client.name}</td>
                                    <td className="px-6 py-4 text-[#69708a]">
                                        {client.document_number ? (
                                            <>
                                                <span className="uppercase text-[10px] font-bold text-[#a7aecb] mr-1">
                                                    {client.document_type}
                                                </span>
                                                {client.document_number}
                                            </>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-[#69708a]">{client.phone || '—'}</td>
                                    <td className="px-6 py-4 text-[#69708a]">{client.email || '—'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(client)}
                                                className="p-2 rounded-lg hover:bg-[#f4f6fb] text-[#4f46e5] transition-colors"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client)}
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

            {clients.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {clients.links.map((link, i) => (
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

            {/* MODAL DE CREAR/EDITAR */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">
                            {editingClient ? 'Editar cliente' : 'Nuevo cliente'}
                        </h3>

                        <form onSubmit={submit} className="space-y-4">
                            {/* DOCUMENTO PRIMERO, CON BÚSQUEDA */}
                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">
                                    DNI / RUC
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={data.document_number}
                                        onChange={(e) => {
                                            setData('document_number', e.target.value);
                                            setLookupError('');
                                        }}
                                        placeholder="Ej. 12345678"
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
                                {data.document_type && (
                                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#4f46e5]/10 text-[#4f46e5]">
                                        {data.document_type}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">
                                    {isRuc ? 'Razón social *' : 'Nombre completo *'}
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none transition-all"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            {/* SOLO PARA RUC: DIRECCIÓN */}
                            {isRuc && (
                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Dirección fiscal</label>
                                    <input
                                        type="text"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none transition-all"
                                    />
                                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                </div>
                            )}

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
        </AuthenticatedLayout>
    );
}