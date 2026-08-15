import { useState, useEffect, useRef } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import NotificationBell from '@/Components/NotificationBell';
export default function AuthenticatedLayout({ user, header, subheader, children, onSearchSelect }) {
    const { url, props } = usePage();
    const warehouse = props.warehouse;

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [time, setTime] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searching, setSearching] = useState(false);
    const [showWarehouseMenu, setShowWarehouseMenu] = useState(false);

    const searchInputRef = useRef(null);
    const searchBoxRef = useRef(null);
    const debounceRef = useRef(null);
    const warehouseRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // Atajo global F2 para enfocar la búsqueda (ideal para lector de código de barras)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
            if (e.key === 'Escape') {
                setShowSearchDropdown(false);
                searchInputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Búsqueda con debounce
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (searchQuery.length < 1) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/productos/buscar?q=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                setSearchResults(data);
            } catch (e) {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 250);

        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    // Cierra los dropdowns al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
                setShowSearchDropdown(false);
            }
            if (warehouseRef.current && !warehouseRef.current.contains(e.target)) {
                setShowWarehouseMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const goToProduct = (product) => {
        setShowSearchDropdown(false);
        setSearchQuery('');

        if (onSearchSelect) {
            onSearchSelect(product);
            searchInputRef.current?.focus(); // vuelve el foco al input para seguir pistoleando
        } else {
            router.visit(route('inventory.index') + `?search=${encodeURIComponent(product.name)}`);
        }
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchResults.length === 1) {
            goToProduct(searchResults[0]);
        }
    };

    const switchWarehouse = (id) => {
        router.post(route('warehouses.set-active', id), {}, {
            onSuccess: () => setShowWarehouseMenu(false),
        });
    };

    const timeString = time.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const dateString = time.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });

    const isActive = (path) => url.startsWith(path);
    const can = (permission) => user.permissions?.includes(permission) ?? false;
    const canAny = (...permissions) => permissions.some((p) => can(p));

    const NavLink = ({ href, active, icon, children }) => (
        <Link
            href={href}
            title={sidebarCollapsed ? children : undefined}
            className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all relative mt-1 first:mt-0 ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'
                } ${active ? 'bg-[#4f46e5]/20 text-white' : 'text-[#a7aecb] hover:bg-white/5 hover:text-white'
                }`}
        >
            {active && (
                <div
                    className={`absolute left-0 w-1 bg-[#4f46e5] rounded-r-md ${sidebarCollapsed ? 'top-1/2 -translate-y-1/2 h-6' : 'top-2 bottom-2'
                        }`}
                ></div>
            )}
            {icon}
            {!sidebarCollapsed && <span className="whitespace-nowrap overflow-hidden">{children}</span>}
        </Link>
    );

    const SectionTitle = ({ children }) => {
        if (sidebarCollapsed) return <div className="h-px bg-white/5 mx-2 my-3" />;
        return (
            <div className="text-[10.5px] uppercase tracking-[1.2px] text-[#5c6484] font-bold px-3 mb-2">
                {children}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-[#f4f6fb] text-[#101528] font-sans overflow-hidden">
            {/* SIDEBAR */}
            <aside
                className={`hidden md:flex flex-col shrink-0 bg-gradient-to-b from-[#0f1729] to-[#0b1220] text-[#c7cde3] relative transition-[width] duration-300 ease-in-out ${sidebarCollapsed ? 'w-[80px]' : 'w-[236px]'
                    }`}
            >
                {/* Botón colapsar / expandir */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
                    className="absolute -right-3 top-[30px] w-6 h-6 rounded-full bg-[#1a2340] border border-white/10 flex items-center justify-center text-[#a7aecb] hover:text-white hover:bg-[#2a3660] transition-colors shadow-md z-20"
                >
                    <svg
                        className={`w-3.5 h-3.5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>

                {/* LOGO */}
                <div className={`shrink-0 flex items-center gap-3 px-5 py-6 border-b border-white/5 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}>
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#8b7cf6] flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-500/30">
                        N
                    </div>
                    {!sidebarCollapsed && (
                        <div className="text-xl font-bold text-white tracking-wide whitespace-nowrap overflow-hidden">
                            NEXO <span className="font-normal opacity-50 text-sm">POS</span>
                        </div>
                    )}
                </div>

                {/* NAVEGACIÓN */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {canAny('dashboard.ver', 'ventas.registrar', 'caja.abrir', 'caja-chica.gestionar') && (
                        <div className="mb-6">
                            <SectionTitle>Principal</SectionTitle>

                            {can('dashboard.ver') && (
                                <NavLink
                                    href={route('dashboard')}
                                    active={isActive('/dashboard')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>}
                                >
                                    Dashboard
                                </NavLink>
                            )}

                            {can('ventas.registrar') && (
                                <NavLink
                                    href={route('pos')}
                                    active={isActive('/pos')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6" /></svg>}
                                >
                                    Punto de venta
                                </NavLink>
                            )}

                            {can('caja.abrir') && (
                                <NavLink
                                    href={route('cash-sessions.index')}
                                    active={isActive('/caja') && !isActive('/caja-chica')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="14" rx="2" /><path d="M2 10h20" /><circle cx="12" cy="15" r="2" /></svg>}
                                >
                                    Caja
                                </NavLink>
                            )}

                            {can('caja-chica.gestionar') && (
                                <NavLink
                                    href={route('petty-cash.index')}
                                    active={isActive('/caja-chica')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M3 10h18" /><circle cx="7" cy="14.5" r="1" /></svg>}
                                >
                                    Caja chica
                                </NavLink>
                            )}
                        </div>
                    )}
                    {canAny('inventario.ver', 'kardex.ver', 'compras.ver', 'inventario.ajustar', 'ventas.ver', 'cotizaciones.ver', 'clientes.gestionar', 'proveedores.gestionar') && (
                        <div className="mb-6">
                            <SectionTitle>Gestión</SectionTitle>

                            {can('inventario.ver') && (
                                <NavLink
                                    href={route('inventory.index')}
                                    active={isActive('/inventario')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8L12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>}
                                >
                                    Inventario
                                </NavLink>
                            )}

                            {can('kardex.ver') && (
                                <NavLink
                                    href={route('kardex.index')}
                                    active={isActive('/kardex')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>}
                                >
                                    Kardex
                                </NavLink>
                            )}

                            {can('compras.ver') && (
                                <NavLink
                                    href={route('purchases.index')}
                                    active={isActive('/compras')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6" /><path d="M9 3V1" /><path d="M13 3V1" /></svg>}
                                >
                                    Órdenes de compra
                                </NavLink>
                            )}

                            {can('inventario.ajustar') && (
                                <NavLink
                                    href={route('inventory-adjustments.index')}
                                    active={isActive('/ajustes-inventario')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z" /></svg>}
                                >
                                    Ajustes de inventario
                                </NavLink>
                            )}
                            {can('transferencias.ver') && (
                                <NavLink
                                    href={route('transfers.index')}
                                    active={isActive('/transferencias')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M21 3l-9 9" /><path d="M3 3l9 9" /><path d="M12 12v9" /></svg>}
                                >
                                    Transferencias
                                </NavLink>
                            )}

                            {can('ventas.ver') && (
                                <NavLink
                                    href={route('sales.index')}
                                    active={isActive('/ventas')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>}
                                >
                                    Ventas
                                </NavLink>
                            )}

                            {can('cotizaciones.ver') && (
                                <NavLink
                                    href={route('quotations.index')}
                                    active={isActive('/cotizaciones')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h4" /></svg>}
                                >
                                    Cotizaciones
                                </NavLink>
                            )}

                            {can('ventas.ver') && (
                                <NavLink
                                    href={route('credit-notes.index')}
                                    active={isActive('/notas-credito')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2H7a2 2 0 0 0-2 2v16l4-2 3 2 3-2 4 2V4a2 2 0 0 0-2-2Z" /><path d="M9 8h6" /><path d="M9 12h6" /></svg>}
                                >
                                    Notas de crédito
                                </NavLink>
                            )}

                            {can('clientes.gestionar') && (
                                <NavLink
                                    href={route('clients.index')}
                                    active={isActive('/clientes')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                                >
                                    Clientes
                                </NavLink>
                            )}

                            {can('proveedores.gestionar') && (
                                <NavLink
                                    href={route('suppliers.index')}
                                    active={isActive('/proveedores')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></svg>}
                                >
                                    Proveedores
                                </NavLink>
                            )}
                        </div>
                    )}

                    {canAny('inventario.conteo', 'reportes.ver', 'auditoria.ver', 'usuarios.gestionar', 'configuracion.gestionar', 'sucursales.gestionar') && (
                        <div className="mb-6">
                            <SectionTitle>Análisis</SectionTitle>

                            {can('inventario.conteo') && (
                                <NavLink
                                    href={route('inventory-counts.index')}
                                    active={isActive('/toma-inventario')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
                                >
                                    Toma de inventario
                                </NavLink>
                            )}

                            {can('reportes.ver') && (
                                <NavLink
                                    href={route('reports.index')}
                                    active={isActive('/reportes')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="5" /><rect x="12" y="8" width="3" height="9" /><rect x="17" y="5" width="3" height="12" /></svg>}
                                >
                                    Reportes
                                </NavLink>
                            )}

                            {can('auditoria.ver') && (
                                <NavLink
                                    href={route('audit.index')}
                                    active={isActive('/auditoria')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>}
                                >
                                    Auditoría
                                </NavLink>
                            )}

                            {can('usuarios.gestionar') && (
                                <NavLink
                                    href={route('users.index')}
                                    active={isActive('/usuarios')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                                >
                                    Usuarios
                                </NavLink>
                            )}

                            {can('sucursales.gestionar') && (
                                <NavLink
                                    href={route('warehouses.index')}
                                    active={isActive('/sucursales')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></svg>}
                                >
                                    Sucursales
                                </NavLink>
                            )}

                            {can('configuracion.gestionar') && (
                                <NavLink
                                    href={route('settings.index')}
                                    active={isActive('/configuracion')}
                                    icon={<svg className="w-[18px] h-[18px] opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>}
                                >
                                    Configuración
                                </NavLink>
                            )}
                        </div>
                    )}
                </nav>

                {/* PERFIL DE USUARIO */}
                <div className={`shrink-0 border-t border-white/5 p-3 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
                    <div
                        className={`rounded-xl bg-white/5 flex items-center gap-3 ${sidebarCollapsed ? 'p-2 justify-center' : 'p-3'
                            }`}
                        title={sidebarCollapsed ? `${user.name} · ${user.role}` : undefined}
                    >
                        <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#0ea472] to-[#3fd6a3] flex items-center justify-center text-white font-bold text-[13px]">
                            {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        {!sidebarCollapsed && (
                            <>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12.5px] text-white font-semibold truncate">{user.name}</div>
                                    <div className="text-[11px] text-[#7d84a3] truncate">
                                        {user.role}{user.employee_code ? ` · ${user.employee_code}` : ''}
                                    </div>
                                </div>
                                <Link href={route('logout')} method="post" as="button" className="text-[#5c6484] hover:text-[#e0483e] transition-colors">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-[70px] shrink-0 flex items-center px-8 bg-white border-b border-[#e6e9f2] z-10 shadow-sm">
                    <div>
                        <h2 className="text-[19px] font-bold font-sans tracking-tight">{header}</h2>
                        {subheader && <div className="text-[12.5px] text-[#69708a] mt-0.5">{subheader}</div>}
                    </div>

                    {isActive('/pos') && (
                        <div ref={searchBoxRef} className="ml-8 flex-1 max-w-[360px] relative hidden sm:block">
                            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a7aecb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSearchDropdown(true);
                                }}
                                onFocus={() => searchQuery.length > 0 && setShowSearchDropdown(true)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Buscar producto, código o marca (F2)"
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e6e9f2] bg-[#f8f9fc] text-[13.5px] focus:bg-white focus:border-[#4f46e5] focus:ring-0 outline-none transition-all placeholder-[#a7aecb]"
                            />

                            {showSearchDropdown && searchQuery.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e9f2] rounded-xl overflow-hidden z-30 shadow-xl max-h-80 overflow-y-auto">
                                    {searching ? (
                                        <div className="px-4 py-3 text-xs text-[#a7aecb]">Buscando...</div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="px-4 py-3 text-xs text-[#a7aecb]">Sin resultados</div>
                                    ) : (
                                        searchResults.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => goToProduct(p)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f8f9fc] transition-colors border-b border-[#f4f6fb] last:border-0"
                                            >
                                                {p.image_url ? (
                                                    <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-[#f4f6fb] flex items-center justify-center text-base">
                                                        {p.emoji || '📦'}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[13px] font-semibold text-[#101528] truncate">{p.name}</div>
                                                    <div className="text-[11px] text-[#a7aecb] truncate">
                                                        {p.brand ? `${p.brand} · ` : ''}{p.category}{p.barcode ? ` · ${p.barcode}` : ''}
                                                    </div>
                                                </div>
                                                <div className="text-[12px] font-mono font-bold text-[#4f46e5]">S/ {p.price.toFixed(2)}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-4">
                        {/* SELECTOR DE SUCURSAL */}
                        {warehouse && (
                            <div ref={warehouseRef} className="relative">
                                <button
                                    onClick={() => warehouse.switchable.length > 0 && setShowWarehouseMenu(!showWarehouseMenu)}
                                    disabled={warehouse.switchable.length === 0}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${warehouse.switchable.length > 0
                                        ? 'border-[#e6e9f2] hover:border-[#4f46e5] cursor-pointer'
                                        : 'border-transparent bg-[#f8f9fc] cursor-default'
                                        }`}
                                >
                                    <svg className="w-4 h-4 text-[#4f46e5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" />
                                    </svg>
                                    <div className="text-left hidden lg:block">
                                        <div className="text-[10px] text-[#a7aecb] uppercase font-semibold leading-none">Sucursal</div>
                                        <div className="text-[12.5px] font-semibold text-[#101528] leading-tight mt-0.5">
                                            {warehouse.current.name}
                                        </div>
                                    </div>
                                    {warehouse.switchable.length > 0 && (
                                        <svg className={`w-3.5 h-3.5 text-[#a7aecb] transition-transform ${showWarehouseMenu ? 'rotate-180' : ''}`}
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                                    )}
                                </button>

                                {showWarehouseMenu && (
                                    <div className="absolute top-full right-0 mt-1 w-60 bg-white border border-[#e6e9f2] rounded-xl overflow-hidden z-40 shadow-xl">
                                        <div className="px-3 py-2 bg-[#f8f9fc] text-[10px] uppercase font-bold text-[#a7aecb]">
                                            Cambiar de sucursal
                                        </div>
                                        {warehouse.switchable.map((w) => (
                                            <button
                                                key={w.id}
                                                onClick={() => switchWarehouse(w.id)}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#f8f9fc] transition-colors ${w.id === warehouse.current.id ? 'bg-[#4f46e5]/5' : ''
                                                    }`}
                                            >
                                                <div>
                                                    <div className={`text-sm font-semibold ${w.id === warehouse.current.id ? 'text-[#4f46e5]' : 'text-[#101528]'}`}>
                                                        {w.name}
                                                    </div>
                                                    <div className="text-[10px] text-[#a7aecb] font-mono">{w.code}</div>
                                                </div>
                                                {w.id === warehouse.current.id && (
                                                    <svg className="w-4 h-4 text-[#4f46e5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                                )}
                                            </button>
                                        ))}
                                        <div className="px-3 py-2 text-[10px] text-[#a7aecb] border-t border-[#e6e9f2]">
                                            Debes cerrar tu caja antes de cambiar de sucursal.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* NOTIFICACIONES */}
                        <NotificationBell />

                        {/* RELOJ */}
                        <div className="text-right font-mono hidden md:block">
                            <b className="block text-[#101528] text-[13.5px] font-bold">{timeString}</b>
                            <span className="text-[12px] text-[#69708a] capitalize">{dateString}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}