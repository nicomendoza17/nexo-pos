<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\TaxonomyController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\KardexController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\InventoryAdjustmentController;
use App\Http\Controllers\InventoryCountController;
use App\Http\Controllers\CashSessionController;
use App\Http\Controllers\PettyCashController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\CreditNoteController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ChangePasswordController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\WarehouseController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\NotificationController;


Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// ============ DASHBOARD ============
Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:dashboard.ver'])
    ->name('dashboard');

// ============ PERFIL (sin permiso — todo usuario edita el suyo) ============
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// ============ POS ============
Route::middleware(['auth', 'verified', 'permission:ventas.registrar'])->group(function () {
    Route::get('/pos', [PosController::class, 'index'])->name('pos');
    Route::post('/pos/checkout', [PosController::class, 'checkout'])->name('pos.checkout');
});

// ============ VENTAS ============
Route::middleware(['auth', 'verified', 'permission:ventas.ver'])->group(function () {
    Route::get('/ventas', [SaleController::class, 'index'])->name('sales.index');
    Route::get('/ventas/{sale}', [SaleController::class, 'show'])->name('sales.show');
});

// ============ CLIENTES ============
Route::middleware(['auth', 'verified', 'permission:clientes.gestionar'])->group(function () {
    Route::get('/clientes', [ClientController::class, 'index'])->name('clients.index');
    Route::post('/clientes', [ClientController::class, 'store'])->name('clients.store');
    Route::put('/clientes/{client}', [ClientController::class, 'update'])->name('clients.update');
    Route::delete('/clientes/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');
    Route::post('/clientes/rapido', [ClientController::class, 'quickStore'])->name('clients.quick-store');
    Route::get('/clientes/consultar/{documento}', [ClientController::class, 'lookup'])->name('clients.lookup');
    Route::get('/clientes/buscar', [ClientController::class, 'search'])->name('clients.search');
});

// ============ CATEGORÍAS Y MARCAS ============
Route::middleware(['auth', 'verified', 'permission:inventario.crear'])->group(function () {
    Route::get('/categorias', [TaxonomyController::class, 'categoriesIndex'])->name('categories.index');
    Route::post('/categorias', [TaxonomyController::class, 'categoriesStore'])->name('categories.store');
    Route::put('/categorias/{category}', [TaxonomyController::class, 'categoriesUpdate'])->name('categories.update');
    Route::delete('/categorias/{category}', [TaxonomyController::class, 'categoriesDestroy'])->name('categories.destroy');

    Route::get('/marcas', [TaxonomyController::class, 'brandsIndex'])->name('brands.index');
    Route::post('/marcas', [TaxonomyController::class, 'brandsStore'])->name('brands.store');
    Route::put('/marcas/{brand}', [TaxonomyController::class, 'brandsUpdate'])->name('brands.update');
    Route::delete('/marcas/{brand}', [TaxonomyController::class, 'brandsDestroy'])->name('brands.destroy');
});

// ============ INVENTARIO — lectura ============
Route::middleware(['auth', 'verified', 'permission:inventario.ver'])->group(function () {
    Route::get('/inventario', [InventoryController::class, 'index'])->name('inventory.index');
    Route::get('/productos/buscar', [InventoryController::class, 'search'])->name('products.search');
});

// ============ INVENTARIO — escritura ============
Route::middleware(['auth', 'verified', 'permission:inventario.crear'])->group(function () {
    Route::post('/inventario', [InventoryController::class, 'store'])->name('inventory.store');
    Route::put('/inventario/{product}', [InventoryController::class, 'update'])->name('inventory.update');
    Route::get('/inventario/plantilla-csv', [InventoryController::class, 'template'])->name('inventory.template');
    Route::post('/inventario/carga-masiva', [InventoryController::class, 'bulkImport'])->name('inventory.bulk-import');
});

// ============ INVENTARIO — eliminación / estado ============
Route::middleware(['auth', 'verified', 'permission:inventario.eliminar'])->group(function () {
    Route::delete('/inventario/{product}', [InventoryController::class, 'destroy'])->name('inventory.destroy');
    Route::post('/inventario/eliminar-masivo', [InventoryController::class, 'bulkDestroy'])->name('inventory.bulk-destroy');
    Route::post('/inventario/activar-masivo', [InventoryController::class, 'bulkActivate'])->name('inventory.bulk-activate');
    Route::post('/inventario/desactivar-masivo', [InventoryController::class, 'bulkDeactivate'])->name('inventory.bulk-deactivate');
});

// ============ KARDEX ============
Route::middleware(['auth', 'verified', 'permission:kardex.ver'])->group(function () {
    Route::get('/kardex', [KardexController::class, 'index'])->name('kardex.index');
});

// ============ AJUSTES DE INVENTARIO ============
Route::middleware(['auth', 'verified', 'permission:inventario.ajustar'])->group(function () {
    Route::get('/ajustes-inventario', [InventoryAdjustmentController::class, 'index'])->name('inventory-adjustments.index');
    Route::post('/ajustes-inventario', [InventoryAdjustmentController::class, 'store'])->name('inventory-adjustments.store');
});

// ============ TOMA DE INVENTARIO ============
Route::middleware(['auth', 'verified', 'permission:inventario.conteo'])->group(function () {
    Route::get('/toma-inventario', [InventoryCountController::class, 'index'])->name('inventory-counts.index');
    Route::post('/toma-inventario', [InventoryCountController::class, 'create'])->name('inventory-counts.create');
    Route::get('/toma-inventario/{inventoryCount}', [InventoryCountController::class, 'show'])->name('inventory-counts.show');
    Route::post('/toma-inventario/{inventoryCount}/cerrar', [InventoryCountController::class, 'close'])->name('inventory-counts.close');
    Route::put('/toma-inventario-item/{item}', [InventoryCountController::class, 'updateItem'])->name('inventory-counts.update-item');
    Route::get('/toma-inventario-imprimir', [InventoryCountController::class, 'printSheet'])->name('inventory-counts.print');
});

// ============ PROVEEDORES ============
Route::middleware(['auth', 'verified', 'permission:proveedores.gestionar'])->group(function () {
    Route::get('/proveedores', [SupplierController::class, 'index'])->name('suppliers.index');
    Route::post('/proveedores', [SupplierController::class, 'store'])->name('suppliers.store');
    Route::put('/proveedores/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update');
    Route::delete('/proveedores/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');
    Route::get('/proveedores/consultar/{documento}', [SupplierController::class, 'lookup'])->name('suppliers.lookup');
});

// ============ COMPRAS ============
Route::middleware(['auth', 'verified', 'permission:compras.ver'])->group(function () {
    Route::get('/compras', [PurchaseController::class, 'index'])->name('purchases.index');
});

Route::middleware(['auth', 'verified', 'permission:compras.crear'])->group(function () {
    Route::post('/compras', [PurchaseController::class, 'store'])->name('purchases.store');
    Route::post('/compras/{purchase}/anular', [PurchaseController::class, 'cancel'])->name('purchases.cancel');
});

Route::middleware(['auth', 'verified', 'permission:compras.recibir'])->group(function () {
    Route::post('/compras/{purchase}/recibir', [PurchaseController::class, 'receive'])->name('purchases.receive');
});

Route::middleware(['auth', 'verified', 'permission:compras.pagar'])->group(function () {
    Route::post('/compras/{purchase}/pago', [PurchaseController::class, 'registerPayment'])->name('purchases.pay');
});

// ============ CAJA ============
Route::middleware(['auth', 'verified', 'permission:caja.abrir'])->group(function () {
    Route::get('/caja', [CashSessionController::class, 'index'])->name('cash-sessions.index');
    Route::post('/caja/abrir', [CashSessionController::class, 'open'])->name('cash-sessions.open');
    Route::post('/caja/{cashSession}/movimiento', [CashSessionController::class, 'addMovement'])->name('cash-sessions.movement');
    Route::get('/caja/{cashSession}/corte-x', [CashSessionController::class, 'reportX'])->name('cash-sessions.report-x');
    Route::post('/caja/{cashSession}/conteo-ciego', [CashSessionController::class, 'blindCount'])->name('cash-sessions.blind-count');
    Route::post('/caja/{cashSession}/cerrar', [CashSessionController::class, 'close'])->name('cash-sessions.close');
});

Route::middleware(['auth', 'verified', 'permission:ventas.anular'])->group(function () {
    Route::post('/caja/movimiento/{movement}/anular', [CashSessionController::class, 'reverseMovement'])->name('cash-sessions.movement.reverse');
});

// ============ CAJA CHICA ============
Route::middleware(['auth', 'verified', 'permission:caja-chica.gestionar'])->group(function () {
    Route::get('/caja-chica', [PettyCashController::class, 'index'])->name('petty-cash.index');
    Route::get('/caja-chica/{fund}', [PettyCashController::class, 'show'])->name('petty-cash.show');
    Route::post('/caja-chica/{fund}/gasto', [PettyCashController::class, 'addExpense'])->name('petty-cash.expense');
});

Route::middleware(['auth', 'verified', 'permission:caja-chica.reponer'])->group(function () {
    Route::post('/caja-chica', [PettyCashController::class, 'store'])->name('petty-cash.store');
    Route::post('/caja-chica/{fund}/reponer', [PettyCashController::class, 'replenish'])->name('petty-cash.replenish');
});

// ============ COTIZACIONES ============
Route::middleware(['auth', 'verified', 'permission:cotizaciones.ver'])->group(function () {
    Route::get('/cotizaciones', [QuotationController::class, 'index'])->name('quotations.index');
    Route::get('/cotizaciones/{quotation}/pdf', [QuotationController::class, 'downloadPdf'])->name('quotations.pdf');
    Route::post('/cotizaciones/{quotation}/enlace', [QuotationController::class, 'shareLink'])->name('quotations.share-link');
    Route::post('/cotizaciones/{quotation}/enviar-correo', [QuotationController::class, 'sendEmail'])->name('quotations.send-email');
});

Route::middleware(['auth', 'verified', 'permission:cotizaciones.crear'])->group(function () {
    Route::get('/cotizaciones/nueva', [QuotationController::class, 'create'])->name('quotations.create');
    Route::post('/cotizaciones', [QuotationController::class, 'store'])->name('quotations.store');
    Route::post('/cotizaciones/{quotation}/estado', [QuotationController::class, 'updateStatus'])->name('quotations.status');
});

Route::middleware(['auth', 'verified', 'permission:cotizaciones.convertir'])->group(function () {
    Route::post('/cotizaciones/{quotation}/convertir', [QuotationController::class, 'convert'])->name('quotations.convert');
});

// Ruta pública firmada — accesible por el cliente sin login
Route::get('/cotizaciones/{quotation}/ver-publico', [QuotationController::class, 'publicPdf'])
    ->name('quotations.public-pdf')
    ->middleware('signed');

// Esta va al final del grupo de cotizaciones para no capturar "nueva" como ID
Route::middleware(['auth', 'verified', 'permission:cotizaciones.ver'])->group(function () {
    Route::get('/cotizaciones/{quotation}', [QuotationController::class, 'show'])->name('quotations.show');
});

// ============ NOTAS DE CRÉDITO ============
Route::middleware(['auth', 'verified', 'permission:ventas.ver'])->group(function () {
    Route::get('/notas-credito', [CreditNoteController::class, 'index'])->name('credit-notes.index');
    Route::get('/notas-credito/{creditNote}', [CreditNoteController::class, 'show'])->name('credit-notes.show');
});

Route::middleware(['auth', 'verified', 'permission:notas-credito.emitir'])->group(function () {
    Route::get('/notas-credito/nueva/{sale}', [CreditNoteController::class, 'createFromSale'])->name('credit-notes.create');
    Route::post('/notas-credito/{sale}', [CreditNoteController::class, 'store'])->name('credit-notes.store');
});
// ============ USUARIOS ============
Route::middleware(['auth', 'verified', 'permission:usuarios.gestionar'])->group(function () {
    Route::get('/usuarios', [UserController::class, 'index'])->name('users.index');
    Route::post('/usuarios', [UserController::class, 'store'])->name('users.store');
    Route::put('/usuarios/{user}', [UserController::class, 'update'])->name('users.update');
    Route::post('/usuarios/{user}/estado', [UserController::class, 'toggleStatus'])->name('users.toggle-status');
    Route::post('/usuarios/{user}/password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    Route::post('/usuarios/{user}/pin', [UserController::class, 'updatePin'])->name('users.update-pin');
});

// Verificación de PIN — cualquier usuario autenticado puede pedir autorización
Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/autorizar-pin', [UserController::class, 'verifyPin'])->name('users.verify-pin');
});

// ============ CAMBIO OBLIGATORIO DE CONTRASEÑA ============
Route::middleware('auth')->group(function () {
    Route::get('/cambiar-password', [ChangePasswordController::class, 'show'])->name('password.change');
    Route::post('/cambiar-password', [ChangePasswordController::class, 'store'])->name('password.change.store');
});

// ============ AUDITORÍA ============
Route::middleware(['auth', 'verified', 'permission:auditoria.ver'])->group(function () {
    Route::get('/auditoria', [AuditController::class, 'index'])->name('audit.index');
    Route::get('/auditoria/exportar', [AuditController::class, 'export'])->name('audit.export');
});
// ============ CONFIGURACIÓN ============
Route::middleware(['auth', 'verified', 'permission:configuracion.gestionar'])->group(function () {
    Route::get('/configuracion', [SettingController::class, 'index'])->name('settings.index');
    Route::post('/configuracion', [SettingController::class, 'update'])->name('settings.update');
    Route::delete('/configuracion/imagen/{key}', [SettingController::class, 'removeImage'])->name('settings.remove-image');
});
// ============ REPORTES ============
Route::middleware(['auth', 'verified', 'permission:reportes.ver'])->group(function () {
    Route::get('/reportes', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reportes/exportar', [ReportController::class, 'export'])->name('reports.export');
});
// ============ SUCURSALES ============
Route::middleware(['auth', 'verified', 'permission:sucursales.gestionar'])->group(function () {
    Route::get('/sucursales', [WarehouseController::class, 'index'])->name('warehouses.index');
    Route::post('/sucursales', [WarehouseController::class, 'store'])->name('warehouses.store');
    Route::put('/sucursales/{warehouse}', [WarehouseController::class, 'update'])->name('warehouses.update');
    Route::post('/sucursales/{warehouse}/estado', [WarehouseController::class, 'toggleStatus'])->name('warehouses.toggle-status');
    Route::post('/sucursales/{warehouse}/principal', [WarehouseController::class, 'setDefault'])->name('warehouses.set-default');
});

Route::middleware(['auth', 'verified', 'permission:sucursales.cambiar'])->group(function () {
    Route::post('/sucursales/{warehouse}/activar', [WarehouseController::class, 'setActive'])->name('warehouses.set-active');
});
// ============ TRANSFERENCIAS ============
Route::middleware(['auth', 'verified', 'permission:transferencias.ver'])->group(function () {
    Route::get('/transferencias', [TransferController::class, 'index'])->name('transfers.index');
});

Route::middleware(['auth', 'verified', 'permission:transferencias.crear'])->group(function () {
    Route::get('/transferencias/nueva', [TransferController::class, 'create'])->name('transfers.create');
    Route::post('/transferencias', [TransferController::class, 'store'])->name('transfers.store');
    Route::post('/transferencias/{transfer}/anular', [TransferController::class, 'cancel'])->name('transfers.cancel');
});

Route::middleware(['auth', 'verified', 'permission:transferencias.despachar'])->group(function () {
    Route::post('/transferencias/{transfer}/despachar', [TransferController::class, 'dispatch'])->name('transfers.dispatch');
});

Route::middleware(['auth', 'verified', 'permission:transferencias.recibir'])->group(function () {
    Route::post('/transferencias/{transfer}/recibir', [TransferController::class, 'receive'])->name('transfers.receive');
});

Route::middleware(['auth', 'verified', 'permission:transferencias.ver'])->group(function () {
    Route::get('/transferencias/{transfer}', [TransferController::class, 'show'])->name('transfers.show');
});


Route::middleware(['auth', 'verified', 'permission:ventas.ver'])->group(function () {
    Route::get('/ventas/{sale}/ticket', [SaleController::class, 'ticket'])->name('sales.ticket');
    Route::get('/ventas/{sale}/boleta', [SaleController::class, 'receipt'])->name('sales.receipt');
});

// ============ NOTIFICACIONES ============
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/notificaciones', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notificaciones/descartar', [NotificationController::class, 'dismiss'])->name('notifications.dismiss');
    Route::post('/notificaciones/descartar-todas', [NotificationController::class, 'dismissAll'])->name('notifications.dismiss-all');
});

require __DIR__ . '/auth.php';