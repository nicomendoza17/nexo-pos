<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Services\SettingsService;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'username' => $request->user()->username,
                    'email' => $request->user()->email,
                    'employee_code' => $request->user()->employee_code,
                    'role' => $request->user()->getRoleNames()->first(),
                    'permissions' => $request->user()->getAllPermissions()->pluck('name'),
                ] : null,
            ],
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'bulk_result' => fn() => $request->session()->get('bulk_result'),
                'last_sale_id' => fn() => $request->session()->get('last_sale_id'),
            ],
            'settings' => [
                'company_name' => SettingsService::get('company_name'),
                'currency' => SettingsService::currency(),
                'tax_rate' => SettingsService::get('tax_rate'),
                'tax_included_in_price' => SettingsService::get('tax_included_in_price'),
                'ticket_auto_print' => SettingsService::get('ticket_auto_print'),
                'discount_max_percent' => SettingsService::get('discount_max_percent'),
                'discount_require_reason' => SettingsService::get('discount_require_reason'),
                'payment_methods' => array_map('trim', explode(',', SettingsService::get('payment_methods', 'Efectivo'))),
                'allow_mixed_payment' => SettingsService::get('allow_mixed_payment'),
                'product_placeholder' => SettingsService::get('product_placeholder')
                    ? \Illuminate\Support\Facades\Storage::url(SettingsService::get('product_placeholder'))
                    : '/images/producto-sin-imagen.jpg',
            ],
            'warehouse' => $request->user() ? [
                'current' => \App\Services\WarehouseContext::current()->only(['id', 'name', 'code', 'allows_sales']),
                'switchable' => \App\Services\WarehouseContext::switchable(),
            ] : null,
        ]);
    }
}
