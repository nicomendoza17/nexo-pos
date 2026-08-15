import { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

const UNIT_LABELS = { unidad: 'und', kg: 'kg', g: 'g', litro: 'L', ml: 'ml' };
const UNIT_STEP = { unidad: '1', kg: '0.001', g: '1', litro: '0.001', ml: '1' };
const PLACEHOLDER_IMG = '/images/producto-sin-imagen.png';

export default function InventoryIndex({ auth, products, categories, brands, currentWarehouse }) {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

    // ============ GESTIÓN DE CATEGORÍAS Y MARCAS ============
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [showBrandManager, setShowBrandManager] = useState(false);
    const [localCategories, setLocalCategories] = useState(categories);
    const [localBrands, setLocalBrands] = useState(brands);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newBrandName, setNewBrandName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [editingBrandId, setEditingBrandId] = useState(null);
    const [editingBrandName, setEditingBrandName] = useState('');
    const [taxonomyError, setTaxonomyError] = useState('');

    const csrfHeaders = () => ({
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
    });

    const refreshCategories = async () => {
        const res = await fetch(route('categories.index'));
        setLocalCategories(await res.json());
    };

    const refreshBrands = async () => {
        const res = await fetch(route('brands.index'));
        setLocalBrands(await res.json());
    };

    const addCategory = async () => {
        if (!newCategoryName.trim()) return;
        setTaxonomyError('');
        const res = await fetch(route('categories.store'), {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ name: newCategoryName.trim() }),
        });
        if (!res.ok) {
            const err = await res.json();
            setTaxonomyError(Object.values(err.errors || {})[0]?.[0] || err.error || 'Error al crear la categoría');
            return;
        }
        setNewCategoryName('');
        refreshCategories();
    };

    const saveCategory = async (id) => {
        if (!editingCategoryName.trim()) return;
        setTaxonomyError('');
        const res = await fetch(route('categories.update', id), {
            method: 'PUT',
            headers: csrfHeaders(),
            body: JSON.stringify({ name: editingCategoryName.trim() }),
        });
        if (!res.ok) {
            const err = await res.json();
            setTaxonomyError(Object.values(err.errors || {})[0]?.[0] || err.error || 'Error al actualizar');
            return;
        }
        setEditingCategoryId(null);
        refreshCategories();
    };

    const deleteCategory = (cat) => {
        setConfirmDialog({
            message: `¿Eliminar la categoría "${cat.name}"?`,
            onConfirm: async () => {
                setTaxonomyError('');
                const res = await fetch(route('categories.destroy', cat.id), {
                    method: 'DELETE',
                    headers: csrfHeaders(),
                });
                if (!res.ok) {
                    const err = await res.json();
                    setTaxonomyError(err.error || 'No se pudo eliminar');
                } else {
                    refreshCategories();
                }
                setConfirmDialog(null);
            },
        });
    };

    const deleteBrand = (brand) => {
        setConfirmDialog({
            message: `¿Eliminar la marca "${brand.name}"?`,
            onConfirm: async () => {
                setTaxonomyError('');
                const res = await fetch(route('brands.destroy', brand.id), {
                    method: 'DELETE',
                    headers: csrfHeaders(),
                });
                if (!res.ok) {
                    const err = await res.json();
                    setTaxonomyError(err.error || 'No se pudo eliminar');
                } else {
                    refreshBrands();
                }
                setConfirmDialog(null);
            },
        });
    };

    const addBrand = async () => {
        if (!newBrandName.trim()) return;
        setTaxonomyError('');
        const res = await fetch(route('brands.store'), {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ name: newBrandName.trim() }),
        });
        if (!res.ok) {
            const err = await res.json();
            setTaxonomyError(Object.values(err.errors || {})[0]?.[0] || err.error || 'Error al crear la marca');
            return;
        }
        setNewBrandName('');
        refreshBrands();
    };

    const saveBrand = async (id) => {
        if (!editingBrandName.trim()) return;
        setTaxonomyError('');
        const res = await fetch(route('brands.update', id), {
            method: 'PUT',
            headers: csrfHeaders(),
            body: JSON.stringify({ name: editingBrandName.trim() }),
        });
        if (!res.ok) {
            const err = await res.json();
            setTaxonomyError(Object.values(err.errors || {})[0]?.[0] || err.error || 'Error al actualizar');
            return;
        }
        setEditingBrandId(null);
        refreshBrands();
    };

    const closeTaxonomyManagers = () => {
        setShowCategoryManager(false);
        setShowBrandManager(false);
        setTaxonomyError('');
        setEditingCategoryId(null);
        setEditingBrandId(null);
        router.reload({ only: ['categories', 'brands'] });
    };

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        category_id: '',
        brand_id: '',
        name: '',
        unit_type: 'unidad',
        barcode: '',
        price: '',
        cost_price: '',
        stock: '',
        min_stock: '5',
        is_active: true,
        image: null,
    });

    // ============ FILTRADO LOCAL ============
    const filteredProducts = useMemo(() => {
        return products.data.filter((p) => {
            const matchSearch = search === '' ||
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.barcode && p.barcode.includes(search));
            const matchCategory = categoryFilter === '' || p.category_id === Number(categoryFilter);
            const matchBrand = brandFilter === '' || p.brand_id === Number(brandFilter);
            const matchStatus = statusFilter === '' ||
                (statusFilter === 'active' && p.is_active) ||
                (statusFilter === 'inactive' && !p.is_active) ||
                (statusFilter === 'low' && p.stock <= p.min_stock);
            return matchSearch && matchCategory && matchBrand && matchStatus;
        });
    }, [products.data, search, categoryFilter, brandFilter, statusFilter]);

    const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`;
    const formatStock = (product) => `${Number(product.stock).toFixed(product.unit_type === 'unidad' || product.unit_type === 'g' || product.unit_type === 'ml' ? 0 : 3)} ${UNIT_LABELS[product.unit_type]}`;

    // ============ SELECCIÓN MASIVA ============
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map((p) => p.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };

    const handleBulkActivate = () => {
        if (selectedIds.length === 0) return;
        router.post(route('inventory.bulk-activate'), { ids: selectedIds }, {
            onSuccess: () => setSelectedIds([]),
        });
    };

    const handleBulkDeactivate = () => {
        if (selectedIds.length === 0) return;
        router.post(route('inventory.bulk-deactivate'), { ids: selectedIds }, {
            onSuccess: () => setSelectedIds([]),
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setConfirmDialog({
            message: `¿Eliminar ${selectedIds.length} producto(s)? Los que no tengan ventas se borrarán permanentemente; los que sí tengan ventas se desactivarán en su lugar.`,
            onConfirm: () => {
                router.post(route('inventory.bulk-destroy'), { ids: selectedIds }, {
                    onSuccess: () => setSelectedIds([]),
                });
                setConfirmDialog(null);
            },
        });
    };

    const handleDelete = (product) => {
        setConfirmDialog({
            message: `¿Quitar "${product.name}" del inventario? Si tiene ventas registradas, se desactivará en lugar de borrarse.`,
            onConfirm: () => {
                router.delete(route('inventory.destroy', product.id));
                setConfirmDialog(null);
            },
        });
    };

    // ============ MODAL CREAR/EDITAR ============
    const openCreateModal = () => {
        setEditingProduct(null);
        setImagePreview(null);
        reset();
        setShowModal(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setImagePreview(product.image_url);
        setData({
            category_id: product.category_id,
            brand_id: product.brand_id || '',
            name: product.name,
            unit_type: product.unit_type,
            barcode: product.barcode || '',
            price: product.price,
            cost_price: product.cost_price || '',
            stock: product.stock,
            min_stock: product.min_stock,
            is_active: product.is_active,
            image: null,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProduct(null);
        setImagePreview(null);
        reset();
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const submit = (e) => {
        e.preventDefault();

        if (editingProduct) {
            transform((data) => ({ ...data, _method: 'put' }));
            post(route('inventory.update', editingProduct.id), {
                forceFormData: true,
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('inventory.store'), {
                forceFormData: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    // ============ CARGA MASIVA ============
    const submitBulk = () => {
        if (!bulkFile) return;
        setBulkProcessing(true);
        setBulkResult(null);

        const formData = new FormData();
        formData.append('file', bulkFile);

        router.post(route('inventory.bulk-import'), formData, {
            forceFormData: true,
            onSuccess: (page) => {
                setBulkResult(page.props.flash?.bulk_result || null);
                setBulkFile(null);
            },
            onFinish: () => setBulkProcessing(false),
        });
    };

    const quickCreateCategory = async () => {
        const name = prompt('Nombre de la nueva categoría:');
        if (!name || !name.trim()) return;

        const res = await fetch(route('categories.store'), {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ name: name.trim() }),
        });

        if (!res.ok) {
            const err = await res.json();
            alert(Object.values(err.errors || {})[0]?.[0] || err.error || 'Error al crear categoría');
            return;
        }

        const newCategory = await res.json();
        setLocalCategories((prev) => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
        setData('category_id', newCategory.id);
    };

    const quickCreateBrand = async () => {
        const name = prompt('Nombre de la nueva marca:');
        if (!name || !name.trim()) return;

        const res = await fetch(route('brands.store'), {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ name: name.trim() }),
        });

        if (!res.ok) {
            const err = await res.json();
            alert(Object.values(err.errors || {})[0]?.[0] || err.error || 'Error al crear marca');
            return;
        }

        const newBrand = await res.json();
        setLocalBrands((prev) => [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name)));
        setData('brand_id', newBrand.id);
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header="Ajustes de inventario"
            subheader={`Mermas y correcciones · Ajustando stock de ${currentWarehouse?.name}`}
        >
            <Head title="Inventario - NEXO POS" />

            {/* BARRA DE ACCIONES */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
                <div className="relative flex-1 min-w-[200px] max-w-[280px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a7aecb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o código..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[13px] focus:border-[#4f46e5] outline-none transition-all"
                    />
                </div>

                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none max-w-[160px]"
                >
                    <option value="">Categoría</option>
                    {localCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none max-w-[160px]"
                >
                    <option value="">Marca</option>
                    {localBrands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[13px] text-[#69708a] focus:border-[#4f46e5] outline-none max-w-[140px]"
                >
                    <option value="">Estado</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                    <option value="low">Stock bajo</option>
                </select>

                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setShowCategoryManager(true)}
                        className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[#69708a] text-[13px] font-medium hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all"
                    >
                        Categorías
                    </button>
                    <button
                        onClick={() => setShowBrandManager(true)}
                        className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[#69708a] text-[13px] font-medium hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all"
                    >
                        Marcas
                    </button>
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-3 py-2 rounded-lg border border-[#e6e9f2] bg-white text-[#69708a] font-medium text-[13px] hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        Carga masiva
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-[13px] transition-all flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                        Nuevo producto
                    </button>
                </div>
            </div>

            {/* BARRA DE SELECCIÓN MASIVA */}
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between bg-[#4f46e5]/10 border border-[#4f46e5]/20 rounded-xl px-4 py-3 mb-4">
                    <span className="text-sm font-semibold text-[#4f46e5]">
                        {selectedIds.length} producto(s) seleccionado(s)
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedIds([])}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#69708a] hover:bg-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleBulkActivate}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0ea472]/10 text-[#0ea472] hover:bg-[#0ea472]/20 transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            Activar
                        </button>
                        <button
                            onClick={handleBulkDeactivate}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#a7aecb]/10 text-[#69708a] hover:bg-[#a7aecb]/20 transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            Desactivar
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#e0483e] text-white hover:bg-[#c93d34] transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            Eliminar
                        </button>
                    </div>
                </div>
            )}

            {/* TABLA */}
            <div className="bg-white rounded-2xl border border-[#e6e9f2] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#f8f9fc] text-left text-[#69708a] text-xs uppercase tracking-wide">
                            <th className="px-4 py-3 font-semibold w-10">
                                <input
                                    type="checkbox"
                                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded accent-[#4f46e5]"
                                />
                            </th>
                            <th className="px-4 py-3 font-semibold">Producto</th>
                            <th className="px-4 py-3 font-semibold">Categoría</th>
                            <th className="px-4 py-3 font-semibold">Marca</th>
                            <th className="px-4 py-3 font-semibold">Precio</th>
                            <th className="px-4 py-3 font-semibold">Stock</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-16 text-center text-[#a7aecb]">
                                    No se encontraron productos
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((p) => {
                                const isLow = p.stock <= p.min_stock;
                                return (
                                    <tr key={p.id} className="border-t border-[#e6e9f2] hover:bg-[#f8f9fc] transition-colors">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(p.id)}
                                                onChange={() => toggleSelect(p.id)}
                                                className="w-4 h-4 rounded accent-[#4f46e5]"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setShowDetail(p)}
                                                className="flex items-center gap-3 text-left hover:opacity-70 transition-opacity"
                                            >
                                                <img
                                                    src={p.image_url || PLACEHOLDER_IMG}
                                                    alt={p.name}
                                                    className="w-10 h-10 rounded-lg object-cover border border-[#e6e9f2]"
                                                />
                                                <div>
                                                    <div className="font-semibold text-[#101528]">{p.name}</div>
                                                    <div className="text-[11px] text-[#a7aecb] font-mono">{p.barcode || 'Sin código'}</div>
                                                </div>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-[#69708a]">{p.category}</td>
                                        <td className="px-4 py-3 text-[#69708a]">{p.brand || '—'}</td>
                                        <td className="px-4 py-3 font-mono font-semibold text-[#101528]">{formatMoney(p.price)}</td>

                                        <td className="px-4 py-3">
                                            <span className={`font-mono font-semibold ${isLow ? 'text-[#e0483e]' : 'text-[#101528]'}`}>
                                                {formatStock(p)}
                                            </span>
                                            {isLow && (
                                                <span className="ml-1.5 text-[10px] font-bold uppercase text-[#e0483e] bg-[#e0483e]/10 px-1.5 py-0.5 rounded-full">
                                                    Bajo
                                                </span>
                                            )}
                                            {p.total_stock !== p.stock && (
                                                <div className="text-[10px] text-[#a7aecb]">{p.total_stock} en total</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.is_active ? 'bg-[#0ea472]/10 text-[#0ea472]' : 'bg-[#a7aecb]/10 text-[#69708a]'
                                                }`}>
                                                {p.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(p)}
                                                    className="p-2 rounded-lg hover:bg-[#f4f6fb] text-[#4f46e5] transition-colors"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p)}
                                                    className="p-2 rounded-lg hover:bg-red-50 text-[#e0483e] transition-colors"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINACIÓN */}
            {products.data.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                    {products.links.map((link, i) => (
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

            {/* MODAL DE DETALLE */}
            {showDetail && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-5">
                            <h3 className="text-lg font-bold text-[#101528]">Detalle del producto</h3>
                            <button onClick={() => setShowDetail(null)} className="text-[#a7aecb] hover:text-[#101528]">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-5">
                            <img
                                src={showDetail.image_url || PLACEHOLDER_IMG}
                                alt={showDetail.name}
                                className="w-20 h-20 rounded-xl object-cover border border-[#e6e9f2]"
                            />
                            <div>
                                <div className="text-lg font-bold text-[#101528]">{showDetail.name}</div>
                                <div className="text-sm text-[#69708a]">
                                    {showDetail.category}{showDetail.brand ? ` · ${showDetail.brand}` : ''}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-[#f8f9fc] rounded-xl p-3">
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Código de barras</div>
                                <div className="font-mono font-semibold text-[#101528] mt-0.5">{showDetail.barcode || '—'}</div>
                            </div>
                            <div className="bg-[#f8f9fc] rounded-xl p-3">
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Unidad de medida</div>
                                <div className="font-semibold text-[#101528] mt-0.5 capitalize">{showDetail.unit_type}</div>
                            </div>
                            <div className="bg-[#f8f9fc] rounded-xl p-3">
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Precio venta</div>
                                <div className="font-mono font-bold text-[#4f46e5] mt-0.5">{formatMoney(showDetail.price)}</div>
                            </div>
                            <div className="bg-[#f8f9fc] rounded-xl p-3">
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Precio costo</div>
                                <div className="font-mono font-semibold text-[#101528] mt-0.5">
                                    {showDetail.cost_price ? formatMoney(showDetail.cost_price) : '—'}
                                </div>
                            </div>
                            <div className="bg-[#f8f9fc] rounded-xl p-3">
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Stock actual</div>
                                <div className={`font-mono font-bold mt-0.5 ${showDetail.stock <= showDetail.min_stock ? 'text-[#e0483e]' : 'text-[#101528]'}`}>
                                    {formatStock(showDetail)}
                                </div>
                            </div>
                            <div className="bg-[#f8f9fc] rounded-xl p-3">
                                <div className="text-[11px] text-[#a7aecb] uppercase font-semibold">Stock mínimo</div>
                                <div className="font-mono font-semibold text-[#101528] mt-0.5">
                                    {showDetail.min_stock} {UNIT_LABELS[showDetail.unit_type]}
                                </div>
                            </div>
                            {showDetail.cost_price && (
                                <div className="bg-[#0ea472]/10 rounded-xl p-3 col-span-2">
                                    <div className="text-[11px] text-[#0ea472] uppercase font-semibold">Margen de ganancia</div>
                                    <div className="font-mono font-bold text-[#0ea472] mt-0.5">
                                        {formatMoney(showDetail.price - showDetail.cost_price)}
                                        {' '}({(((showDetail.price - showDetail.cost_price) / showDetail.price) * 100).toFixed(1)}%)
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => { openEditModal(showDetail); setShowDetail(null); }}
                            className="w-full mt-5 py-2.5 rounded-xl bg-[#4f46e5] text-white font-semibold text-sm hover:bg-[#4338ca] transition-colors"
                        >
                            Editar producto
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL CREAR/EDITAR */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8">
                        <h3 className="text-lg font-bold text-[#101528] mb-5">
                            {editingProduct ? 'Editar producto' : 'Nuevo producto'}
                        </h3>

                        <form onSubmit={submit} className="space-y-4">
                            {/* IMAGEN */}
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] overflow-hidden shrink-0">
                                    <img
                                        src={imagePreview || PLACEHOLDER_IMG}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Foto (opcional)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="text-xs text-[#69708a] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#4f46e5]/10 file:text-[#4f46e5] file:text-xs file:font-semibold hover:file:bg-[#4f46e5]/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Nombre *</label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Categoría *</label>
                                    <select
                                        value={data.category_id}
                                        onChange={(e) => {
                                            if (e.target.value === '__new__') {
                                                quickCreateCategory();
                                            } else {
                                                setData('category_id', e.target.value);
                                            }
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {localCategories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                        <option value="__new__">+ Crear nueva categoría...</option>
                                    </select>
                                    {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Marca</label>
                                    <select
                                        value={data.brand_id}
                                        onChange={(e) => {
                                            if (e.target.value === '__new__') {
                                                quickCreateBrand();
                                            } else {
                                                setData('brand_id', e.target.value);
                                            }
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    >
                                        <option value="">Sin marca (a granel)</option>
                                        {localBrands.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                        <option value="__new__">+ Crear nueva marca...</option>
                                    </select>
                                    {errors.brand_id && <p className="text-red-500 text-xs mt-1">{errors.brand_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Unidad de medida *</label>
                                    <select
                                        value={data.unit_type}
                                        onChange={(e) => setData('unit_type', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    >
                                        <option value="unidad">Unidad (botella, paquete)</option>
                                        <option value="kg">Kilogramo (a granel)</option>
                                        <option value="g">Gramo</option>
                                        <option value="litro">Litro</option>
                                        <option value="ml">Mililitro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Código de barras</label>
                                    <input
                                        type="text"
                                        value={data.barcode}
                                        onChange={(e) => setData('barcode', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                    {errors.barcode && <p className="text-red-500 text-xs mt-1">{errors.barcode}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Precio de venta *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.price}
                                        onChange={(e) => setData('price', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">Precio de costo</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.cost_price}
                                        onChange={(e) => setData('cost_price', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">
                                        Stock actual ({UNIT_LABELS[data.unit_type]})
                                    </label>
                                    {editingProduct ? (
                                        <div>
                                            <div className="w-full px-4 py-2.5 rounded-xl bg-[#f4f6fb] border border-[#e6e9f2] text-sm text-[#69708a]">
                                                {data.stock} {UNIT_LABELS[data.unit_type]}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => router.visit(route('inventory-adjustments.index'))}
                                                className="text-[11px] font-semibold text-[#4f46e5] hover:underline mt-1"
                                            >
                                                Ajustar stock desde Ajustes de inventario
                                            </button>
                                        </div>
                                    ) : (
                                        <input
                                            type="number"
                                            step={UNIT_STEP[data.unit_type]}
                                            min="0"
                                            value={data.stock}
                                            onChange={(e) => setData('stock', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#101528] mb-1.5">
                                        Stock mínimo * ({UNIT_LABELS[data.unit_type]})
                                    </label>
                                    <input
                                        type="number"
                                        step={UNIT_STEP[data.unit_type]}
                                        min="0"
                                        value={data.min_stock}
                                        onChange={(e) => setData('min_stock', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                                    />
                                </div>
                            </div>

                            {editingProduct && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="w-4 h-4 rounded accent-[#4f46e5]"
                                    />
                                    <span className="text-sm text-[#101528] font-medium">Producto activo (visible en el POS)</span>
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

            {/* MODAL CARGA MASIVA */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-2">Carga masiva de productos</h3>
                        <p className="text-xs text-[#69708a] mb-4">
                            Sube un archivo CSV con columnas: <code className="bg-[#f4f6fb] px-1 rounded">name, category, brand, unit_type, barcode, price, cost_price, stock, min_stock</code>
                        </p>

                        <a
                            href="/inventario/plantilla-csv"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4f46e5] hover:underline mb-4"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Descargar plantilla CSV
                        </a>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setBulkFile(e.target.files[0])}
                            className="w-full text-xs text-[#69708a] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#4f46e5]/10 file:text-[#4f46e5] file:text-xs file:font-semibold hover:file:bg-[#4f46e5]/20 mb-4"
                        />

                        {bulkResult && (
                            <div className={`text-xs p-3 rounded-lg mb-4 ${bulkResult.errors > 0 ? 'bg-amber-50 text-amber-700' : 'bg-[#0ea472]/10 text-[#0ea472]'}`}>
                                {bulkResult.created} producto(s) creado(s), {bulkResult.errors} error(es)
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowBulkModal(false); setBulkResult(null); setBulkFile(null); }}
                                className="flex-1 py-2.5 rounded-xl border border-[#e6e9f2] text-[#69708a] font-semibold text-sm hover:bg-[#f8f9fc] transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={submitBulk}
                                disabled={!bulkFile || bulkProcessing}
                                className="flex-1 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors disabled:opacity-50"
                            >
                                {bulkProcessing ? 'Procesando...' : 'Subir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL GESTIONAR CATEGORÍAS */}
            {showCategoryManager && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-4">Categorías</h3>

                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                                placeholder="Nueva categoría..."
                                className="flex-1 px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                            />
                            <button
                                onClick={addCategory}
                                className="px-4 py-2 rounded-lg bg-[#4f46e5] text-white text-sm font-semibold hover:bg-[#4338ca]"
                            >
                                +
                            </button>
                        </div>

                        {taxonomyError && <p className="text-red-500 text-xs mb-2">{taxonomyError}</p>}

                        <div className="max-h-64 overflow-y-auto space-y-1">
                            {localCategories.map((c) => (
                                <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f8f9fc]">
                                    {editingCategoryId === c.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editingCategoryName}
                                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveCategory(c.id)}
                                                className="flex-1 px-2 py-1 rounded border border-[#e6e9f2] text-sm outline-none focus:border-[#4f46e5]"
                                                autoFocus
                                            />
                                            <button onClick={() => saveCategory(c.id)} className="text-[#0ea472] text-xs font-semibold">Guardar</button>
                                            <button onClick={() => setEditingCategoryId(null)} className="text-[#a7aecb] text-xs">Cancelar</button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-sm text-[#101528]">{c.name}</span>
                                            <span className="text-[10px] text-[#a7aecb]">{c.products_count ?? 0} prod.</span>
                                            <button
                                                onClick={() => { setEditingCategoryId(c.id); setEditingCategoryName(c.name); }}
                                                className="p-1 text-[#4f46e5] hover:bg-[#4f46e5]/10 rounded"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => deleteCategory(c)}
                                                className="p-1 text-[#e0483e] hover:bg-red-50 rounded"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={closeTaxonomyManagers}
                            className="w-full mt-4 py-2.5 rounded-xl bg-[#f4f6fb] text-[#69708a] font-semibold text-sm hover:bg-[#e6e9f2] transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL GESTIONAR MARCAS */}
            {showBrandManager && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#101528] mb-4">Marcas</h3>

                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newBrandName}
                                onChange={(e) => setNewBrandName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addBrand()}
                                placeholder="Nueva marca..."
                                className="flex-1 px-3 py-2 rounded-lg bg-[#f8f9fc] border border-[#e6e9f2] text-sm focus:bg-white focus:border-[#4f46e5] outline-none"
                            />
                            <button
                                onClick={addBrand}
                                className="px-4 py-2 rounded-lg bg-[#4f46e5] text-white text-sm font-semibold hover:bg-[#4338ca]"
                            >
                                +
                            </button>
                        </div>

                        {taxonomyError && <p className="text-red-500 text-xs mb-2">{taxonomyError}</p>}

                        <div className="max-h-64 overflow-y-auto space-y-1">
                            {localBrands.map((b) => (
                                <div key={b.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f8f9fc]">
                                    {editingBrandId === b.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editingBrandName}
                                                onChange={(e) => setEditingBrandName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveBrand(b.id)}
                                                className="flex-1 px-2 py-1 rounded border border-[#e6e9f2] text-sm outline-none focus:border-[#4f46e5]"
                                                autoFocus
                                            />
                                            <button onClick={() => saveBrand(b.id)} className="text-[#0ea472] text-xs font-semibold">Guardar</button>
                                            <button onClick={() => setEditingBrandId(null)} className="text-[#a7aecb] text-xs">Cancelar</button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-sm text-[#101528]">{b.name}</span>
                                            <span className="text-[10px] text-[#a7aecb]">{b.products_count ?? 0} prod.</span>
                                            <button
                                                onClick={() => { setEditingBrandId(b.id); setEditingBrandName(b.name); }}
                                                className="p-1 text-[#4f46e5] hover:bg-[#4f46e5]/10 rounded"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => deleteBrand(b)}
                                                className="p-1 text-[#e0483e] hover:bg-red-50 rounded"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={closeTaxonomyManagers}
                            className="w-full mt-4 py-2.5 rounded-xl bg-[#f4f6fb] text-[#69708a] font-semibold text-sm hover:bg-[#e6e9f2] transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMACIÓN */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-11 h-11 rounded-full bg-[#e0483e]/10 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-[#e0483e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
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