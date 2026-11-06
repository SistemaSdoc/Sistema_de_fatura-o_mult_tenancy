<?php

namespace App\Services\PrintConnectors;

use Mike42\Escpos\PrintConnectors\PrintConnector;

class LprRawPrintConnector implements PrintConnector
{
    private string $queue;
    private string $buffer = '';

    public function __construct(string $queue)
    {
        $this->queue = $queue;
    }

    public function write($data): void
    {
        $this->buffer .= $data;
    }

    public function finalize(): void
    {
        if ($this->buffer === '') {
            return;
        }

        $tmp = tempnam(sys_get_temp_dir(), 'escpos_');
        file_put_contents($tmp, $this->buffer);
        $this->buffer = '';

        exec(
            'lpr -o raw -P ' . escapeshellarg($this->queue) . ' ' . escapeshellarg($tmp) . ' 2>&1',
            $out,
            $code
        );

        @unlink($tmp);

        if ($code !== 0) {
            throw new \RuntimeException(
                'lpr falhou (código ' . $code . '): ' . implode(' ', $out)
            );
        }
    }

    public function read($length): string
    {
        return '';
    }

    public function __destruct()
    {
        // Necessário para satisfazer a interface PrintConnector.
        // Não faz nada — o buffer é enviado no finalize().
    }
}