<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * Ponto de entrada da importação.
 * Mapeia cada folha do Excel para a sua classe de import correspondente.
 * Os nomes abaixo têm de bater certo com os nomes das folhas no ficheiro
 * (as que geramos: "Produtos" e "Serviços").
 */
class ProdutoServicoImport implements WithMultipleSheets
{
    public function __construct(
        public ProdutosSheetImport $produtosImport,
        public ServicosSheetImport $servicosImport,
    ) {}

    /**
     * As chaves têm de bater certo com os nomes das folhas no ficheiro
     * (as que geramos: "Produtos" e "Serviços").
     */
    public function sheets(): array
    {
        return [
            'Produtos' => $this->produtosImport,
            'Serviços' => $this->servicosImport,
        ];
    }
}