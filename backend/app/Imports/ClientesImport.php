<?php
// app/Imports/ClientesImport.php

namespace App\Imports;

use App\Models\Shared\Cliente as SharedCliente;
use App\Models\Tenant\Cliente as TenantCliente;
use App\Services\ClienteNormalizer;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class ClientesImport implements ToCollection, WithHeadingRow, WithBatchInserts, WithChunkReading
{
    protected array $paisesValidos = ['AO','PT','BR','CV','MZ','GW','ST','US','GB','FR','DE','ES'];

    public array $sucesso = [];
    public array $erros = [];

    public function __construct(
        protected bool $isColectivo,
        protected ?string $tenantId   // ← era ?int, agora ?string
    ) {}

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            $linha = $index + 2; // +2 porque a linha 1 é cabeçalho e o índice começa em 0

            // Pula linhas totalmente vazias
            if (empty($row['nome']) && empty($row['tipo'])) {
                continue;
            }

            try {
                $dados = $this->validarLinha($row, $linha);
                $this->criarCliente($dados);
                $this->sucesso[] = $linha;
            } catch (\Throwable $e) {
                $this->erros[] = [
                    'linha' => $linha,
                    'nome' => $row['nome'] ?? null,
                    'erro' => $e->getMessage(),
                ];
            }
        }
    }

    protected function validarLinha($row, int $linha): array
    {
        $nome = trim((string) ($row['nome'] ?? ''));
        $tipo = trim((string) ($row['tipo'] ?? ''));

        if ($nome === '') {
            throw new \Exception('Campo "nome" é obrigatório');
        }
        if (!in_array($tipo, ['consumidor_final', 'empresa'])) {
            throw new \Exception('Campo "tipo" inválido (use consumidor_final ou empresa)');
        }

        $isoPais = $row['iso_pais'] ?? null;
        $telefone = $row['telefone'] ?? null;

        if (!empty($telefone) && empty($isoPais)) {
            throw new \Exception('iso_pais é obrigatório quando telefone é preenchido');
        }
        if (!empty($isoPais) && !in_array(strtoupper($isoPais), $this->paisesValidos)) {
            throw new \Exception('iso_pais inválido: ' . $isoPais);
        }

        $email = $row['email'] ?? null;
        if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \Exception('Email inválido: ' . $email);
        }

        $status = $row['status'] ?? 'ativo';
        if (!in_array($status, ['ativo', 'inativo'])) {
            $status = 'ativo';
        }

        $nif = !empty($row['nif']) ? ClienteNormalizer::nif((string) $row['nif'], $tipo) : null;

        // Verifica duplicidade de NIF/email antes de tentar inserir
        if ($nif && $this->clienteExiste('nif', $nif)) {
            throw new \Exception("NIF já cadastrado: {$nif}");
        }
        if ($email && $this->clienteExiste('email', $email)) {
            throw new \Exception("Email já cadastrado: {$email}");
        }

        return [
            'nome' => $nome,
            'tipo' => $tipo,
            'nif' => $nif,
            'email' => $email,
            'telefone' => ClienteNormalizer::telefone($telefone, $isoPais),
            'endereco' => $row['endereco'] ?? null,
            'status' => $status,
            'data_registro' => !empty($row['data_registro'])
                ? \Carbon\Carbon::parse($row['data_registro'])
                : now(),
        ];
    }

    protected function clienteExiste(string $campo, string $valor): bool
    {
        if ($this->isColectivo) {
            return SharedCliente::where($campo, $valor)
                ->where('tenant_id', $this->tenantId)
                ->exists();
        }
        return TenantCliente::where($campo, $valor)->exists();
    }

    protected function criarCliente(array $dados): void
    {
        if ($this->isColectivo) {
            $dados['tenant_id'] = $this->tenantId;
            SharedCliente::create($dados);
        } else {
            TenantCliente::create($dados);
        }
    }

    public function batchSize(): int
    {
        return 100;
    }

    public function chunkSize(): int
    {
        return 100;
    }
}