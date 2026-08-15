import { Head, useForm, Link } from '@inertiajs/react';

export default function ChangePassword({ userName }) {
    const { data, setData, post, processing, errors } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.change.store'));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f6fb] font-sans p-4">
            <Head title="Cambiar contraseña - NEXO POS" />

            <div className="w-full max-w-md">
                {/* LOGO */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#8b7cf6] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/30">
                        N
                    </div>
                    <div className="text-2xl font-bold text-[#101528] tracking-wide">
                        NEXO <span className="font-normal opacity-50 text-base">POS</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-5">
                        <svg className="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>

                    <h1 className="text-xl font-bold text-[#101528] mb-1">Cambia tu contraseña</h1>
                    <p className="text-sm text-[#69708a] mb-6">
                        Hola {userName}, por seguridad debes establecer una contraseña propia antes de continuar.
                    </p>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">
                                Contraseña actual
                            </label>
                            <input
                                type="password"
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] outline-none transition-all"
                                autoFocus
                            />
                            {errors.current_password && <p className="text-red-500 text-xs mt-1.5">{errors.current_password}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">
                                Nueva contraseña
                            </label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] outline-none transition-all"
                            />
                            <p className="text-[11px] text-[#a7aecb] mt-1.5">Mínimo 8 caracteres.</p>
                            {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#101528] mb-1.5">
                                Confirmar nueva contraseña
                            </label>
                            <input
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] outline-none transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm tracking-wide shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all disabled:opacity-50 mt-2"
                        >
                            {processing ? 'GUARDANDO...' : 'CAMBIAR CONTRASEÑA'}
                        </button>
                    </form>

                    <div className="mt-5 pt-5 border-t border-[#e6e9f2] text-center">
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="text-xs text-[#69708a] hover:text-[#e0483e] transition-colors"
                        >
                            Cerrar sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}