<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Warehouse;
use App\Services\AuditService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with(['roles', 'permissions', 'warehouse'])
            ->orderBy('name')
            ->paginate(15)
            ->through(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'employee_code' => $u->employee_code,
                'username' => $u->username,
                'email' => $u->email,
                'document_type' => $u->document_type,
                'document_number' => $u->document_number,
                'phone' => $u->phone,
                'role' => $u->roles->first()?->name,
                'warehouse_id' => $u->warehouse_id,
                'warehouse' => $u->warehouse?->name,
                'commission_rate' => (float) $u->commission_rate,
                'is_active' => $u->is_active,
                'has_pin' => !empty($u->authorization_pin),
                'extra_permissions' => $u->permissions->pluck('name'),
                'extra_permissions_count' => $u->permissions->count(),
                'last_login_at' => $u->last_login_at,
                'last_login_ip' => $u->last_login_ip,
            ]);

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => Role::orderBy('name')->pluck('name'),
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name']),
            'permissionGroups' => RolesAndPermissionsSeeder::PERMISSIONS,
            'rolePermissions' => $this->rolePermissionsMap(),
            'nextEmployeeCode' => User::nextEmployeeCode(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'employee_code' => 'required|string|max:20|unique:users,employee_code',
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'document_type' => 'nullable|in:dni,ce',
            'document_number' => 'nullable|string|max:20|unique:users,document_number',
            'phone' => 'nullable|string|max:20',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'password' => ['required', 'confirmed', Password::min(8)],
            'authorization_pin' => 'nullable|string|min:4|max:6',
            'role' => 'required|exists:roles,name',
            'extra_permissions' => 'nullable|array',
            'extra_permissions.*' => 'exists:permissions,name',
            'must_change_password' => 'boolean',
        ]);

        DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'employee_code' => $validated['employee_code'],
                'username' => $validated['username'],
                'email' => $validated['email'],
                'document_type' => $validated['document_type'] ?? null,
                'document_number' => $validated['document_number'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'warehouse_id' => $validated['warehouse_id'] ?? null,
                'commission_rate' => $validated['commission_rate'] ?? 0,
                'password' => $validated['password'],
                'authorization_pin' => $validated['authorization_pin'] ?? null,
                'must_change_password' => $validated['must_change_password'] ?? false,
                'is_active' => true,
            ]);

            $user->assignRole($validated['role']);

            // Permisos adicionales: solo los que NO vienen ya del rol
            $rolePerms = Role::findByName($validated['role'])->permissions->pluck('name')->toArray();
            $extra = array_values(array_diff($validated['extra_permissions'] ?? [], $rolePerms));

            if (!empty($extra)) {
                $user->givePermissionTo($extra);
            }

            AuditService::log('usuario.crear', "Creó al usuario {$user->name} ({$user->employee_code}) con rol {$validated['role']}", $user);
        });

        return redirect()->route('users.index')->with('success', 'Usuario creado correctamente');
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'employee_code' => 'required|string|max:20|unique:users,employee_code,' . $user->id,
            'username' => 'required|string|max:50|unique:users,username,' . $user->id,
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'document_type' => 'nullable|in:dni,ce',
            'document_number' => 'nullable|string|max:20|unique:users,document_number,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'role' => 'required|exists:roles,name',
            'extra_permissions' => 'nullable|array',
            'extra_permissions.*' => 'exists:permissions,name',
        ]);

        // Protección: no dejar el sistema sin administradores
        if ($user->hasRole('Administrador') && $validated['role'] !== 'Administrador') {
            $adminCount = User::role('Administrador')->where('is_active', true)->count();
            if ($adminCount <= 1) {
                return back()->with('error', 'No puedes cambiar el rol del único administrador activo del sistema.');
            }
        }

        DB::transaction(function () use ($validated, $user) {
            $user->update([
                'name' => $validated['name'],
                'employee_code' => $validated['employee_code'],
                'username' => $validated['username'],
                'email' => $validated['email'],
                'document_type' => $validated['document_type'] ?? null,
                'document_number' => $validated['document_number'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'warehouse_id' => $validated['warehouse_id'] ?? null,
                'commission_rate' => $validated['commission_rate'] ?? 0,
            ]);

            $user->syncRoles([$validated['role']]);

            $rolePerms = Role::findByName($validated['role'])->permissions->pluck('name')->toArray();
            $extra = array_values(array_diff($validated['extra_permissions'] ?? [], $rolePerms));
            $user->syncPermissions($extra);

            AuditService::log('usuario.editar', "Editó al usuario {$user->name}", $user);
        });

        return redirect()->route('users.index')->with('success', 'Usuario actualizado');
    }

    /**
     * Los usuarios nunca se eliminan — solo se activan o desactivan,
     * para preservar su historial de ventas, caja y movimientos.
     */
    public function toggleStatus(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'No puedes desactivar tu propia cuenta.');
        }

        if ($user->is_active && $user->hasRole('Administrador')) {
            $adminCount = User::role('Administrador')->where('is_active', true)->count();
            if ($adminCount <= 1) {
                return back()->with('error', 'No puedes desactivar al único administrador activo del sistema.');
            }
        }

        $user->update(['is_active' => !$user->is_active]);

        $accion = $user->is_active ? 'activó' : 'desactivó';

        AuditService::log('usuario.estado', "Se {$accion} al usuario {$user->name}", $user);

        return back()->with('success', "Usuario {$accion} correctamente");
    }

    public function resetPassword(Request $request, User $user)
    {
        $validated = $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)],
            'must_change_password' => 'boolean',
        ]);

        $user->update([
            'password' => $validated['password'],
            'must_change_password' => $validated['must_change_password'] ?? true,
        ]);

        AuditService::log('usuario.password', "Restableció la contraseña de {$user->name}", $user);

        return back()->with('success', 'Contraseña restablecida');
    }

    public function updatePin(Request $request, User $user)
    {
        $validated = $request->validate([
            'authorization_pin' => 'nullable|string|min:4|max:6',
        ]);

        $tenia = !empty($user->authorization_pin);
        $user->update(['authorization_pin' => $validated['authorization_pin'] ?: null]);

        $accion = $validated['authorization_pin']
            ? ($tenia ? 'Cambió' : 'Asignó')
            : 'Eliminó';

        AuditService::log('usuario.pin', "{$accion} el PIN de autorización de {$user->name}", $user);

        return back()->with('success', 'PIN actualizado');
    }

    /**
     * Verifica el PIN de un supervisor para autorizar una acción puntual
     * sin cerrar la sesión del cajero.
     */
    public function verifyPin(Request $request)
    {
        $validated = $request->validate([
            'pin' => 'required|string',
            'permission' => 'required|string',
        ]);

        $authorizer = User::where('is_active', true)
            ->whereNotNull('authorization_pin')
            ->get()
            ->first(fn ($u) => $u->verifyPin($validated['pin']) && $u->can($validated['permission']));

        if (!$authorizer) {
            // Un PIN inválido es un evento de seguridad: se registra igual
            AuditService::log(
                'autorizacion.pin',
                "Intento fallido de autorización por PIN para \"{$validated['permission']}\"",
                null,
                ['permiso' => $validated['permission'], 'resultado' => 'fallido']
            );

            return response()->json([
                'authorized' => false,
                'message' => 'PIN inválido o sin permiso para esta acción',
            ], 403);
        }

        AuditService::log('autorizacion.pin', "{$authorizer->name} autorizó la acción \"{$validated['permission']}\"", null, [
            'permiso' => $validated['permission'],
        ], $authorizer->id);

        return response()->json([
            'authorized' => true,
            'authorizer' => [
                'id' => $authorizer->id,
                'name' => $authorizer->name,
                'employee_code' => $authorizer->employee_code,
            ],
        ]);
    }

    private function rolePermissionsMap(): array
    {
        return Role::with('permissions')->get()
            ->mapWithKeys(fn ($r) => [$r->name => $r->permissions->pluck('name')])
            ->toArray();
    }
}