import { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function UsersIndex({ auth, users, roles, warehouses, permissionGroups, rolePermissions, nextEmployeeCode }) {
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showPermissions, setShowPermissions] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(null);
    const [showPinModal, setShowPinModal] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [search, setSearch] = useState('');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '', employee_code: nextEmployeeCode, username: '', email: '',
        document_type: '', document_number: '', phone: '',
        warehouse_id: '', commission_rate: '0',
        password: '', password_confirmation: '', authorization_pin: '',
        role: '', extra_permissions: [], must_change_password: false,
    });

    const passwordForm = useForm({ password: '', password_confirmation: '', must_change_password: true });
    const pinForm = useForm({ authorization_pin: '' });

    // Permisos que vienen del rol seleccionado (no editables individualmente)
    const inheritedPermissions = useMemo(
        () => (data.role ? rolePermissions[data.role] || [] : []),
        [data.role, rolePermissions]
    );

    const filteredUsers = users.data.filter((u) =>
        search === '' ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())
    );

    const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nunca';

    const openCreate = () => {
        setEditingUser(null);
        setShowPermissions(false);
        reset();
        setData('employee_code', nextEmployeeCode);
        setShowModal(true);
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setShowPermissions(false);
        // Cargamos el usuario completo desde la fila; los permisos extra vienen del backend
        setData({
            name: user.name,
            employee_code: user.employee_code || '',
            username: user.username,
            email: user.email,
            document_type: user.document_type || '',
            document_number: user.document_number || '',
            phone: user.phone || '',
            warehouse_id: user.warehouse_id || '',
            commission_rate: String(user.commission_rate ?? 0),
            role: user.role || '',
            extra_permissions: user.extra_permissions || [],
            password: '', password_confirmation: '', authorization_pin: '',
            must_change_password: false,
        });
        setShowModal(true);
    };

    const togglePermission = (permission) => {
        // No se pueden desmarcar los heredados del rol
        if (inheritedPermissions.includes(permission)) return;

        setData('extra_permissions',
            data.extra_permissions.includes(permission)
                ? data.extra_permissions.filter((p) => p !== permission)
                : [...data.extra_permissions, permission]
        );
    };

    const submit = (e) => {
        e.preventDefault();
        if (editingUser) {
            put(route('users.update', editingUser.id), { onSuccess: () => setShowModal(false) });
        } else {
            post(route('users.store'), { onSuccess: () => setShowModal(false) });
        }
    };

    const toggleStatus = (user) => {
        setConfirmDialog({
            message: user.is_active
                ? `¿Desactivar a ${user.name}? No podrá iniciar sesión, pero su historial se conserva.`
                : `¿Reactivar a ${user.name}?`,
            onConfirm: () => {
                router.post(route('users.toggle-status', user.id));
                setConfirmDialog(null);
            },
        });
    };

    const submitPassword = (e) => {
        e.preventDefault();
        passwordForm.post(route('users.reset-password', showPasswordModal.id), {
            onSuccess: () => { setShowPasswordModal(null); passwordForm.reset(); },
        });
    };

    const submitPin = (e) => {
        e.preventDefault();
        pinForm.post(route('users.update-pin', showPinModal.id), {
            onSuccess: () => { setShowPinModal(null); pinForm.reset(); },
        });
    };

    const extraCount = data.extra_permissions.filter((p) => !inheritedPermissions.includes(p)).length;

    return (
        <AuthenticatedLayout user={auth.user} header="Usuarios" subheader={`${users.total} usuarios registrados`}>
            <Head title="Usuarios - NEXO POS" />

            <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1 max-w-[280px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a7aecb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, código o usuario..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[13px] focus:border-[#4f46e5] outline-none"
                    />
                </div>

                <button
                    onClick={openCreate}
                    className="ml-auto px-5 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    Nuevo usuario
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold">Código</th>
                            <th className="px-4 py-3 font-semibold">Usuario</th>
                            <th className="px-4 py-3 font-semibold">Rol</th>
                            <th className="px-4 py-3 font-semibold">Sucursal</th>
                            <th className="px-4 py-3 font-semibold text-right">Comisión</th>
                            <th className="px-4 py-3 font-semibold">Último acceso</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan="8" className="px-6 py-16 text-center text-[#a7aecb]">Sin usuarios</td></tr>
                        ) : (
                            filteredUsers.map((u) => (
                                <tr key={u.id} className={`border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors ${!u.is_active ? 'opacity-60' : ''}`}>
                                    <td className="px-4 py-3 font-mono font-semibold text-[#4f46e5]">{u.employee_code || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-[#101528]">{u.name}</div>
                                        <div className="text-[11px] text-[#a7aecb]">@{u.username} · {u.email}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#4f46e5]/10 text-[#4f46e5]">
                                            {u.role || 'Sin rol'}
                                        </span>
                                        {u.extra_permissions_count > 0 && (
                                            <span className="ml-1.5 text-[10px] font-bold text-[#0ea472]">+{u.extra_permissions_count}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-[#69708a]">{u.warehouse || 'Todas'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-[#69708a]">
                                        {u.commission_rate > 0 ? `${u.commission_rate}%` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-[#69708a] text-xs">{formatDateTime(u.last_login_at)}</div>
                                        {u.last_login_ip && <div className="text-[10px] text-[#a7aecb] font-mono">{u.last_login_ip}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.is_active ? 'bg-[#0ea472]/10 text-[#0ea472]' : 'bg-[#e0483e]/10 text-[#e0483e]'}`}>
                                                {u.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                            {u.has_pin && (
                                                <span title="Tiene PIN de autorización" className="text-[#4f46e5]">
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => openEdit(u)} title="Editar"
                                                className="p-2 rounded-lg hover:bg-[#f4f6fb] text-[#4f46e5] transition-colors">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            <button onClick={() => setShowPasswordModal(u)} title="Restablecer contraseña"
                                                className="p-2 rounded-lg hover:bg-[#f4f6fb] text-[#69708a] transition-colors">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                            </button>
                                            <button onClick={() => setShowPinModal(u)} title="PIN de autorización"
                                                className="p-2 rounded-lg hover:bg-[#f4f6fb] text-[#69708a] transition-colors">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 9h.01M12 9h.01M17 9h.01M7 14h10" /></svg>
                                            </button>
                                            <button onClick={() => toggleStatus(u)} title={u.is_active ? 'Desactivar' : 'Activar'}
                                                className={`p-2 rounded-lg transition-colors ${u.is_active ? 'hover:bg-red-50 text-[#e0483e]' : 'hover:bg-[#0ea472]/10 text-[#0ea472]'}`}>
                                                {u.is_active ? (
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {users.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {users.links.map((link, i) => (
                        <button key={i} disabled={!link.url} onClick={() => link.url && router.visit(link.url)}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                link.active ? 'bg-[#4f46e5] text-white' : link.url ? 'bg-white border border-[#e6e9f2] text-[#69708a] hover:border-[#4f46e5]' : 'text-[#c7cde3] cursor-not-allowed'
                            }`}
                        />
                    ))}
                </div>
            )}

            {/* MODAL CREAR / EDITAR */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">
                            {editingUser ? `Editar usuario — ${editingUser.name}` : 'Nuevo usuario'}
                        </h3>

                        <form onSubmit={submit} className="space-y-5">
                            {/* IDENTIDAD */}
                            <div>
                                <h4 className="text-xs font-bold text-[#a7aecb] uppercase mb-3">Identidad</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Nombre completo *</label>
                                        <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Código *</label>
                                        <input type="text" value={data.employee_code} onChange={(e) => setData('employee_code', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm font-mono focus:bg-white focus:border-[#4f46e5] outline-none" />
                                        {errors.employee_code && <p className="text-red-500 text-xs mt-1">{errors.employee_code}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Tipo doc.</label>
                                        <select value={data.document_type} onChange={(e) => setData('document_type', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none">
                                            <option value="">—</option>
                                            <option value="dni">DNI</option>
                                            <option value="ce">Carnet ext.</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">N° documento</label>
                                        <input type="text" value={data.document_number} onChange={(e) => setData('document_number', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                        {errors.document_number && <p className="text-red-500 text-xs mt-1">{errors.document_number}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Teléfono</label>
                                        <input type="text" value={data.phone} onChange={(e) => setData('phone', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* ACCESO */}
                            <div>
                                <h4 className="text-xs font-bold text-[#a7aecb] uppercase mb-3">Acceso</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Usuario *</label>
                                        <input type="text" value={data.username} onChange={(e) => setData('username', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Correo *</label>
                                        <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                    </div>

                                    {!editingUser && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Contraseña *</label>
                                                <input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Confirmar contraseña *</label>
                                                <input type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">PIN de autorización</label>
                                                <input type="password" maxLength={6} value={data.authorization_pin} onChange={(e) => setData('authorization_pin', e.target.value)}
                                                    placeholder="4 a 6 dígitos"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm font-mono focus:bg-white focus:border-[#4f46e5] outline-none" />
                                                <p className="text-[11px] text-[#a7aecb] mt-1">Para autorizar acciones de otros usuarios sin cerrar su sesión.</p>
                                            </div>
                                            <div className="flex items-end pb-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={data.must_change_password}
                                                        onChange={(e) => setData('must_change_password', e.target.checked)}
                                                        className="w-4 h-4 rounded accent-[#4f46e5]" />
                                                    <span className="text-xs text-[#69708a]">Debe cambiar contraseña al primer ingreso</span>
                                                </label>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* OPERACIÓN */}
                            <div>
                                <h4 className="text-xs font-bold text-[#a7aecb] uppercase mb-3">Operación</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Rol *</label>
                                        <select value={data.role} onChange={(e) => setData('role', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none">
                                            <option value="">Seleccionar...</option>
                                            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Sucursal</label>
                                        <select value={data.warehouse_id} onChange={(e) => setData('warehouse_id', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none">
                                            <option value="">Todas</option>
                                            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#101528] mb-1.5">Comisión (%)</label>
                                        <input type="number" step="0.01" min="0" max="100" value={data.commission_rate}
                                            onChange={(e) => setData('commission_rate', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* PERMISOS */}
                            {data.role && (
                                <div className="border border-[#e6e9f2] rounded-xl overflow-hidden">
                                    <button type="button" onClick={() => setShowPermissions(!showPermissions)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-[#f8f9fc] hover:bg-[#e6e9f2] transition-colors">
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-[#101528]">Permisos</div>
                                            <div className="text-[11px] text-[#69708a]">
                                                Rol {data.role} ({inheritedPermissions.length} permisos)
                                                {extraCount > 0 && <span className="text-[#0ea472] font-semibold"> + {extraCount} adicional(es)</span>}
                                            </div>
                                        </div>
                                        <svg className={`w-4 h-4 text-[#69708a] transition-transform ${showPermissions ? 'rotate-180' : ''}`}
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                                    </button>

                                    {showPermissions && (
                                        <div className="p-4 max-h-72 overflow-y-auto space-y-4">
                                            <p className="text-[11px] text-[#a7aecb]">
                                                Los permisos en morado vienen del rol y no se pueden quitar aquí. Marca los verdes para dar acceso adicional solo a este usuario.
                                            </p>
                                            {Object.entries(permissionGroups).map(([group, permissions]) => (
                                                <div key={group}>
                                                    <div className="text-xs font-bold text-[#101528] mb-2">{group}</div>
                                                    <div className="space-y-1">
                                                        {Object.entries(permissions).map(([perm, label]) => {
                                                            const inherited = inheritedPermissions.includes(perm);
                                                            const checked = inherited || data.extra_permissions.includes(perm);
                                                            return (
                                                                <label key={perm}
                                                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${inherited ? 'bg-[#4f46e5]/5 cursor-default' : 'hover:bg-[#f8f9fc] cursor-pointer'}`}>
                                                                    <input type="checkbox" checked={checked} disabled={inherited}
                                                                        onChange={() => togglePermission(perm)}
                                                                        className={`w-4 h-4 rounded ${inherited ? 'accent-[#4f46e5]' : 'accent-[#0ea472]'}`} />
                                                                    <span className={`text-xs ${inherited ? 'text-[#4f46e5]' : 'text-[#69708a]'}`}>{label}</span>
                                                                    {inherited && <span className="text-[9px] text-[#a7aecb] uppercase font-bold ml-auto">del rol</span>}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={processing}
                                    className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm disabled:opacity-50">
                                    {processing ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CONTRASEÑA */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-1">Restablecer contraseña</h3>
                        <p className="text-xs text-[#69708a] mb-4">{showPasswordModal.name} · @{showPasswordModal.username}</p>

                        <form onSubmit={submitPassword} className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Nueva contraseña</label>
                                <input type="password" value={passwordForm.data.password}
                                    onChange={(e) => passwordForm.setData('password', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" autoFocus />
                                {passwordForm.errors.password && <p className="text-red-500 text-xs mt-1">{passwordForm.errors.password}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Confirmar contraseña</label>
                                <input type="password" value={passwordForm.data.password_confirmation}
                                    onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={passwordForm.data.must_change_password}
                                    onChange={(e) => passwordForm.setData('must_change_password', e.target.checked)}
                                    className="w-4 h-4 rounded accent-[#4f46e5]" />
                                <span className="text-xs text-[#69708a]">Obligar a cambiarla al ingresar</span>
                            </label>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowPasswordModal(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={passwordForm.processing}
                                    className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm disabled:opacity-50">
                                    Restablecer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PIN */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-1">PIN de autorización</h3>
                        <p className="text-xs text-[#69708a] mb-4">
                            {showPinModal.name} · {showPinModal.has_pin ? 'Ya tiene un PIN asignado' : 'Sin PIN asignado'}
                        </p>

                        <form onSubmit={submitPin} className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-[#101528] mb-1.5">Nuevo PIN (4 a 6 dígitos)</label>
                                <input type="password" maxLength={6} value={pinForm.data.authorization_pin}
                                    onChange={(e) => pinForm.setData('authorization_pin', e.target.value)}
                                    placeholder="Dejar vacío para eliminar el PIN"
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm font-mono focus:bg-white focus:border-[#4f46e5] outline-none" autoFocus />
                                {pinForm.errors.authorization_pin && <p className="text-red-500 text-xs mt-1">{pinForm.errors.authorization_pin}</p>}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowPinModal(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={pinForm.processing}
                                    className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm disabled:opacity-50">
                                    Guardar PIN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONFIRMACIÓN */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-11 h-11 rounded-full bg-[#e0483e]/10 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-[#e0483e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        </div>
                        <p className="text-sm text-[#101528] mb-6">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc]">
                                Cancelar
                            </button>
                            <button onClick={confirmDialog.onConfirm}
                                className="flex-1 py-2.5 rounded-xl bg-[#e0483e] hover:bg-[#c93d34] text-white font-semibold text-sm">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}