<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\AuditService;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index()
    {
        $values = SettingsService::all();

        // Las imágenes se envían como URL pública, no como ruta interna
        $resolved = [];
        foreach (SettingsService::DEFINITIONS as $key => [$type]) {
            $resolved[$key] = $type === 'image' && $values[$key]
                ? Storage::url($values[$key])
                : $values[$key];
        }

        return Inertia::render('Settings/Index', [
            'settings' => $resolved,
            'definitions' => SettingsService::DEFINITIONS,
            'groups' => SettingsService::GROUPS,
        ]);
    }

    public function update(Request $request)
    {
        $rules = [];
        foreach (SettingsService::DEFINITIONS as $key => [$type]) {
            $rules[$key] = match ($type) {
                'number' => 'nullable|numeric|min:0',
                'boolean' => 'nullable|boolean',
                'image' => 'nullable|image|max:2048',
                default => 'nullable|string|max:500',
            };
        }

        $validated = $request->validate($rules);

        $before = SettingsService::all();
        $changed = [];

        foreach (SettingsService::DEFINITIONS as $key => [$type]) {
            if ($type === 'image') {
                if ($request->hasFile($key)) {
                    // Borra la imagen anterior si existía
                    $old = Setting::where('key', $key)->value('value');
                    if ($old) {
                        Storage::disk('public')->delete($old);
                    }

                    $path = $request->file($key)->store('settings', 'public');
                    SettingsService::set($key, $path);
                    $changed[$key] = ['antes' => $old ?: '—', 'despues' => 'nueva imagen'];
                }
                continue;
            }

            if (!array_key_exists($key, $validated)) continue;

            $newValue = $type === 'boolean'
                ? (bool) ($validated[$key] ?? false)
                : ($validated[$key] ?? '');

            if ((string) $before[$key] !== (string) $newValue) {
                $changed[$key] = ['antes' => $before[$key], 'despues' => $newValue];
            }

            SettingsService::set($key, $newValue);
        }

        if (!empty($changed)) {
            AuditService::log(
                'configuracion.cambiar',
                'Modificó ' . count($changed) . ' parámetro(s) de configuración',
                null,
                ['cambios' => $changed]
            );
        }

        return back()->with('success', 'Configuración actualizada');
    }

    public function removeImage(Request $request, string $key)
    {
        if (!isset(SettingsService::DEFINITIONS[$key]) || SettingsService::DEFINITIONS[$key][0] !== 'image') {
            return back()->with('error', 'Parámetro inválido');
        }

        $path = Setting::where('key', $key)->value('value');
        if ($path) {
            Storage::disk('public')->delete($path);
        }

        SettingsService::set($key, '');

        AuditService::log('configuracion.cambiar', "Eliminó la imagen de \"{$key}\"");

        return back()->with('success', 'Imagen eliminada');
    }
}