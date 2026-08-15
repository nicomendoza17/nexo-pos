<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = [
    'name', 'document_type', 'document_number', 'address',
    'phone', 'email', 'contact_name', 'is_active',
];
}
