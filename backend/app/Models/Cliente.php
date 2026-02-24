<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Cliente extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'clientes';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'nome',
        'nif',
        'tipo',
        'status', // NOVO: ativo/inativo
        'telefone',
        'email',
        'endereco',
        'data_registro',
    ];

    protected $casts = [
        'data_registro' => 'date',
        'deleted_at' => 'datetime',
        'status' => 'string',
    ];

    protected $attributes = [
        'status' => 'ativo', // Valor padrão
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // ================= ESCOPOS =================

    /**
     * Escopo para clientes ativos
     */
    public function scopeAtivos($query)
    {
        return $query->where('status', 'ativo');
    }

    /**
     * Escopo para clientes inativos
     */
    public function scopeInativos($query)
    {
        return $query->where('status', 'inativo');
    }

    /**
     * Escopo que ignora o status (retorna todos)
     */
    public function scopeComStatus($query, $status = null)
    {
        if ($status) {
            return $query->where('status', $status);
        }
        return $query;
    }

    // ================= RELAÇÕES =================

    public function vendas()
    {
        return $this->hasMany(Venda::class, 'cliente_id');
    }

    public function faturas()
    {
        return $this->hasMany(DocumentoFiscal::class, 'cliente_id');
    }

    // ================= ACESSORES =================

    /**
     * Verificar se o cliente está ativo
     */
    public function getEstaAtivoAttribute(): bool
    {
        return $this->status === 'ativo';
    }

    /**
     * Verificar se o cliente está inativo
     */
    public function getEstaInativoAttribute(): bool
    {
        return $this->status === 'inativo';
    }

    /**
     * Obter a cor do badge de status
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'ativo' => 'green',
            'inativo' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Obter o label do status
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'ativo' => 'Ativo',
            'inativo' => 'Inativo',
            default => $this->status,
        };
    }

    /**
     * Obter o nome formatado com status
     */
    public function getNomeComStatusAttribute(): string
    {
        return $this->nome . ' (' . $this->status_label . ')';
    }

    // ================= MÉTODOS =================

    /**
     * Ativar cliente
     */
    public function ativar(): bool
    {
        return $this->update(['status' => 'ativo']);
    }

    /**
     * Inativar cliente
     */
    public function inativar(): bool
    {
        // Regra: cliente com faturas pendentes não pode ser inativado?
        // if ($this->faturas()->pendentes()->exists()) {
        //     throw new \Exception("Cliente com faturas pendentes não pode ser inativado");
        // }

        return $this->update(['status' => 'inativo']);
    }
}
