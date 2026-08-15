<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Crear el usuario Administrador
        User::create([
            'name' => 'Administrador Principal',
            'username' => 'admin',
            'email' => 'admin@nexopos.com',
            'role' => 'admin',
            'password' => Hash::make('admin'),
        ]);

        // 2. Crear un usuario Cajero de prueba
        User::create([
            'name' => 'Cajero Turno 1',
            'username' => 'caja01',
            'email' => null, // Lo configuramos como nullable en la migración
            'role' => 'cashier',
            'password' => Hash::make('cajero01'),
        ]);
        $this->call([
            ProductSeeder::class,


        ]);

        $this->call([
            ProductSeeder::class,
            WarehouseSeeder::class,
        ]);
    }
}
