<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use App\Models\Tenant\Cliente;
use App\Models\Tenant\Produto;
use Illuminate\Support\Facades\Storage;

class SaftService
{
    /**
     * Gera um ficheiro SAF-T com apenas o Header (para teste)
     */
    public function generateHeaderOnly(int $year, int $month): string
    {
        // Criar o documento XML
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;

        // Nó raiz com o namespace oficial da AT (Portugal/Angola usam o mesmo esquema)
        $root = $dom->createElement('AuditFile');
        $root->setAttribute('xmlns', 'urn:OECD:StandardAuditFile-Tax:PT_1.04_01');
        $dom->appendChild($root);

        // ========== HEADER ==========
        $header = $dom->createElement('Header');
        $root->appendChild($header);

        // Dados da empresa (vêm do config/saft.php)
        $companyName = config('saft.company.name');
        $taxNumber   = config('saft.company.tax_number');
        $address     = config('saft.company.address');
        $currency    = config('saft.currency');
        $taxBasis    = config('saft.tax_accounting_basis'); // 'FT' ou 'F'

        $header->appendChild($dom->createElement('CompanyID', $companyName));
        $header->appendChild($dom->createElement('TaxRegistrationNumber', $taxNumber));
        $header->appendChild($dom->createElement('TaxAccountingBasis', $taxBasis));
        $header->appendChild($dom->createElement('CompanyName', $companyName));
        $header->appendChild($dom->createElement('BusinessName', $companyName));
        $header->appendChild($dom->createElement('CompanyAddress', $address));

        // Período do relatório
        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate   = date('Y-m-t', strtotime($startDate));
        $header->appendChild($dom->createElement('StartDate', $startDate));
        $header->appendChild($dom->createElement('EndDate', $endDate));

        $header->appendChild($dom->createElement('CurrencyCode', $currency));
        $header->appendChild($dom->createElement('DateCreated', now()->format('Y-m-d\TH:i:s')));

        // Informação do software que gera o SAF-T
        $software = $dom->createElement('Software');
        $header->appendChild($software);
        $software->appendChild($dom->createElement('SoftwareVersion', '1.0.0'));
        $software->appendChild($dom->createElement('SoftwareDescription', 'Meu ERP Multi-tenant'));

        // Guardar o ficheiro
        $filename = "saft_header_{$year}_{$month}.xml";
        $path = Storage::disk('local')->path("saft/{$filename}");
        $dom->save($path);

        return $path;
    }
   // ou o seu modelo

   private function addHeader(DOMDocument $dom, DOMElement $root, int $year, int $month): void
   
{
    $header = $dom->createElement('Header');
    $root->appendChild($header);
    $header->appendChild($dom->createElement('CompanyID', config('saft.company.name')));
    $header->appendChild($dom->createElement('TaxRegistrationNumber', config('saft.company.tax_number')));
    $header->appendChild($dom->createElement('TaxAccountingBasis', config('saft.tax_accounting_basis')));
    $header->appendChild($dom->createElement('CompanyName', config('saft.company.name')));
    $header->appendChild($dom->createElement('BusinessName', config('saft.company.name')));
    $header->appendChild($dom->createElement('CompanyAddress', config('saft.company.address')));
    $startDate = sprintf('%04d-%02d-01', $year, $month);
    $endDate = date('Y-m-t', strtotime($startDate));
    $header->appendChild($dom->createElement('StartDate', $startDate));
    $header->appendChild($dom->createElement('EndDate', $endDate));
    $header->appendChild($dom->createElement('CurrencyCode', config('saft.currency')));
    $header->appendChild($dom->createElement('DateCreated', now()->format('Y-m-d\TH:i:s')));
    $software = $dom->createElement('Software');
    $header->appendChild($software);
    $software->appendChild($dom->createElement('SoftwareVersion', '1.0.0'));
    $software->appendChild($dom->createElement('SoftwareDescription', 'Meu ERP Multi-tenant'));
}

private function saveXml(DOMDocument $dom, int $year, int $month, string $suffix = ''): string
{
    $filename = "saft_{$year}_{$month}{$suffix}.xml";
    $directory = 'saft';
    Storage::disk('local')->makeDirectory($directory);
    $path = Storage::disk('local')->path("{$directory}/{$filename}");
    $dom->save($path);
    return $path;
}

public function generateFull(int $year, int $month): string
{
    $dom = new DOMDocument('1.0', 'UTF-8');
    $dom->formatOutput = true;
    $root = $dom->createElement('AuditFile');
    $root->setAttribute('xmlns', 'urn:OECD:StandardAuditFile-Tax:PT_1.04_01');
    $dom->appendChild($root);

    // Adicionar Header (código igual ao generateHeaderOnly)
    $this->addHeader($dom, $root, $year, $month);  // vamos extrair este método

    // MasterFiles
    $masterFiles = $dom->createElement('MasterFiles');
    $root->appendChild($masterFiles);

    // ---- Clientees ----
    $customersNode = $dom->createElement('Customer');
    $masterFiles->appendChild($customersNode);

    // Buscar clientes do tenant actual (assumindo que o modelo já tem scope)
    $clients = Cliente::all(); // ou Cliente::where('tenant_id', tenantId())->get()
    foreach ($clients as $client) {
        $customer = $dom->createElement('Customer');
        $customersNode->appendChild($customer);
        $customer->appendChild($dom->createElement('CustomerID', (string)$client->id));
        $customer->appendChild($dom->createElement('CustomerTaxID', $client->nif ?? $client->tax_number));
        $customer->appendChild($dom->createElement('CompanyName', $client->name));
        $customer->appendChild($dom->createElement('Contact', $client->email ?? ''));
        $customer->appendChild($dom->createElement('Address', $client->address ?? ''));
    }

    // Guardar ficheiro
    $path = $this->saveXml($dom, $year, $month);
    return $path;
}
}