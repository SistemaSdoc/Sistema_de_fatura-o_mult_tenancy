<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * SerieFiscal - Model para séries fiscais (modo singular)
 * 
 * Banco: tenant (empresa_xxxxx)
 * Tabela: series_fiscais
 * 
 * Formato do número: {TIPO} {SERIE}/{ANO}/{NUMERO}
 * Exemplo: FR LOJA1/2026/0542
 */
class SerieFiscal extends Model
{
    protected $connection = 'tenant';
    protected $table = 'series_fiscais';

    public $incrementing = false;
    protected $keyType = 'string';

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
        'ativa' => 'boolean',
        'padrao' => 'boolean',
        'valida_agt' => 'boolean',
        'ultimo_numero' => 'integer',
        'digitos' => 'integer',
        'ano' => 'integer',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Scope para séries ativas
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativa', true);
    }

    /**
     * Scope para séries padrão
     */
    public function scopePadrao($query)
    {
        return $query->where('padrao', true);
    }

    /**
     * Scope para um tipo de documento específico
     */
    public function scopePorTipo($query, string $tipo)
    {
        return $query->where('tipo_documento', $tipo);
    }

    /**
     * Scope para um ano específico
     */
    public function scopePorAno($query, int $ano)
    {
        return $query->where('ano', $ano);
    }

    /**
     * Gera o próximo número da série
     */
    public function getProximoNumero(): int
    {
        return $this->ultimo_numero + 1;
    }

    /**
     * Gera o número do documento formatado
     * Exemplo: FR LOJA1/2026/0001
     */
    public function gerarNumeroDocumento(): string
    {
        $proximo = $this->getProximoNumero();
        $ano = $this->ano ?? date('Y');
        $digitos = $this->digitos ?? 4;
        $numeroFormatado = str_pad($proximo, $digitos, '0', STR_PAD_LEFT);
        
        return $this->tipo_documento . ' ' . $this->serie . '/' . $ano . '/' . $numeroFormatado;
    }

    /**
     * Incrementa e retorna o próximo número
     */
    public function incrementarNumero(): int
    {
        $this->ultimo_numero = $this->ultimo_numero + 1;
        $this->save();
        return $this->ultimo_numero;
    }

    /**
     * Relação com o utilizador que criou
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Verifica se a série é válida para o ano atual
     */
    public function isValidaParaAno(int $ano): bool
    {
        if ($this->ano === null) {
            return true;
        }
        return $this->ano === $ano;
    }
}