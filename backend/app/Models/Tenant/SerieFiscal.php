<?php

namespace App\Models\Tenant;

use Illuminate\Support\Str;

/**
 * Model SerieFiscal
 *
 * Representa uma série de numeração para um tipo de documento fiscal.
 * O campo ultimo_numero é actualizado pelo DocumentoFiscalService::gerarNumeroDocumento()
 * com lockForUpdate() dentro de transacção — nunca deve ser modificado directamente.
 *
 * Formato do número_documento gerado:
 *   {serie}-{ultimo_numero padded com digitos}
 *   Exemplo: serie='B', digitos=5, ultimo_numero=42 → 'B-00042'
 *
 * @property string   $id
 * @property string|null $user_id
 * @property string   $tipo_documento   FT|FR|FP|FA|NC|ND|RC|FRt
 * @property string   $serie
 * @property string|null $descricao
 * @property int|null $ano
 * @property int      $ultimo_numero
 * @property int      $digitos
 * @property bool     $ativa
 * @property bool     $padrao
 * @property bool     $valida_agt
 * @property string|null $observacoes
 */
class SerieFiscal extends TenantModel
{
    protected $table = 'series_fiscais';

    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'tipo_documento',
        'serie',
        'descricao',
        'ano',
        'ultimo_numero',
        'digitos',
        'ativa',
        'padrao',
        'valida_agt',
        'observacoes',
    ];

    protected $casts = [
        'ultimo_numero' => 'integer',
        'digitos'       => 'integer',
        'ativa'         => 'boolean',
        'padrao'        => 'boolean',
        'valida_agt'    => 'boolean',
        'ano'           => 'integer',
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
        });
    }

    /* =====================================================================
     | RELAÇÕES
     | ================================================================== */

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /* =====================================================================
     | SCOPES
     | ================================================================== */

    /** Séries activas */
    public function scopeAtivas($query)
    {
        return $query->where('ativa', true);
    }

    /** Série padrão para um tipo — usada pelo DocumentoFiscalService */
    public function scopePadrao($query)
    {
        return $query->where('padrao', true);
    }

    /** Filtra por tipo de documento */
    public function scopeDoTipo($query, string $tipo)
    {
        return $query->where('tipo_documento', $tipo);
    }

    /** Filtra por ano fiscal (ou sem ano definido) */
    public function scopeDoAno($query, ?int $ano = null)
    {
        $ano = $ano ?? now()->year;
        return $query->where(fn ($q) => $q->whereNull('ano')->orWhere('ano', $ano));
    }

    /* =====================================================================
     | ACESSORES
     | ================================================================== */

    /**
     * Formata o próximo número de documento sem incrementar.
     * O incremento real é feito pelo DocumentoFiscalService com lockForUpdate().
     */
    public function getProximoNumeroDocumentoAttribute(): string
    {
        return $this->serie . '-' . str_pad(
            $this->ultimo_numero + 1,
            $this->digitos,
            '0',
            STR_PAD_LEFT
        );
    }

    /**
     * Formata o último número emitido.
     */
    public function getUltimoNumeroDocumentoAttribute(): string
    {
        if ($this->ultimo_numero === 0) {
            return 'Nenhum emitido';
        }

        return $this->serie . '-' . str_pad(
            $this->ultimo_numero,
            $this->digitos,
            '0',
            STR_PAD_LEFT
        );
    }

    /**
     * Indica se a série requer assinatura RSA (AGT).
     * FP e RC são isentos conforme a especificação AGT.
     */
    public function getRequerAssinaturaAttribute(): bool
    {
        return $this->valida_agt;
    }

    /* =====================================================================
     | MÉTODOS DE VERIFICAÇÃO
     | ================================================================== */

    public function estaActiva(): bool
    {
        return $this->ativa;
    }

    public function ehPadrao(): bool
    {
        return $this->padrao;
    }

    public function validaAgt(): bool
    {
        return $this->valida_agt;
    }
}