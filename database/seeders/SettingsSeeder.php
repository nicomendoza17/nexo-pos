<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Services\SettingsService;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ProductSeeder::class,
            WarehouseSeeder::class,
            RolesAndPermissionsSeeder::class,
            SettingsSeeder::class,
        ]);
    }
}
