<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Cliente extends TenantModel
{
    use HasFactory, SoftDeletes;

    protected $table = 'clientes';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'nome',
        'nif',
        'tipo',
        'status',
        'telefone',
        'email',
        'endereco',
        'data_registro',
    ];

    protected $casts = [
        'data_registro' => 'date',
        'deleted_at' => 'datetime',
        'status' => 'string',
        'tipo' => 'string',
    ];

    protected $attributes = [
        'status' => 'ativo',
        'tipo' => 'consumidor_final',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
            
            // Normaliza NIF antes de salvar
            $model->normalizarNIF();
        });

        static::updating(function ($model) {
            // Normaliza NIF antes de atualizar
            $model->normalizarNIF();
        });

        static::saving(function ($model) {
            // Valida NIF antes de salvar
            $model->validarNIF();
        });
    }

    // ================= VALIDAÇÃO DO NIF =================

    /**
     * Normaliza o NIF: remove caracteres especiais e converte para maiúsculas
     */
    public function normalizarNIF(): void
    {
        if (empty($this->nif)) {
            return;
        }

        // Remove espaços, barras, hífens, pontos e caracteres especiais
        $this->nif = preg_replace('/[^A-Za-z0-9]/', '', $this->nif);
        $this->nif = strtoupper($this->nif);
    }

    /**
     * Valida o NIF conforme o tipo de cliente
     * 
     * @throws ValidationException
     */
    public function validarNIF(): void
    {
        // Se não tem NIF e é empresa, inválido
        if ($this->tipo === 'empresa' && empty($this->nif)) {
            throw ValidationException::withMessages([
                'nif' => 'Empresa deve ter NIF com exatamente 10 dígitos numéricos'
            ]);
        }

        // Se não tem NIF e é consumidor, é opcional
        if ($this->tipo === 'consumidor_final' && empty($this->nif)) {
            return;
        }

        $nif = $this->nif;

        // Validação para empresa (10 dígitos numéricos)
        if ($this->tipo === 'empresa') {
            if (!preg_match('/^\d{10}$/', $nif)) {
                throw ValidationException::withMessages([
                    'nif' => 'Empresa deve ter NIF com exatamente 10 dígitos numéricos'
                ]);
            }
            return;
        }

        // Validação para consumidor final (opcional, mas se tiver deve ser válido)
        if ($this->tipo === 'consumidor_final' && !empty($nif)) {
            // Aceita: 10 dígitos (NIF) ou 9 números + 2 letras + 3 números (BI)
            if (!preg_match('/^\d{10}$|^\d{9}[A-Z]{2}\d{3}$/', $nif)) {
                throw ValidationException::withMessages([
                    'nif' => 'Formato inválido. Use NIF (10 dígitos) ou BI (9 números + 2 letras + 3 números)'
                ]);
            }
        }
    }

    /**
     * Verifica se o NIF é válido (sem lançar exceção)
     */
    public function isNIFValido(): bool
    {
        try {
            $this->validarNIF();
            return true;
        } catch (ValidationException $e) {
            return false;
        }
    }

    /**
     * Identifica o tipo de documento (NIF ou BI)
     */
    public function getTipoDocumentoAttribute(): ?string
    {
        if (empty($this->nif)) {
            return null;
        }

        $nif = $this->nif;

        if (preg_match('/^\d{10}$/', $nif)) {
            return 'NIF';
        }

        if (preg_match('/^\d{9}[A-Z]{2}\d{3}$/', $nif)) {
            return 'BI';
        }

        return null;
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

    /**
     * Escopo para empresas
     */
    public function scopeEmpresas($query)
    {
        return $query->where('tipo', 'empresa');
    }

    /**
     * Escopo para consumidores finais
     */
    public function scopeConsumidores($query)
    {
        return $query->where('tipo', 'consumidor_final');
    }

    /**
     * Escopo para busca por texto
     */
    public function scopeBuscar($query, string $termo)
    {
        return $query->where(function ($q) use ($termo) {
            $q->where('nome', 'LIKE', "%{$termo}%")
              ->orWhere('nif', 'LIKE', "%{$termo}%")
              ->orWhere('email', 'LIKE', "%{$termo}%")
              ->orWhere('telefone', 'LIKE', "%{$termo}%");
        });
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

    /**
     * NIF formatado com máscara
     */
    public function getNifFormatadoAttribute(): string
    {
        if (empty($this->nif)) return '-';
        
        $nif = $this->nif;
        
        if (preg_match('/^\d{10}$/', $nif)) {
            return preg_replace('/(\d{3})(\d{3})(\d{4})/', '$1 $2 $3', $nif);
        }
        
        if (preg_match('/^\d{9}[A-Z]{2}\d{3}$/', $nif)) {
            return preg_replace('/(\d{3})(\d{3})(\d{3})([A-Z]{2})(\d{3})/', '$1 $2 $3 $4 $5', $nif);
        }
        
        return $nif;
    }

    /**
     * Tipo de cliente label
     */
    public function getTipoLabelAttribute(): string
    {
        return $this->tipo === 'empresa' ? 'Empresa' : 'Consumidor Final';
    }

    /**
     * Cor do badge do tipo
     */
    public function getTipoColorAttribute(): string
    {
        return match($this->tipo) {
            'empresa' => 'blue',
            'consumidor_final' => 'purple',
            default => 'gray',
        };
    }

    /**
     * Obtém o NIF com o tipo de documento (NIF/BI)
     */
    public function getNifComTipoAttribute(): string
    {
        if (empty($this->nif)) return '-';
        
        $tipo = $this->tipo_documento;
        $formatado = $this->nif_formatado;
        
        return $tipo ? "{$formatado} ({$tipo})" : $formatado;
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
        // Regra: cliente com faturas pendentes não pode ser inativado
        if ($this->faturas()->where('status', 'pendente')->exists()) {
            throw new \Exception("Cliente com faturas pendentes não pode ser inativado");
        }

        return $this->update(['status' => 'inativo']);
    }

    /**
     * Verifica se o cliente tem faturas pendentes
     */
    public function temFaturasPendentes(): bool
    {
        return $this->faturas()->where('status', 'pendente')->exists();
    }

    /**
     * Verifica se o cliente tem vendas
     */
    public function temVendas(): bool
    {
        return $this->vendas()->exists();
    }

    /**
     * Obtém o total de vendas do cliente
     */
    public function getTotalVendasAttribute(): float
    {
        return $this->vendas()->sum('total');
    }

    /**
     * Obtém o total de faturas do cliente
     */
    public function getTotalFaturasAttribute(): float
    {
        return $this->faturas()->sum('total');
    }

    /**
     * Obtém o total gasto pelo cliente
     */
    public function getTotalGastoAttribute(): float
    {
        return $this->vendas()->sum('total') + $this->faturas()->sum('total');
    }

    // ================= VALIDAÇÃO ADICIONAL =================

    /**
     * Valida se o telefone tem formato correto
     */
    public function validarTelefone(): bool
    {
        if (empty($this->telefone)) {
            return $this->tipo === 'consumidor_final'; // Opcional para consumidor
        }

        // Remove espaços e caracteres especiais
        $telefone = preg_replace('/[^0-9+]/', '', $this->telefone);
        
        // Verifica se tem +244 ou 9 dígitos
        return preg_match('/^\+244[0-9]{9}$/', $telefone) || 
               preg_match('/^[0-9]{9}$/', $telefone);
    }

    /**
     * Valida se o email tem formato correto
     */
    public function validarEmail(): bool
    {
        if (empty($this->email)) {
            return $this->tipo === 'consumidor_final'; // Opcional para consumidor
        }

        return filter_var($this->email, FILTER_VALIDATE_EMAIL) !== false;
    }

    // ================= MUTATORS =================

    /**
     * Setter para garantir que o NIF seja sempre maiúsculo
     */
    public function setNifAttribute($value)
    {
        if ($value) {
            $this->attributes['nif'] = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $value));
        } else {
            $this->attributes['nif'] = null;
        }
    }

    /**
     * Setter para email sempre minúsculo
     */
    public function setEmailAttribute($value)
    {
        if ($value) {
            $this->attributes['email'] = strtolower(trim($value));
        } else {
            $this->attributes['email'] = null;
        }
    }

    /**
     * Setter para telefone sem espaços
     */
    public function setTelefoneAttribute($value)
    {
        if ($value) {
            $this->attributes['telefone'] = trim($value);
        } else {
            $this->attributes['telefone'] = null;
        }
    }

}