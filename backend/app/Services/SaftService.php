<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use App\Models\Empresa;
use App\Models\Tenant\Cliente;
use App\Models\Tenant\Categoria;
use App\Models\Tenant\Produto;
use App\Models\Tenant\DocumentoFiscal;
use App\Models\Tenant\MovimentoStock;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

class SaftService
{
    /**
     * Gera SAF-T para a empresa actual (baseado na sessão) – para uso via API.
     */
    public function generateFull(int $year, int $month): string
    {
        $empresa = $this->getCurrentEmpresa();
        return $this->generateFullInternal($year, $month, $empresa);
    }

    /**
     * Gera SAF-T para uma empresa específica.
     */
    public function generateForEmpresa(Empresa $empresa, int $year, int $month): string
    {
        config(['database.connections.tenant.database' => $empresa->db_name]);
        DB::purge('tenant');
        DB::reconnect('tenant');
        config(['database.default' => 'tenant']);

        return $this->generateFullInternal($year, $month, $empresa);
    }

    /**
     * Lógica principal de geração do SAF-T.
     */
    private function generateFullInternal(int $year, int $month, Empresa $empresa): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;

        $root = $dom->createElement('AuditFile');
        $root->setAttribute('xmlns', 'urn:OECD:StandardAuditFile-Tax:PT_1.04_01');
        $dom->appendChild($root);

        // 1. Header
        $this->addHeader($dom, $root, $year, $month, $empresa);

        // 2. MasterFiles
        $masterFiles = $dom->createElement('MasterFiles');
        $root->appendChild($masterFiles);
        $this->addCustomers($dom, $masterFiles);
        $this->addProducts($dom, $masterFiles);
        $this->addTaxTable($dom, $masterFiles);

        // 3. SourceDocuments
        $sourceDocs = $dom->createElement('SourceDocuments');
        $root->appendChild($sourceDocs);
        $this->addSalesInvoices($dom, $sourceDocs, $year, $month);
        $this->addPayments($dom, $sourceDocs, $year, $month);
        $this->addMovementOfGoods($dom, $sourceDocs, $year, $month);

        return $this->saveXml($dom, $year, $month, $empresa);
    }

    protected function getCurrentEmpresa(): Empresa
    {
        $tenantId = Session::get('tenant_id');
        if (!$tenantId) {
            throw new \Exception('Nenhum tenant identificado na sessão.');
        }

        $empresa = Empresa::on('landlord')->find($tenantId);
        if (!$empresa) {
            throw new \Exception('Empresa não encontrada.');
        }
        return $empresa;
    }

    private function saveXml(DOMDocument $dom, int $year, int $month, Empresa $empresa): string
    {
        $subdomain = $empresa->subdomain ?? $empresa->id;
        $filename = "saft_{$subdomain}_{$year}_{$month}.xml";
        $directory = "saft/{$subdomain}";

        Storage::disk('local')->makeDirectory($directory);
        $path = Storage::disk('local')->path("{$directory}/{$filename}");
        $dom->save($path);

        return $path;
    }

    // ==================== HEADER ====================
    private function addHeader(DOMDocument $dom, DOMElement $root, int $year, int $month, Empresa $empresa): void
    {
        $taxBasis = $empresa->getTaxAccountingBasis();

        $header = $dom->createElement('Header');
        $root->appendChild($header);

        // === CAMPOS COM TEXTO LIVRE (usar createTextNode) ===
        $this->appendTextNode($dom, $header, 'CompanyID', $empresa->nome);
        $header->appendChild($dom->createElement('TaxRegistrationNumber', $empresa->nif));
        $header->appendChild($dom->createElement('TaxAccountingBasis', $taxBasis));

        $this->appendTextNode($dom, $header, 'CompanyName', $empresa->nome);
        $this->appendTextNode($dom, $header, 'BusinessName', $empresa->nome);
        $this->appendTextNode($dom, $header, 'CompanyAddress', $empresa->endereco ?? '');

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate   = date('Y-m-t', strtotime($startDate));

        $header->appendChild($dom->createElement('StartDate', $startDate));
        $header->appendChild($dom->createElement('EndDate', $endDate));
        $header->appendChild($dom->createElement('CurrencyCode', $empresa->moeda ?? 'AOA'));
        $header->appendChild($dom->createElement('DateCreated', now()->format('Y-m-d\TH:i:s')));

        $software = $dom->createElement('Software');
        $header->appendChild($software);
        $software->appendChild($dom->createElement('SoftwareVersion', '1.0.0'));
        $this->appendTextNode($dom, $software, 'SoftwareDescription', config('app.name', 'ERP Multi-tenant'));
    }

    // ==================== HELPER PARA ESCAPAR TEXTO ====================
    private function appendTextNode(DOMDocument $dom, DOMElement $parent, string $tagName, string $value): void
    {
        $element = $dom->createElement($tagName);
        $element->appendChild($dom->createTextNode($value));
        $parent->appendChild($element);
    }

    // ==================== MASTER FILES ====================

    private function addCustomers(DOMDocument $dom, DOMElement $masterFiles): void
    {
        $customersNode = $dom->createElement('Customers');   // Corrigido: deve ser "Customers" (plural)
        $masterFiles->appendChild($customersNode);

        $clientes = Cliente::where('status', 'ativo')->get();

        foreach ($clientes as $cliente) {
            $customer = $dom->createElement('Customer');
            $customersNode->appendChild($customer);

            $customer->appendChild($dom->createElement('CustomerID', (string) $cliente->id));
            $customer->appendChild($dom->createElement('CustomerTaxID', $cliente->nif ?? ''));
            
            $this->appendTextNode($dom, $customer, 'CompanyName', $cliente->nome);
            $this->appendTextNode($dom, $customer, 'Contact', $cliente->email ?? '');
            $this->appendTextNode($dom, $customer, 'Address', $cliente->endereco ?? '');
            $this->appendTextNode($dom, $customer, 'Telephone', $cliente->telefone ?? '');
        }
    }

    private function addProducts(DOMDocument $dom, DOMElement $masterFiles): void
    {
        $productsNode = $dom->createElement('Products');   // Corrigido: plural
        $masterFiles->appendChild($productsNode);

        $produtos = Produto::where('status', 'ativo')->get();

        foreach ($produtos as $produto) {
            $product = $dom->createElement('Product');
            $productsNode->appendChild($product);

            $product->appendChild($dom->createElement('ProductCode', $produto->codigo ?? $produto->id));
            $this->appendTextNode($dom, $product, 'ProductDescription', $produto->nome);
            $product->appendChild($dom->createElement('ProductType', $produto->tipo === 'servico' ? 'S' : 'P'));
            $product->appendChild($dom->createElement('UnitPrice', number_format($produto->preco_venda, 2, '.', '')));

            $taxCode = $this->getTaxCodeForProduct($produto);
            if ($taxCode) {
                $product->appendChild($dom->createElement('TaxCode', $taxCode));
            }
        }
    }

    private function addTaxTable(DOMDocument $dom, DOMElement $masterFiles): void
    {
        $taxTable = $dom->createElement('TaxTable');
        $masterFiles->appendChild($taxTable);

        $categorias = Categoria::where('status', 'ativo')->get();
        $taxas = [];

        foreach ($categorias as $cat) {
            $taxa = (float) $cat->taxa_iva;
            $key = (string) $taxa;
            if (!isset($taxas[$key])) {
                $taxas[$key] = [
                    'taxa' => $taxa,
                    'sujeito_iva' => $cat->sujeito_iva,
                    'codigo_isencao' => $cat->codigo_isencao,
                ];
            }
        }

        foreach ($taxas as $taxaData) {
            $tax = $dom->createElement('Tax');
            $taxTable->appendChild($tax);

            $taxCode = 'IVA' . ($taxaData['taxa'] > 0 ? (string) $taxaData['taxa'] : 'ISENTO');
            $tax->appendChild($dom->createElement('TaxCode', $taxCode));
            $tax->appendChild($dom->createElement('TaxPercentage', number_format($taxaData['taxa'], 2, '.', '')));

            if (!$taxaData['sujeito_iva'] && $taxaData['codigo_isencao']) {
                $this->appendTextNode($dom, $tax, 'TaxExemptionReason', $taxaData['codigo_isencao']);
            }
        }
    }

    private function getTaxCodeForProduct(Produto $produto): ?string
    {
        if ($produto->tipo === 'servico') {
            $taxa = (float) $produto->taxa_iva;
            return 'IVA' . ($taxa > 0 ? (string) $taxa : 'ISENTO');
        }

        if ($produto->categoria_id) {
            $categoria = $produto->categoria;
            if ($categoria) {
                $taxa = (float) $categoria->taxa_iva;
                return 'IVA' . ($taxa > 0 ? (string) $taxa : 'ISENTO');
            }
        }
        return null;
    }

    // ==================== SOURCE DOCUMENTS ====================

    private function addSalesInvoices(DOMDocument $dom, DOMElement $sourceDocs, int $year, int $month): void
    {
        $invoicesNode = $dom->createElement('SalesInvoices');
        $sourceDocs->appendChild($invoicesNode);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate   = date('Y-m-t', strtotime($startDate));

        $documentos = DocumentoFiscal::whereIn('tipo_documento', [
            DocumentoFiscal::TIPO_FATURA,
            DocumentoFiscal::TIPO_FATURA_RECIBO,
            DocumentoFiscal::TIPO_NOTA_CREDITO,
            DocumentoFiscal::TIPO_NOTA_DEBITO,
        ])
        ->whereBetween('data_emissao', [$startDate, $endDate])
        ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
        ->with('itens.produto')
        ->get();

        foreach ($documentos as $doc) {
            $invoice = $dom->createElement('Invoice');
            $invoicesNode->appendChild($invoice);

            $invoice->appendChild($dom->createElement('InvoiceNo', $doc->numero_documento));
            $invoice->appendChild($dom->createElement('InvoiceDate', $doc->data_emissao->format('Y-m-d')));
            $invoice->appendChild($dom->createElement('InvoiceType', $doc->tipo_documento));

            $invoice->appendChild($dom->createElement('CustomerID', (string) $doc->cliente_id ?? ''));
            $invoice->appendChild($dom->createElement('CustomerTaxID', $doc->cliente_nif ?? ''));
            $this->appendTextNode($dom, $invoice, 'CustomerName', $doc->cliente_nome ?? '');

            foreach ($doc->itens as $item) {
                $produto = $item->produto;
                if (!$produto) continue;

                $taxaIva = $produto->taxa_iva_efectiva ?? $item->taxa_iva;

                $lineNode = $dom->createElement('Line');
                $invoice->appendChild($lineNode);

                $lineNode->appendChild($dom->createElement('LineNumber', (string) ($item->ordem ?? 1)));
                $lineNode->appendChild($dom->createElement('ProductCode', $produto->codigo ?? $produto->id));
                $this->appendTextNode($dom, $lineNode, 'ProductDescription', $produto->nome);
                $lineNode->appendChild($dom->createElement('Quantity', (string) $item->quantidade));
                $lineNode->appendChild($dom->createElement('UnitPrice', number_format($item->preco_unitario, 2, '.', '')));
                $lineNode->appendChild($dom->createElement('TaxBase', number_format($item->base_tributavel, 2, '.', '')));
                $lineNode->appendChild($dom->createElement('TaxPercentage', number_format($taxaIva, 2, '.', '')));
                $lineNode->appendChild($dom->createElement('SettlementAmount', number_format($item->total_linha, 2, '.', '')));
            }

            $invoice->appendChild($dom->createElement('DocumentTotal', number_format($doc->total_liquido, 2, '.', '')));
        }
    }

    private function addPayments(DOMDocument $dom, DOMElement $sourceDocs, int $year, int $month): void
    {
        $paymentsNode = $dom->createElement('Payments');
        $sourceDocs->appendChild($paymentsNode);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate   = date('Y-m-t', strtotime($startDate));

        $recibos = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereBetween('data_emissao', [$startDate, $endDate])
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->get();

        foreach ($recibos as $recibo) {
            $payment = $dom->createElement('Payment');
            $paymentsNode->appendChild($payment);

            $payment->appendChild($dom->createElement('PaymentRefNo', $recibo->numero_documento));
            $payment->appendChild($dom->createElement('PaymentDate', $recibo->data_emissao->format('Y-m-d')));
            $payment->appendChild($dom->createElement('PaymentType', $recibo->metodo_pagamento ?? ''));
            $payment->appendChild($dom->createElement('PaymentAmount', number_format($recibo->total_liquido, 2, '.', '')));
            $payment->appendChild($dom->createElement('CustomerID', (string) $recibo->cliente_id ?? ''));
        }
    }

    private function addMovementOfGoods(DOMDocument $dom, DOMElement $sourceDocs, int $year, int $month): void
    {
        $movNode = $dom->createElement('MovementOfGoods');
        $sourceDocs->appendChild($movNode);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate   = date('Y-m-t', strtotime($startDate));

        $movimentos = MovimentoStock::where('tipo', 'saida')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with('produto')
            ->get();

        foreach ($movimentos as $mov) {
            $produto = $mov->produto;
            $productCode = $produto ? ($produto->codigo ?? $produto->id) : $mov->produto_id;

            $unitPrice = $mov->custo_unitario;
            if ($unitPrice <= 0 && $produto) {
                $unitPrice = $produto->preco_venda ?? $produto->preco_compra ?? 0;
            }

            $stockMovement = $dom->createElement('StockMovement');
            $movNode->appendChild($stockMovement);

            $stockMovement->appendChild($dom->createElement('DocumentNumber', $mov->referencia ?? ''));
            $stockMovement->appendChild($dom->createElement('Date', $mov->created_at->format('Y-m-d')));
            $stockMovement->appendChild($dom->createElement('ProductCode', (string) $productCode));
            $stockMovement->appendChild($dom->createElement('Quantity', (string) $mov->quantidade));
            $stockMovement->appendChild($dom->createElement('UnitPrice', number_format($unitPrice, 2, '.', '')));
        }
    }
}