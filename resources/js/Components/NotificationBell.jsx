import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

const ICONS = {
    box: <path d="M21 8L12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8" />,
    transfer: <><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M21 3l-9 9" /><path d="M3 3l9 9" /><path d="M12 12v9" /></>,
    money: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
    truck: <><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
    cash: <><rect x="2" y="6" width="20" height="14" rx="2" /><path d="M2 10h20" /><circle cx="12" cy="15" r="2" /></>,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
    alert: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
};

const LEVEL_STYLES = {
    critical: { dot: 'bg-[#e0483e]', icon: 'bg-[#e0483e]/10 text-[#e0483e]', label: 'Crítico' },
    warning: { dot: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600', label: 'Atención' },
    info: { dot: 'bg-[#4f46e5]', icon: 'bg-[#4f46e5]/10 text-[#4f46e5]', label: 'Informativo' },
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState({ items: [], total: 0, critical: 0 });
    const [loading, setLoading] = useState(false);
    const boxRef = useRef(null);

    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content;

    const fetchNotifications = async () => {
        try {
            const res = await fetch(route('notifications.index'));
            if (res.ok) setData(await res.json());
        } catch (e) {
            // silencioso: las notificaciones no deben romper la navegación
        }
    };

    // Carga inicial y refresco cada 2 minutos
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 120000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const dismiss = async (id, e) => {
        e.stopPropagation();
        setData((d) => ({
            ...d,
            items: d.items.filter((i) => i.id !== id),
            total: d.total - 1,
            critical: d.items.find((i) => i.id === id)?.level === 'critical' ? d.critical - 1 : d.critical,
        }));

        await fetch(route('notifications.dismiss'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            body: JSON.stringify({ id }),
        });
    };

    const dismissAll = async () => {
        setLoading(true);
        await fetch(route('notifications.dismiss-all'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        });
        setData({ items: [], total: 0, critical: 0 });
        setLoading(false);
    };

    const goTo = (url) => {
        setOpen(false);
        router.visit(url);
    };

    // Agrupadas por área para facilitar la lectura
    const grouped = data.items.reduce((acc, item) => {
        (acc[item.group] ||= []).push(item);
        return acc;
    }, {});

    return (
        <div ref={boxRef} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-10 h-10 rounded-xl bg-[#f4f6fb] flex items-center justify-center relative text-[#101528] hover:bg-[#e6e9f2] transition-colors"
                title={data.total > 0 ? `${data.total} notificación(es)` : 'Sin notificaciones'}
            >
                {data.total > 0 && (
                    <span className={`absolute top-1.5 right-2 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white ${
                        data.critical > 0 ? 'bg-[#e0483e]' : 'bg-amber-500'
                    }`}>
                        {data.total > 9 ? '9+' : data.total}
                    </span>
                )}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
            </button>

            {open && (
                <div className="absolute top-full right-0 mt-2 w-[380px] bg-white border border-[#e6e9f2] rounded-2xl overflow-hidden z-50 shadow-2xl">

                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#e6e9f2] bg-[#f8f9fc]">
                        <div>
                            <div className="text-sm font-bold text-[#101528]">Notificaciones</div>
                            {data.total > 0 && (
                                <div className="text-[11px] text-[#69708a]">
                                    {data.critical > 0 && (
                                        <span className="text-[#e0483e] font-semibold">{data.critical} crítica(s) · </span>
                                    )}
                                    {data.total} en total
                                </div>
                            )}
                        </div>
                        {data.total > 0 && (
                            <button
                                onClick={dismissAll}
                                disabled={loading}
                                className="text-[11px] font-semibold text-[#4f46e5] hover:underline disabled:opacity-50"
                            >
                                Descartar todas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                        {data.items.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <div className="w-12 h-12 rounded-full bg-[#0ea472]/10 flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-[#0ea472]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <div className="text-sm font-semibold text-[#101528]">Todo en orden</div>
                                <div className="text-xs text-[#a7aecb] mt-1">No hay nada que requiera tu atención.</div>
                            </div>
                        ) : (
                            Object.entries(grouped).map(([group, items]) => (
                                <div key={group}>
                                    <div className="px-4 py-1.5 bg-[#f8f9fc] text-[10px] uppercase font-bold text-[#a7aecb] tracking-wide">
                                        {group}
                                    </div>
                                    {items.map((n) => {
                                        const style = LEVEL_STYLES[n.level];
                                        return (
                                            <button
                                                key={n.id}
                                                onClick={() => goTo(n.url)}
                                                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#f8f9fc] transition-colors text-left border-b border-[#f4f6fb] last:border-0 group"
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${style.icon}`}>
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        {ICONS[n.icon] || ICONS.alert}
                                                    </svg>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                        <div className="text-[13px] font-semibold text-[#101528] leading-tight">
                                                            {n.title}
                                                        </div>
                                                    </div>
                                                    <div className="text-[11px] text-[#69708a] mt-0.5">{n.message}</div>
                                                    <div className="text-[11px] font-semibold text-[#4f46e5] mt-1">{n.action} →</div>
                                                </div>

                                                <button
                                                    onClick={(e) => dismiss(n.id, e)}
                                                    title="Descartar"
                                                    className="p-1 rounded text-[#c7cde3] hover:text-[#e0483e] hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                >
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 6 6 18M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="px-4 py-2 border-t border-[#e6e9f2] bg-[#f8f9fc] text-[10px] text-[#a7aecb] text-center">
                        Las alertas se actualizan automáticamente cada 2 minutos
                    </div>
                </div>
            )}
        </div>
    );
}