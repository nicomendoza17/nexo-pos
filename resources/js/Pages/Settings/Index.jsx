import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

const GROUP_ICONS = {
    empresa: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    fiscal: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    operacion: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 10v6M4.2 4.2l4.3 4.3m7 7 4.3 4.3M1 12h6m10 0h6M4.2 19.8l4.3-4.3m7-7 4.3-4.3" /></svg>,
    apariencia: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
    impresion: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>,
};

export default function SettingsIndex({ auth, settings, definitions, groups }) {
    const [activeGroup, setActiveGroup] = useState('empresa');
    const [previews, setPreviews] = useState({});

    // Prepara el estado inicial con todos los valores actuales
    const initial = {};
    Object.keys(definitions).forEach((key) => {
        const [type] = definitions[key];
        initial[key] = type === 'image' ? null : settings[key];
    });

    const { data, setData, post, processing, errors, isDirty } = useForm(initial);

    const groupKeys = Object.keys(groups);
    const fieldsOfGroup = (group) =>
        Object.entries(definitions).filter(([, def]) => def[1] === group);

    const handleImage = (key, file) => {
        if (!file) return;
        setData(key, file);
        setPreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }));
    };

    const removeImage = (key) => {
        router.delete(route('settings.remove-image', key), {
            onSuccess: () => setPreviews((p) => ({ ...p, [key]: null })),
        });
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('settings.update'), { forceFormData: true, preserveScroll: true });
    };

    const renderField = (key, [type, , label, , help]) => {
        if (type === 'boolean') {
            return (
                <div key={key} className="flex items-start justify-between gap-4 py-3 border-b border-[#f4f6fb] last:border-0">
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-[#101528]">{label}</div>
                        {help && <div className="text-xs text-[#a7aecb] mt-0.5">{help}</div>}
                    </div>
                    <button
                        type="button"
                        onClick={() => setData(key, !data[key])}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${data[key] ? 'bg-[#0ea472]' : 'bg-[#e6e9f2]'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${data[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            );
        }

        if (type === 'image') {
            const current = previews[key] || settings[key];
            return (
                <div key={key} className="py-3 border-b border-[#f4f6fb] last:border-0">
                    <div className="text-sm font-semibold text-[#101528] mb-1">{label}</div>
                    {help && <div className="text-xs text-[#a7aecb] mb-3">{help}</div>}
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] overflow-hidden shrink-0 flex items-center justify-center">
                            {current ? (
                                <img src={current} alt={label} className="w-full h-full object-contain" />
                            ) : (
                                <svg className="w-8 h-8 text-[#c7cde3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImage(key, e.target.files[0])}
                                className="text-xs text-[#69708a] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#4f46e5]/10 file:text-[#4f46e5] file:text-xs file:font-semibold hover:file:bg-[#4f46e5]/20"
                            />
                            {settings[key] && (
                                <button
                                    type="button"
                                    onClick={() => removeImage(key)}
                                    className="block mt-2 text-xs font-semibold text-[#e0483e] hover:underline"
                                >
                                    Quitar imagen actual
                                </button>
                            )}
                            {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
                        </div>
                    </div>
                </div>
            );
        }

        const isLong = key === 'quotation_footer' || key === 'company_address';

        return (
            <div key={key} className="py-3 border-b border-[#f4f6fb] last:border-0">
                <label className="block text-sm font-semibold text-[#101528] mb-1">{label}</label>
                {help && <div className="text-xs text-[#a7aecb] mb-2">{help}</div>}
                {isLong ? (
                    <textarea
                        value={data[key] ?? ''}
                        onChange={(e) => setData(key, e.target.value)}
                        rows={key === 'quotation_footer' ? 3 : 2}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none resize-none"
                    />
                ) : (
                    <input
                        type={type === 'number' ? 'number' : 'text'}
                        step={type === 'number' ? '0.01' : undefined}
                        min={type === 'number' ? '0' : undefined}
                        value={data[key] ?? ''}
                        onChange={(e) => setData(key, e.target.value)}
                        className="w-full max-w-md px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                    />
                )}
                {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
            </div>
        );
    };

    return (
        <AuthenticatedLayout user={auth.user} header="Configuración" subheader="Parámetros generales del sistema">
            <Head title="Configuración - NEXO POS" />

            <form onSubmit={submit}>
                <div className="flex gap-5">
                    {/* NAVEGACIÓN POR GRUPOS */}
                    <div className="w-56 shrink-0">
                        <div className="bg-white rounded-2xl border border-[#e6e9f2] p-2 sticky top-0">
                            {groupKeys.map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setActiveGroup(g)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors mb-1 last:mb-0 ${activeGroup === g ? 'bg-[#4f46e5]/10 text-[#4f46e5]' : 'text-[#69708a] hover:bg-[#f8f9fc]'
                                        }`}
                                >
                                    {GROUP_ICONS[g]}
                                    {groups[g]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CAMPOS DEL GRUPO ACTIVO */}
                    <div className="flex-1">
                        <div className="bg-white rounded-2xl border border-[#e6e9f2] p-6">
                            <h3 className="text-base font-bold text-[#101528] mb-1">{groups[activeGroup]}</h3>
                            <p className="text-xs text-[#a7aecb] mb-4">
                                {activeGroup === 'empresa' && 'Estos datos aparecen en cotizaciones y documentos que entregas al cliente.'}
                                {activeGroup === 'fiscal' && 'Afectan el cálculo de impuestos en ventas, compras y cotizaciones.'}
                                {activeGroup === 'operacion' && 'Definen el comportamiento del sistema en el día a día.'}
                                {activeGroup === 'apariencia' && 'Imágenes y textos que se muestran en el sistema y los documentos.'}
                            </p>

                            <div>
                                {fieldsOfGroup(activeGroup).map(([key, def]) => renderField(key, def))}
                            </div>
                        </div>

                        {/* BARRA DE GUARDADO */}
                        <div className="flex items-center justify-between bg-white rounded-2xl border border-[#e6e9f2] px-6 py-4 mt-4 sticky bottom-4 shadow-lg">
                            <p className="text-xs text-[#69708a]">
                                {isDirty ? 'Tienes cambios sin guardar' : 'Todos los cambios están guardados'}
                            </p>
                            <button
                                type="submit"
                                disabled={processing || !isDirty}
                                className="px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all disabled:opacity-40"
                            >
                                {processing ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}