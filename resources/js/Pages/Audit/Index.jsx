import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SEVERITY = {
    critical: { label: 'Crítico', badge: 'bg-[#e0483e]/10 text-[#e0483e]', dot: '#e0483e' },
    warning: { label: 'Advertencia', badge: 'bg-amber-100 text-amber-700', dot: '#f59e0b' },
    info: { label: 'Informativo', badge: 'bg-[#4f46e5]/10 text-[#4f46e5]', dot: '#4f46e5' },
};

const COLORS = ['#4f46e5', '#0ea472', '#a855f7', '#f59e0b', '#e0483e', '#06b6d4'];

export default function AuditIndex({ auth, logs, filters, stats, users, modules, actionCatalog }) {
    const [local, setLocal] = useState({
        user_id: filters.user_id || '',
        module: filters.module || '',
        severity: filters.severity || '',
        action: filters.action || '',
        from: filters.from || '',
        to: filters.to || '',
        search: filters.search || '',
    });
    const [detail, setDetail] = useState(null);
    const [showCharts, setShowCharts] = useState(false);

    const formatDateTime = (d) => new Date(d).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const applyFilters = (next = local) => {
        const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== ''));
        router.get(route('audit.index'), clean, { preserveState: true, replace: true });
    };

    const setFilter = (key, value) => {
        const next = { ...local, [key]: value };
        // Si cambia el módulo, la acción seleccionada puede ya no aplicar
        if (key === 'module') next.action = '';
        setLocal(next);
        applyFilters(next);
    };

    const clearFilters = () => {
        const empty = { user_id: '', module: '', severity: '', action: '', from: '', to: '', search: '' };
        setLocal(empty);
        router.get(route('audit.index'), {}, { preserveState: true, replace: true });
    };

    const exportUrl = () => {
        const clean = Object.fromEntries(Object.entries(local).filter(([, v]) => v !== ''));
        const qs = new URLSearchParams(clean).toString();
        return route('audit.export') + (qs ? `?${qs}` : '');
    };

    const hasFilters = Object.values(local).some((v) => v !== '');
    const filteredActions = local.module ? actionCatalog.filter((a) => a.module === local.module) : actionCatalog;

    const renderMetadata = (metadata) => {
        if (!metadata) return null;

        // Los cambios antes/después tienen tratamiento especial
        if (metadata.cambios) {
            return (
                <div>
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-2">Campos modificados</div>
                    <div className="space-y-1.5">
                        {Object.entries(metadata.cambios).map(([field, val]) => (
                            <div key={field} className="flex items-center gap-2 text-sm">
                                <span className="font-semibold text-[#101528] min-w-[120px]">{field}</span>
                                <span className="font-mono text-[#e0483e] line-through">{String(val.antes ?? '—')}</span>
                                <svg className="w-3 h-3 text-[#a7aecb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                <span className="font-mono text-[#0ea472] font-semibold">{String(val.despues ?? '—')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div>
                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold mb-2">Detalle</div>
                <div className="space-y-1">
                    {Object.entries(metadata).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-sm gap-4">
                            <span className="text-[#69708a] capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-mono text-[#101528] text-right">
                                {Array.isArray(val) ? (val.length ? val.join(', ') : '—') : typeof val === 'boolean' ? (val ? 'Sí' : 'No') : String(val ?? '—')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <AuthenticatedLayout user={auth.user} header="Auditoría" subheader="Registro de actividad del sistema">
            <Head title="Auditoría - NEXO POS" />

            {/* ESTADÍSTICAS */}
            <div className="grid grid-cols-5 gap-4 mb-4">
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Registros</div>
                    <div className="text-2xl font-mono font-bold text-[#101528] mt-1">{stats.total}</div>
                    <div className="text-xs text-[#69708a] mt-1">{stats.today} hoy</div>
                </div>
                <button
                    onClick={() => setFilter('severity', local.severity === 'critical' ? '' : 'critical')}
                    className={`bg-white rounded-2xl border p-5 text-left transition-colors ${local.severity === 'critical' ? 'border-[#e0483e]' : 'border-[#e6e9f2] hover:border-[#e0483e]'}`}
                >
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Críticos</div>
                    <div className="text-2xl font-mono font-bold text-[#e0483e] mt-1">{stats.critical}</div>
                    <div className="text-xs text-[#69708a] mt-1">Requieren revisión</div>
                </button>
                <button
                    onClick={() => setFilter('severity', local.severity === 'warning' ? '' : 'warning')}
                    className={`bg-white rounded-2xl border p-5 text-left transition-colors ${local.severity === 'warning' ? 'border-amber-500' : 'border-[#e6e9f2] hover:border-amber-500'}`}
                >
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Advertencias</div>
                    <div className="text-2xl font-mono font-bold text-amber-600 mt-1">{stats.warning}</div>
                </button>
                <button
                    onClick={() => setFilter('action', local.action === 'sesion.fallida' ? '' : 'sesion.fallida')}
                    className={`bg-white rounded-2xl border p-5 text-left transition-colors ${local.action === 'sesion.fallida' ? 'border-[#e0483e]' : 'border-[#e6e9f2] hover:border-[#e0483e]'}`}
                >
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Accesos fallidos</div>
                    <div className={`text-2xl font-mono font-bold mt-1 ${stats.failed_logins > 0 ? 'text-[#e0483e]' : 'text-[#101528]'}`}>
                        {stats.failed_logins}
                    </div>
                    <div className="text-xs text-[#69708a] mt-1">Intentos de acceso</div>
                </button>
                <button
                    onClick={() => setShowCharts(!showCharts)}
                    className="bg-[#0f1729] rounded-2xl p-5 text-left text-white hover:brightness-110 transition-all"
                >
                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Análisis</div>
                    <div className="text-sm font-bold mt-2">{showCharts ? 'Ocultar' : 'Ver'} gráficos</div>
                    <div className="text-xs text-[#a7aecb] mt-1">Actividad y módulos</div>
                </button>
            </div>

            {/* GRÁFICOS */}
            {showCharts && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="col-span-2 bg-white rounded-2xl border border-[#e6e9f2] p-5">
                        <h3 className="text-sm font-bold text-[#101528] mb-4">Actividad de los últimos 14 días</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={stats.daily}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f4f6fb" vertical={false} />
                                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#a7aecb' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#a7aecb' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Registros" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5">
                        <h3 className="text-sm font-bold text-[#101528] mb-4">Por módulo</h3>
                        {stats.by_module.length === 0 ? (
                            <p className="text-sm text-[#a7aecb] py-12 text-center">Sin datos</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={stats.by_module} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={{ fontSize: 10 }}>
                                        {stats.by_module.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {/* TOP USUARIOS */}
            {showCharts && stats.top_users.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5 mb-4">
                    <h3 className="text-sm font-bold text-[#101528] mb-3">Usuarios con más actividad</h3>
                    <div className="grid grid-cols-5 gap-3">
                        {stats.top_users.map((u, i) => (
                            <div key={i} className="bg-[#f8f9fc] rounded-xl p-3">
                                <div className="text-sm font-semibold text-[#101528] truncate">{u.name}</div>
                                <div className="text-[11px] text-[#a7aecb] font-mono">{u.code || '—'}</div>
                                <div className="text-lg font-mono font-bold text-[#4f46e5] mt-1">{u.total}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FILTROS */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] p-4 mb-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1.5">Buscar</label>
                        <input
                            type="text"
                            value={local.search}
                            onChange={(e) => setLocal({ ...local, search: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            placeholder="Descripción del evento..."
                            className="w-full px-3 py-2 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] focus:bg-white focus:border-[#4f46e5] outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1.5">Usuario</label>
                        <select value={local.user_id} onChange={(e) => setFilter('user_id', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none max-w-[170px]">
                            <option value="">Todos</option>
                            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1.5">Módulo</label>
                        <select value={local.module} onChange={(e) => setFilter('module', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none">
                            <option value="">Todos</option>
                            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1.5">Acción</label>
                        <select value={local.action} onChange={(e) => setFilter('action', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none max-w-[200px]">
                            <option value="">Todas</option>
                            {filteredActions.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1.5">Desde</label>
                        <input type="date" value={local.from} onChange={(e) => setFilter('from', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none" />
                    </div>

                    <div>
                        <label className="block text-[11px] text-[#a7aecb] uppercase font-semibold mb-1.5">Hasta</label>
                        <input type="date" value={local.to} onChange={(e) => setFilter('to', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-[#f8f9fc] text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none" />
                    </div>

                    {hasFilters && (
                        <button onClick={clearFilters}
                            className="px-3 py-2 rounded-lg text-[13px] font-semibold text-[#e0483e] hover:bg-red-50 transition-colors">
                            Limpiar
                        </button>
                    )}

                    <a href={exportUrl()}
                        className="px-4 py-2 rounded-lg bg-[#0ea472] hover:bg-[#0c9463] text-white font-semibold text-[13px] transition-colors flex items-center gap-1.5">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Exportar CSV
                    </a>
                </div>
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold w-2"></th>
                            <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                            <th className="px-4 py-3 font-semibold">Usuario</th>
                            <th className="px-4 py-3 font-semibold">Módulo</th>
                            <th className="px-4 py-3 font-semibold">Evento</th>
                            <th className="px-4 py-3 font-semibold">IP</th>
                            <th className="px-4 py-3 font-semibold text-right">Detalle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.data.length === 0 ? (
                            <tr><td colSpan="7" className="px-6 py-16 text-center text-[#a7aecb]">
                                {hasFilters ? 'Sin resultados para los filtros aplicados' : 'Sin registros de actividad'}
                            </td></tr>
                        ) : (
                            logs.data.map((l) => (
                                <tr key={l.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                    <td className="pl-4 py-3">
                                        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: SEVERITY[l.severity]?.dot || '#a7aecb' }} />
                                    </td>
                                    <td className="px-4 py-3 text-[#69708a] font-mono text-xs whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-[#101528]">{l.user}</div>
                                        {l.employee_code && <div className="text-[10px] text-[#a7aecb] font-mono">{l.employee_code}</div>}
                                        {l.authorizer && (
                                            <div className="text-[10px] text-[#4f46e5] font-semibold">Autorizó: {l.authorizer}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-[#69708a]">{l.module}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SEVERITY[l.severity]?.badge}`}>
                                                {SEVERITY[l.severity]?.label}
                                            </span>
                                            <span className="text-[11px] font-semibold text-[#4f46e5]">{l.action_label}</span>
                                        </div>
                                        <div className="text-[#101528]">{l.description}</div>
                                    </td>
                                    <td className="px-4 py-3 text-[10px] text-[#a7aecb] font-mono">{l.ip_address || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            {l.metadata && (
                                                <button onClick={() => setDetail(l)} title="Ver detalle"
                                                    className="p-2 rounded-lg hover:bg-[#f4f6fb] text-[#4f46e5] transition-colors">
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                                                </button>
                                            )}
                                            {l.subject_url && (
                                                <a href={l.subject_url} title="Ir al documento"
                                                    className="p-2 rounded-lg hover:bg-[#f4f6fb] text-[#69708a] transition-colors inline-block">
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {logs.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {logs.links.map((link, i) => (
                        <button key={i} disabled={!link.url} onClick={() => link.url && router.visit(link.url)}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                link.active ? 'bg-[#4f46e5] text-white' : link.url ? 'bg-white border border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]' : 'text-[#c7cde3] cursor-not-allowed'
                            }`}
                        />
                    ))}
                </div>
            )}

            {/* MODAL DETALLE */}
            {detail && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#101528]">{detail.action_label}</h3>
                                <p className="text-xs text-[#69708a]">{detail.module} · {formatDateTime(detail.created_at)}</p>
                            </div>
                            <button onClick={() => setDetail(null)} className="text-[#a7aecb] hover:text-[#101528]">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="bg-[#f8f9fc] rounded-xl p-4 mb-4">
                            <p className="text-sm text-[#101528]">{detail.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Usuario</div>
                                <div className="text-[#101528] font-semibold">{detail.user}</div>
                            </div>
                            {detail.authorizer && (
                                <div>
                                    <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Autorizado por</div>
                                    <div className="text-[#4f46e5] font-semibold">{detail.authorizer}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Dirección IP</div>
                                <div className="text-[#101528] font-mono text-xs">{detail.ip_address || '—'}</div>
                            </div>
                            <div>
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Severidad</div>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SEVERITY[detail.severity]?.badge}`}>
                                    {SEVERITY[detail.severity]?.label}
                                </span>
                            </div>
                        </div>

                        {detail.metadata && (
                            <div className="border-t border-[#e6e9f2] pt-4">
                                {renderMetadata(detail.metadata)}
                            </div>
                        )}

                        {detail.subject_url && (
                            <a href={detail.subject_url}
                                className="block w-full mt-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm text-center transition-colors">
                                Ir al documento afectado
                            </a>
                        )}
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}