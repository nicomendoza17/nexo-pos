import { useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function Login({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f6fb] font-sans p-4">
            <Head title="Iniciar Sesión - NEXO POS" />

            <div className="flex w-full max-w-4xl bg-white rounded-[24px] shadow-2xl overflow-hidden min-h-[480px]">
                
                {/* Lado Izquierdo - Branding Minimalista */}
                <div className="hidden md:flex flex-col justify-center items-center w-1/2 p-12 bg-gradient-to-b from-[#0f1729] to-[#0b1220] relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#4f46e5] opacity-20 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-[#8b7cf6] opacity-10 blur-3xl"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#8b7cf6] flex items-center justify-center text-white font-extrabold text-3xl shadow-lg shadow-indigo-500/30 mb-6">
                            N
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-widest">
                            NEXO <span className="font-normal opacity-50">POS</span>
                        </h1>
                    </div>
                </div>

                {/* Lado Derecho - Formulario Limpio */}
                <div className="w-full md:w-1/2 p-10 sm:p-16 flex flex-col justify-center bg-white">
                    <div className="mb-10 text-center">
                        <h2 className="text-2xl font-bold text-[#101528]">Bienvenido</h2>
                    </div>

                    {status && <div className="mb-4 font-medium text-sm text-green-600 text-center">{status}</div>}

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <div className="relative">
                                <input
                                    id="username"
                                    type="text"
                                    name="username"
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value)}
                                    className="w-full pl-5 pr-12 py-4 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-[#101528] text-sm focus:bg-white focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] outline-none transition-all"
                                    placeholder="Usuario"
                                    autoComplete="username"
                                    autoFocus
                                />
                                <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a7aecb]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                            {errors.username && <p className="text-red-500 text-xs mt-2 font-medium pl-1">{errors.username}</p>}
                        </div>

                        <div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="w-full pl-5 pr-12 py-4 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-[#101528] text-sm focus:bg-white focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] outline-none transition-all"
                                    placeholder="Contraseña"
                                    autoComplete="current-password"
                                />
                                <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a7aecb]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-2 font-medium pl-1">{errors.password}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-4 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm tracking-widest shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all disabled:opacity-50 mt-4"
                        >
                            INGRESAR
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}