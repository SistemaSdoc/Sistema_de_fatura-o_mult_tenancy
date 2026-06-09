<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use App\Models\Empresa;
use App\Models\Tenant\Cliente;
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
     * Gera SAF-T para uma empresa específica (útil para comandos/filas).
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
     * Lógica principal de geração do SAF-T (versão angolana AO_1.01_01).
     */
    private function generateFullInternal(int $year, int $month, Empresa $empresa): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;

        // Forçar versão angolana
        $root = $dom->createElement('AuditFile');
        $root->setAttribute('xmlns', 'urn:OECD:StandardAuditFile-Tax:AO_1.01_01');
        $root->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
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
        $this->addSalesInvoices($dom, $sourceDocs, $year, $month, $empresa);
        $this->addPayments($dom, $sourceDocs, $year, $month);
        $this->addMovementOfGoods($dom, $sourceDocs, $year, $month);

        return $this->saveXml($dom, $year, $month, $empresa);
    }

    // ==================== HELPERS ====================

    protected function getCurrentEmpresa(): Empresa
    {
        $tenantId = Session::get('tenant_id');
        if (!$tenantId) throw new \Exception('Nenhum tenant identificado na sessão.');
        $empresa = Empresa::on('landlord')->find($tenantId);
        if (!$empresa) throw new \Exception('Empresa não encontrada.');
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
        $header = $dom->createElement('Header');
        $root->appendChild($header);

        $header->appendChild($dom->createElement('AuditFileVersion', '1.01_01'));
        $header->appendChild($dom->createElement('CompanyID', $empresa->nome));
        $header->appendChild($dom->createElement('TaxRegistrationNumber', $empresa->nif));
        $header->appendChild($dom->createElement('TaxAccountingBasis', $empresa->regime_fiscal === 'simplificado' ? 'F' : 'FT'));
        $header->appendChild($dom->createElement('FiscalYear', (string) $year));
        $header->appendChild($dom->createElement('TaxEntity', 'Global'));
        $header->appendChild($dom->createElement('ProductCompanyTaxID', $empresa->nif));
        $header->appendChild($dom->createElement('SoftwareValidationNumber', $empresa->software_validation_number ?? ''));
        $header->appendChild($dom->createElement('ProductID', 'FaturaJa/1.0'));
        $header->appendChild($dom->createElement('ProductVersion', '1.0.0'));
        $header->appendChild($dom->createElement('CompanyName', $empresa->nome));
        $header->appendChild($dom->createElement('BusinessName', $empresa->nome));

        // Endereço estruturado
        $companyAddr = $dom->createElement('CompanyAddress');
        $companyAddr->appendChild($dom->createElement('AddressDetail', $empresa->endereco ?? 'Desconhecido'));
        $companyAddr->appendChild($dom->createElement('City', $empresa->cidade ?? 'Luanda'));
        $companyAddr->appendChild($dom->createElement('Country', $empresa->pais ?? 'AO'));
        $header->appendChild($companyAddr);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));
        $header->appendChild($dom->createElement('StartDate', $startDate));
        $header->appendChild($dom->createElement('EndDate', $endDate));
        $header->appendChild($dom->createElement('CurrencyCode', $empresa->moeda ?? 'AOA'));
        $header->appendChild($dom->createElement('DateCreated', now()->format('Y-m-d\TH:i:s')));

        $software = $dom->createElement('Software');
        $software->appendChild($dom->createElement('SoftwareVersion', '1.0.0'));
        $software->appendChild($dom->createElement('SoftwareDescription', config('app.name', 'FaturaJa')));
        $header->appendChild($software);

        $header->appendChild($dom->createElement('Telephone', $empresa->telefone ?? ''));
        $header->appendChild($dom->createElement('Fax', $empresa->fax ?? ''));
        $header->appendChild($dom->createElement('Email', $empresa->email ?? ''));
        $header->appendChild($dom->createElement('Website', $empresa->website ?? ''));
    }

    // ==================== MASTER FILES ====================

    private function addCustomers(DOMDocument $dom, DOMElement $masterFiles): void
    {
        $customersNode = $dom->createElement('Customer');
        $masterFiles->appendChild($customersNode);

        $clientes = Cliente::where('status', 'ativo')->get();
        foreach ($clientes as $cliente) {
            $customer = $dom->createElement('Customer');
            $customersNode->appendChild($customer);

            $customer->appendChild($dom->createElement('CustomerID', (string) $cliente->id));
            $customer->appendChild($dom->createElement('AccountID', 'Desconhecido'));
            $customer->appendChild($dom->createElement('CustomerTaxID', $cliente->nif ?? ($cliente->nif === '999999990' ? '999999990' : '')));

            $billing = $dom->createElement('BillingAddress');
            $billing->appendChild($dom->createElement('BuildingNumber', ''));
            $billing->appendChild($dom->createElement('StreetName', ''));
            $billing->appendChild($dom->createElement('AddressDetail', $cliente->endereco ?? 'Desconhecido'));
            $billing->appendChild($dom->createElement('City', $cliente->cidade ?? 'Luanda'));
            $billing->appendChild($dom->createElement('PostalCode', $cliente->codigo_postal ?? ''));
            $billing->appendChild($dom->createElement('Country', $cliente->pais ?? 'AO'));
            $customer->appendChild($billing);

            $customer->appendChild($dom->createElement('CompanyName', $cliente->nome));
            $customer->appendChild($dom->createElement('Contact', $cliente->email ?? ''));
            $customer->appendChild($dom->createElement('Telephone', $cliente->telefone ?? ''));
            $customer->appendChild($dom->createElement('SelfBillingIndicator', '0'));
        }
    }

    private function addProducts(DOMDocument $dom, DOMElement $masterFiles): void
    {
        $productsNode = $dom->createElement('Product');
        $masterFiles->appendChild($productsNode);

        $produtos = Produto::where('status', 'ativo')->get();
        foreach ($produtos as $produto) {
            $product = $dom->createElement('Product');
            $productsNode->appendChild($product);

            // Usar código amigável se disponível, senão ID
            $productCode = !empty($produto->codigo) ? $produto->codigo : substr($produto->id, 0, 20);
            $product->appendChild($dom->createElement('ProductCode', $productCode));
            $product->appendChild($dom->createElement('ProductDescription', $produto->nome));
            $product->appendChild($dom->createElement('ProductType', $produto->tipo === 'servico' ? 'S' : 'P'));
            $product->appendChild($dom->createElement('UnitPrice', number_format($produto->preco_venda, 4, '.', '')));
            $taxCode = $this->getTaxCodeForProduct($produto);
            if ($taxCode) {
                $product->appendChild($dom->createElement('TaxCode', $taxCode));
            }
            if ($produto->categoria_id) {
                $product->appendChild($dom->createElement('ProductGroup', $produto->categoria->nome ?? 'Geral'));
            }
        }
    }

    private function addTaxTable(DOMDocument $dom, DOMElement $masterFiles): void
    {
        $taxTable = $dom->createElement('TaxTable');
        $masterFiles->appendChild($taxTable);

        // Taxas padrão Angola: 0%, 5%, 7%, 14%
        $taxas = [0, 5, 7, 14];

        foreach ($taxas as $taxa) {
            $entry = $dom->createElement('TaxTableEntry');
            $taxTable->appendChild($entry);
            $entry->appendChild($dom->createElement('TaxType', 'IVA'));

            $taxCode = $taxa === 0 ? 'ISE' : ($taxa === 14 ? 'NOR' : 'RED' . $taxa);
            $entry->appendChild($dom->createElement('TaxCode', $taxCode));
            $entry->appendChild($dom->createElement('Description', $taxa === 0 ? 'Isento' : "IVA a {$taxa}%"));
            $entry->appendChild($dom->createElement('TaxAmount', number_format($taxa, 2, '.', '')));
        }

        // Entrada NS (não sujeito)
        $entryNs = $dom->createElement('TaxTableEntry');
        $taxTable->appendChild($entryNs);
        $entryNs->appendChild($dom->createElement('TaxType', 'NS'));
        $entryNs->appendChild($dom->createElement('TaxCode', 'NS'));
        $entryNs->appendChild($dom->createElement('Description', 'Não sujeito'));
        $entryNs->appendChild($dom->createElement('TaxAmount', '0'));
    }

    private function getTaxCodeForProduct(Produto $produto): string
    {
        if ($produto->tipo === 'servico') {
            $taxa = (float) $produto->taxa_iva;
            if ($taxa == 0) return 'ISE';
            return ((int) $taxa === 14) ? 'NOR' : 'RED' . (int) $taxa;
        }
        $categoria = $produto->categoria;
        if ($categoria) {
            $taxa = (float) $categoria->taxa_iva;
            if ($taxa == 0) return 'ISE';
            return ((int) $taxa === 14) ? 'NOR' : 'RED' . (int) $taxa;
        }
        return 'ISE';
    }

    // ==================== SOURCE DOCUMENTS ====================

    private function addSalesInvoices(DOMDocument $dom, DOMElement $sourceDocs, int $year, int $month, Empresa $empresa): void
    {
        $invoicesNode = $dom->createElement('SalesInvoices');
        $sourceDocs->appendChild($invoicesNode);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));

        $documentos = DocumentoFiscal::whereIn('tipo_documento', [
            DocumentoFiscal::TIPO_FATURA,
            DocumentoFiscal::TIPO_FATURA_RECIBO,
            DocumentoFiscal::TIPO_NOTA_CREDITO,
            DocumentoFiscal::TIPO_NOTA_DEBITO,
        ])
            ->whereBetween('data_emissao', [$startDate, $endDate])
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->with(['itens.produto', 'cliente'])
            ->get();

        // Totais agregados (CORRIGIDO)
        $numeroEntradas = $documentos->count();
        $totalBase = 0;
        $totalTax = 0;
        $totalPayable = 0;
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($documentos as $doc) {
            $totalBase += (float) $doc->base_tributavel;
            $totalTax += (float) $doc->total_iva;
            $totalPayable += (float) $doc->total_liquido;

            // Débito para faturas de venda, Crédito para NC/ND
            if (in_array($doc->tipo_documento, [DocumentoFiscal::TIPO_NOTA_CREDITO, DocumentoFiscal::TIPO_NOTA_DEBITO])) {
                $totalCredit += (float) $doc->total_liquido;
            } else {
                $totalDebit += (float) $doc->total_liquido;
            }
        }

        $invoicesNode->appendChild($dom->createElement('NumberOfEntries', (string) $numeroEntradas));
        $invoicesNode->appendChild($dom->createElement('TotalBase', number_format($totalBase, 2, '.', '')));
        $invoicesNode->appendChild($dom->createElement('TotalTax', number_format($totalTax, 2, '.', '')));
        $invoicesNode->appendChild($dom->createElement('TotalPayable', number_format($totalPayable, 2, '.', '')));
        $invoicesNode->appendChild($dom->createElement('TotalDebit', number_format($totalDebit, 2, '.', '')));
        $invoicesNode->appendChild($dom->createElement('TotalCredit', number_format($totalCredit, 2, '.', '')));

        // Cada documento
        foreach ($documentos as $doc) {
            $invoice = $dom->createElement('Invoice');
            $invoicesNode->appendChild($invoice);

            $invoice->appendChild($dom->createElement('InvoiceNo', $doc->numero_documento));
            $invoice->appendChild($dom->createElement('InvoiceDate', $doc->data_emissao->format('Y-m-d')));
            $invoice->appendChild($dom->createElement('InvoiceType', $doc->tipo_documento));

            // DocumentStatus
            $docStatus = $dom->createElement('DocumentStatus');
            $docStatus->appendChild($dom->createElement('InvoiceStatus', 'N'));
            $docStatus->appendChild($dom->createElement('InvoiceStatusDate', $doc->created_at->format('Y-m-d\TH:i:s')));
            $docStatus->appendChild($dom->createElement('SourceID', '1'));
            $docStatus->appendChild($dom->createElement('SourceBilling', 'P'));
            $invoice->appendChild($docStatus);

            // Hash e HashControl
            $hash = $doc->hash_fiscal ?? hash('sha256', $doc->numero_documento . $doc->data_emissao);
            $invoice->appendChild($dom->createElement('Hash', $hash));
            $invoice->appendChild($dom->createElement('HashControl', (string) strlen($hash))); // CORRIGIDO

            // Period
            $invoice->appendChild($dom->createElement('Period', (string) $month));

            // SpecialRegimes
            $special = $dom->createElement('SpecialRegimes');
            $special->appendChild($dom->createElement('SelfBillingIndicator', '0'));
            $special->appendChild($dom->createElement('CashVATSchemeIndicator', '0'));
            $special->appendChild($dom->createElement('ThirdPartiesBillingIndicator', '0'));
            $invoice->appendChild($special);

            $invoice->appendChild($dom->createElement('SourceID', '1'));
            $invoice->appendChild($dom->createElement('SystemEntryDate', $doc->created_at->format('Y-m-d\TH:i:s')));

            // Cliente (CORRIGIDO para consumidor final)
            if ($doc->cliente_id && $doc->cliente) {
                $customerId = (string) $doc->cliente_id;
                $customerTaxID = $doc->cliente->nif ?? '';
                $customerName  = $doc->cliente->nome ?? '';
                // Se NIF for vazio ou inválido, usar consumidor final
                if (empty($customerTaxID)) {
                    $customerTaxID = '999999990';
                }
            } else {
                $customerId = '0';
                $customerTaxID = '999999990';
                $customerName  = 'Consumidor Final';
            }

            $invoice->appendChild($dom->createElement('CustomerID', $customerId));
            $invoice->appendChild($dom->createElement('CustomerTaxID', $customerTaxID));
            $invoice->appendChild($dom->createElement('CustomerName', $customerName));

            // ShipTo / ShipFrom
            $this->addShipAddress($dom, $invoice, $doc, $empresa);

            // Linhas da fatura
            if ($doc->itens && $doc->itens->count() > 0) {
                foreach ($doc->itens as $item) {
                    $produto = $item->produto;
                    if (!$produto) continue;

                    $taxaIva = $produto->taxa_iva_efectiva ?? $item->taxa_iva ?? 5;
                    $taxCode = $this->getTaxCodeForProduct($produto);
                    $isIsento = ($taxaIva == 0);
                    $isNotaCredito = in_array($doc->tipo_documento, [DocumentoFiscal::TIPO_NOTA_CREDITO, DocumentoFiscal::TIPO_NOTA_DEBITO]);

                    $lineNode = $dom->createElement('Line');
                    $invoice->appendChild($lineNode);

                    $lineNode->appendChild($dom->createElement('LineNumber', (string) ($item->ordem ?? 1)));

                    $productCode = !empty($produto->codigo) ? $produto->codigo : substr($produto->id, 0, 20);
                    $lineNode->appendChild($dom->createElement('ProductCode', $productCode));
                    $lineNode->appendChild($dom->createElement('ProductDescription', $produto->nome));
                    $lineNode->appendChild($dom->createElement('Quantity', number_format($item->quantidade, 4, '.', '')));
                    $lineNode->appendChild($dom->createElement('UnitOfMeasure', 'UN'));
                    $lineNode->appendChild($dom->createElement('UnitPrice', number_format($item->preco_unitario, 4, '.', '')));
                    $lineNode->appendChild($dom->createElement('TaxPointDate', $doc->data_emissao->format('Y-m-d')));
                    $lineNode->appendChild($dom->createElement('Description', $produto->nome));
                    $lineNode->appendChild($dom->createElement('TaxBase', number_format($item->base_tributavel, 4, '.', '')));

                    // Tax
                    $taxNode = $dom->createElement('Tax');
                    $taxNode->appendChild($dom->createElement('TaxType', 'IVA'));
                    $taxNode->appendChild($dom->createElement('TaxCountryRegion', 'AO'));
                    $taxNode->appendChild($dom->createElement('TaxCode', $taxCode));
                    $taxNode->appendChild($dom->createElement('TaxPercentage', number_format($taxaIva, 2, '.', '')));
                    $lineNode->appendChild($taxNode);

                    if ($isIsento && $item->codigo_isencao) {
                        $lineNode->appendChild($dom->createElement('TaxExemptionReason', $item->motivo_isencao ?? 'Não sujeito / não tributado'));
                        $lineNode->appendChild($dom->createElement('TaxExemptionCode', $item->codigo_isencao));
                    }

                    // Valor: DebitAmount para NC/ND, CreditAmount para os restantes
                    if ($isNotaCredito) {
                        $lineNode->appendChild($dom->createElement('DebitAmount', number_format($item->total_linha, 2, '.', '')));
                    } else {
                        $lineNode->appendChild($dom->createElement('CreditAmount', number_format($item->total_linha, 2, '.', '')));
                    }

                    // Referência ao documento original (para notas de crédito/débito)
                    if ($doc->tipo_documento == DocumentoFiscal::TIPO_NOTA_CREDITO || $doc->tipo_documento == DocumentoFiscal::TIPO_NOTA_DEBITO) {
                        if (!empty($doc->documento_origem_numero)) {
                            $references = $dom->createElement('References');
                            $ref = $dom->createElement('Reference', $doc->documento_origem_numero);
                            $references->appendChild($ref);
                            if (!empty($doc->motivo)) {
                                $references->appendChild($dom->createElement('Reason', $doc->motivo));
                            }
                            $lineNode->appendChild($references);
                        }
                    }
                }
            } else {
                // Linha genérica de segurança (caso não haja itens)
                $lineNode = $dom->createElement('Line');
                $invoice->appendChild($lineNode);
                $lineNode->appendChild($dom->createElement('LineNumber', '1'));
                $lineNode->appendChild($dom->createElement('ProductCode', 'GERAL'));
                $lineNode->appendChild($dom->createElement('ProductDescription', 'Venda'));
                $lineNode->appendChild($dom->createElement('Quantity', '1.0000'));
                $lineNode->appendChild($dom->createElement('UnitOfMeasure', 'UN'));
                $lineNode->appendChild($dom->createElement('UnitPrice', number_format($doc->base_tributavel, 4, '.', '')));
                $lineNode->appendChild($dom->createElement('TaxPointDate', $doc->data_emissao->format('Y-m-d')));
                $lineNode->appendChild($dom->createElement('Description', 'Venda'));
                $lineNode->appendChild($dom->createElement('TaxBase', number_format($doc->base_tributavel, 4, '.', '')));
                $taxNode = $dom->createElement('Tax');
                $taxNode->appendChild($dom->createElement('TaxType', 'IVA'));
                $taxNode->appendChild($dom->createElement('TaxCountryRegion', 'AO'));
                $taxNode->appendChild($dom->createElement('TaxCode', 'NOR'));
                $taxNode->appendChild($dom->createElement('TaxPercentage', '0'));
                $lineNode->appendChild($taxNode);
                $lineNode->appendChild($dom->createElement('CreditAmount', number_format($doc->total_liquido, 2, '.', '')));
            }

            // DocumentTotals
            $docTotals = $dom->createElement('DocumentTotals');
            $invoice->appendChild($docTotals);

            $docTotals->appendChild($dom->createElement('TaxPayable', number_format($doc->total_iva, 2, '.', '')));
            $docTotals->appendChild($dom->createElement('NetTotal', number_format($doc->base_tributavel, 2, '.', '')));
            $docTotals->appendChild($dom->createElement('GrossTotal', number_format($doc->total_liquido, 2, '.', '')));

            // Para factura-recibo, incluir pagamento
            if (in_array($doc->tipo_documento, ['FR', 'RC']) && $doc->metodo_pagamento) {
                $payment = $dom->createElement('Payment');
                $payment->appendChild($dom->createElement('PaymentMechanism', $this->mapPaymentMethod($doc->metodo_pagamento)));
                $payment->appendChild($dom->createElement('PaymentAmount', number_format($doc->total_liquido, 2, '.', '')));
                $payment->appendChild($dom->createElement('PaymentDate', $doc->data_emissao->format('Y-m-d')));
                $docTotals->appendChild($payment);
            }
        }
    }

    private function addShipAddress(DOMDocument $dom, DOMElement $invoice, DocumentoFiscal $doc, Empresa $empresa): void
    {
        // ShipTo (endereço de entrega)
        
        $shipTo = $dom->createElement('ShipTo');
        $shipToAddr = $dom->createElement('Address');
        $shipToAddr->appendChild($dom->createElement('AddressDetail', $doc->cliente_endereco ?? 'Desconhecido'));
        $shipToAddr->appendChild($dom->createElement('City', $doc->cliente_cidade ?? 'Luanda'));
        $shipToAddr->appendChild($dom->createElement('Country', $doc->cliente_pais ?? 'AO'));
        $shipTo->appendChild($shipToAddr);
        $invoice->appendChild($shipTo);

        // ShipFrom (endereço da empresa)
        $shipFrom = $dom->createElement('ShipFrom');
        $shipFromAddr = $dom->createElement('Address');
        $shipFromAddr->appendChild($dom->createElement('AddressDetail', $empresa->endereco ?? 'Desconhecido'));
        $shipFromAddr->appendChild($dom->createElement('City', $empresa->cidade ?? 'Luanda'));
        $shipFromAddr->appendChild($dom->createElement('Country', $empresa->pais ?? 'AO'));
        $shipFrom->appendChild($shipFromAddr);
        $invoice->appendChild($shipFrom);
    }

    private function addPayments(DOMDocument $dom, DOMElement $sourceDocs, int $year, int $month): void
    {
        $paymentsNode = $dom->createElement('Payments');
        $sourceDocs->appendChild($paymentsNode);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));

        $recibos = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereBetween('data_emissao', [$startDate, $endDate])
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->with('documentoOrigem')
            ->get();

        foreach ($recibos as $recibo) {
            $payment = $dom->createElement('Payment');
            $paymentsNode->appendChild($payment);

            $payment->appendChild($dom->createElement('PaymentRefNo', $recibo->numero_documento));
            $payment->appendChild($dom->createElement('Period', (string) $month));
            $payment->appendChild($dom->createElement('TransactionDate', $recibo->data_emissao->format('Y-m-d')));
            $payment->appendChild($dom->createElement('PaymentType', 'RG'));
            $payment->appendChild($dom->createElement('SystemID', '1'));
            $payment->appendChild($dom->createElement('PaymentAmount', number_format($recibo->total_liquido, 2, '.', '')));

            $customerId = $recibo->cliente_id ? (string) $recibo->cliente_id : '0';
            $payment->appendChild($dom->createElement('CustomerID', $customerId));

            // DocumentStatus
            $docStatus = $dom->createElement('DocumentStatus');
            $docStatus->appendChild($dom->createElement('PaymentStatus', 'N'));
            $docStatus->appendChild($dom->createElement('PaymentStatusDate', $recibo->created_at->format('Y-m-d\TH:i:s')));
            $docStatus->appendChild($dom->createElement('SourceID', '1'));
            $docStatus->appendChild($dom->createElement('SourcePayment', 'P'));
            $payment->appendChild($docStatus);

            // PaymentMethod
            $paymentMethod = $dom->createElement('PaymentMethod');
            $paymentMethod->appendChild($dom->createElement('PaymentMechanism', $this->mapPaymentMethod($recibo->metodo_pagamento)));
            $paymentMethod->appendChild($dom->createElement('PaymentAmount', number_format($recibo->total_liquido, 2, '.', '')));
            $paymentMethod->appendChild($dom->createElement('PaymentDate', $recibo->data_emissao->format('Y-m-d')));
            $payment->appendChild($paymentMethod);

            $payment->appendChild($dom->createElement('SourceID', '1'));
            $payment->appendChild($dom->createElement('SystemEntryDate', $recibo->created_at->format('Y-m-d\TH:i:s')));

            // Linha com referência à fatura original
            if ($recibo->documentoOrigem) {
                $line = $dom->createElement('Line');
                $line->appendChild($dom->createElement('LineNumber', '1'));

                $sourceDoc = $dom->createElement('SourceDocumentID');
                $sourceDoc->appendChild($dom->createElement('OriginatingON', $recibo->documentoOrigem->numero_documento));
                $sourceDoc->appendChild($dom->createElement('InvoiceDate', $recibo->documentoOrigem->data_emissao->format('Y-m-d')));
                $line->appendChild($sourceDoc);

                $line->appendChild($dom->createElement('SettlementAmount', '0.00'));
                $line->appendChild($dom->createElement('CreditAmount', number_format($recibo->total_liquido, 2, '.', '')));

                $tax = $dom->createElement('Tax');
                $tax->appendChild($dom->createElement('TaxType', 'IVA'));
                $tax->appendChild($dom->createElement('TaxCountryRegion', 'AO'));
                $tax->appendChild($dom->createElement('TaxCode', 'NOR'));
                $tax->appendChild($dom->createElement('TaxPercentage', '0'));
                $tax->appendChild($dom->createElement('TaxAmount', '0'));
                $line->appendChild($tax);

                $payment->appendChild($line);
            }

            // DocumentTotals
            $totals = $dom->createElement('DocumentTotals');
            $totals->appendChild($dom->createElement('TaxPayable', '0.00'));
            $totals->appendChild($dom->createElement('NetTotal', number_format($recibo->total_liquido, 2, '.', '')));
            $totals->appendChild($dom->createElement('GrossTotal', number_format($recibo->total_liquido, 2, '.', '')));
            $payment->appendChild($totals);

            // Settlement
            $settlement = $dom->createElement('Settlement');
            $settlement->appendChild($dom->createElement('SettlementAmount', '0.00'));
            $payment->appendChild($settlement);
        }
    }

    private function addMovementOfGoods(DOMDocument $dom, DOMElement $sourceDocs, int $year, int $month): void
    {
        $movNode = $dom->createElement('MovementOfGoods');
        $sourceDocs->appendChild($movNode);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));

        $movimentos = MovimentoStock::whereBetween('created_at', [$startDate, $endDate])
            ->with('produto')
            ->get();

        foreach ($movimentos as $mov) {
            $produto = $mov->produto;
            $productCode = $produto ? ($produto->codigo ?? $produto->id) : $mov->produto_id;

            // Preço unitário: usar custo_medio se disponível
            $unitPrice = $mov->custo_medio ?? $produto->preco_venda ?? $produto->preco_compra ?? 0;

            // Taxa IVA do produto
            $taxaIva = $produto->taxa_iva_efectiva ?? ($produto->categoria->taxa_iva ?? 5);

            // Valor base (custo do produto * quantidade)
            $quantidade = abs($mov->quantidade);
            $taxBase = $unitPrice * $quantidade;
            $settlementAmount = $taxBase * (1 + ($taxaIva / 100));

            $stockMovement = $dom->createElement('StockMovement');
            $movNode->appendChild($stockMovement);

            // DocumentNumber: usar referência do movimento ou número do documento associado
            $docNumber = !empty($mov->referencia) ? $mov->referencia : 'MOV-' . $mov->id;
            $stockMovement->appendChild($dom->createElement('DocumentNumber', $docNumber));
            $stockMovement->appendChild($dom->createElement('Date', $mov->created_at->format('Y-m-d')));
            $stockMovement->appendChild($dom->createElement('ProductCode', $productCode));
            $stockMovement->appendChild($dom->createElement('Quantity', ($mov->tipo === 'saida' ? '-' : '') . number_format($quantidade, 4, '.', '')));
            $stockMovement->appendChild($dom->createElement('UnitPrice', number_format($unitPrice, 4, '.', '')));
            $stockMovement->appendChild($dom->createElement('TaxBase', number_format($taxBase, 4, '.', '')));
            $stockMovement->appendChild($dom->createElement('TaxPercentage', number_format($taxaIva, 2, '.', '')));
            $stockMovement->appendChild($dom->createElement('SettlementAmount', number_format($settlementAmount, 4, '.', '')));
        }
    }

    private function mapPaymentMethod(?string $metodo): string
    {
        return match ($metodo) {
            'dinheiro' => 'NU',
            'transferencia' => 'NU',
            'multibanco' => 'NU',
            'cartao' => 'NU',
            default => 'NU',
        };
    }
}
