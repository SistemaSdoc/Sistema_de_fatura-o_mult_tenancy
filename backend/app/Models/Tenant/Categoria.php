<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Categoria extends TenantModel
{
    use HasFactory, SoftDeletes;

    protected $table = 'categorias';

    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id',
        'nome',
        'user_id',
        'descricao',
        'status',
        'data_registro',
        'tipo',
        'taxa_iva',
        'sujeito_iva',
        'codigo_isencao',
    ];

    protected $casts = [
        'taxa_iva'      => 'decimal:2',
        'sujeito_iva'   => 'boolean',
        'deleted_at'    => 'datetime',
    ];

    protected $attributes = [
        'status'      => 'ativo',
        'tipo'        => 'produto',
        'taxa_iva'    => 14.00,
        'sujeito_iva' => true,
    ];

    // ✅ REMOVA COMPLETAMENTE O MÉTODO boot() por enquanto
    // Vamos testar sem ele

    /* =====================================================================
     | RELAÇÕES
     | ================================================================== */

    public function produtos()
    {
        return $this->hasMany(Produto::class, 'categoria_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /* =====================================================================
     | SCOPES
     | ================================================================== */

    public function scopeAtivas($query)
    {
        return $query->where('status', 'ativo');
    }

    public function scopeIsentasIva($query)
    {
        return $query->where('sujeito_iva', false);
    }

    public function scopeComIva($query)
    {
        return $query->where('sujeito_iva', true)->where('taxa_iva', '>', 0);
    }

    public function scopePorTipo($query, string $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /* =====================================================================
     | MÉTODOS
     | ================================================================== */

    public function taxaIvaEfectiva(): float
    {
        if (!$this->sujeito_iva) {
            return 0.0;
        }
        return (float) $this->taxa_iva;
    }

    public function isIsenta(): bool
    {
        return !$this->sujeito_iva || (float) $this->taxa_iva === 0.0;
    }

    public function labelTaxaIva(): string
    {
        if ($this->isIsenta()) {
            return 'Isento (0%)';
        }
        return number_format($this->taxa_iva, 0, ',', '.') . '%';
    }
}
