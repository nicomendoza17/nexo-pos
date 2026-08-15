<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'employee_code',
        'username',
        'email',
        'document_type',
        'document_number',
        'phone',
        'warehouse_id',
        'commission_rate',
        'password',
        'authorization_pin',
        'is_active',
        'must_change_password',
        'role', // se mantiene temporalmente por compatibilidad
    ];

    protected $hidden = [
        'password',
        'authorization_pin',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'authorization_pin' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'commission_rate' => 'decimal:2',
        ];
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    /**
     * Verifica el PIN de autorización de este usuario.
     */
    public function verifyPin(string $pin): bool
    {
        return $this->authorization_pin && Hash::check($pin, $this->authorization_pin);
    }

    /**
     * Genera el siguiente código de empleado disponible (V001, V002...).
     */
    public static function nextEmployeeCode(): string
    {
        $last = self::whereNotNull('employee_code')
            ->orderByDesc('employee_code')
            ->first();

        $next = $last ? ((int) substr($last->employee_code, 1)) + 1 : 1;

        return 'V' . str_pad($next, 3, '0', STR_PAD_LEFT);
    }
}