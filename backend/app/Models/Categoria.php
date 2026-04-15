<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Model Categoria
 *
 * Alterações:
 *  - Adicionados: taxa_iva, sujeito_iva, codigo_isencao ao $fillable e $casts
 *  - O IVA é agora definido ao nível da categoria e herdado pelos produtos
 *  - Serviços NÃO usam categorias — mantêm o seu próprio taxa_iva
 *
 * Taxas de IVA válidas em Angola (AGT):
 *  - 0%  → isentos (produtos agrícolas, medicamentos)
 *  - 5%  → cesta básica
 *  - 14% → taxa geral
 *
 * Categorias padrão do sistema (ver CategoriaSeeder):
 *  💻 Informática e Tecnologia   → 14%
 *  👕 Vestuário e Calçados       → 14%
 *  🏠 Casa e Escritório          → 14%
 *  🧱 Construção e Ferramentas   → 14%
 *  🚗 Automóveis e Peças         → 14%
 *  🧴 Higiene e Limpeza          → 14%
 *  🎮 Lazer e Entretenimento     → 14%
 *  🏭 Produtos Industrializados  → 14%
 *  📦 Outros                     → 14%
 *  🛒 Cesta Básica               → 5%
 *  🌾 Produtos Agrícolas         → 0% (isento)
 *  💊 Medicamentos               → 0% (isento)
 */
class Categoria extends Model
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
        // ✅ NOVOS: IVA definido ao nível da categoria
        'taxa_iva',       // taxa aplicada a todos os produtos desta categoria
        'sujeito_iva',    // false = categoria isenta de IVA
        'codigo_isencao', // código SAF-T para categorias isentas (M00–M99)
    ];

    protected $casts = [
        'taxa_iva'      => 'decimal:2',
        'sujeito_iva'   => 'boolean',
        'deleted_at'    => 'datetime',
    ];

    protected $attributes = [
        'status'      => 'ativo',
        'tipo'        => 'produto',
        'taxa_iva'    => 14.00, // taxa geral padrão Angola
        'sujeito_iva' => true,
    ];

    /* =====================================================================
     | BOOT
     | ================================================================== */

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }

            // Se não sujeito a IVA, garantir que taxa_iva = 0
            if (! $model->sujeito_iva) {
                $model->taxa_iva = 0.00;
            }
        });

        static::updating(function ($model) {
            // Consistência: se sujeito_iva for false, zerar taxa
            if ($model->isDirty('sujeito_iva') && ! $model->sujeito_iva) {
                $model->taxa_iva = 0.00;
            }
        });
    }

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
     | MÉTODOS DE VERIFICAÇÃO
     | ================================================================== */

    /**
     * Retorna a taxa de IVA efectiva.
     * Se não sujeita a IVA, retorna 0.
     */
    public function taxaIvaEfectiva(): float
    {
        if (! $this->sujeito_iva) {
            return 0.0;
        }

        return (float) $this->taxa_iva;
    }

    /**
     * Verifica se a categoria é isenta de IVA.
     */
    public function isIsenta(): bool
    {
        return ! $this->sujeito_iva || (float) $this->taxa_iva === 0.0;
    }

    /**
     * Retorna o label formatado da taxa de IVA para exibição.
     * Exemplo: "14%" ou "Isento (0%)"
     */
    public function labelTaxaIva(): string
    {
        if ($this->isIsenta()) {
            return 'Isento (0%)';
        }

        return number_format($this->taxa_iva, 0, ',', '.') . '%';
    }
}