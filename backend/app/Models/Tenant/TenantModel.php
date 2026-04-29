<?php

namespace App\Models\Tenant;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;


abstract class TenantModel extends Model
{
    use HasFactory;
    protected $connection = 'tenant';
}