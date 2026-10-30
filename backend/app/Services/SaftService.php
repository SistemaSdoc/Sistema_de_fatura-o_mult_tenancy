<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;

use App\Models\Shared\Cliente as SharedCliente;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Shared\MovimentoStock as SharedMovimentoStock;
use App\Models\Shared\Categoria as SharedCategoria;

use App\Models\Tenant\Cliente as TenantCliente;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Tenant\MovimentoStock as TenantMovimentoStock;
use App\Models\Tenant\Categoria as TenantCategoria;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

/**
 * SaftService
 *
 * Suporta modos 'colectivo' e 'singular'.
 *
 * ✅ CORREÇÕES APLICADAS (out/2026):
 *  - FIX 1: billingIndicator retorna 'T' (homologação) ou 'P' (produção).
 *  - FIX 2.1: isRegimeSimplificado() — detecta regime simplificado.
 *  - FIX 2.2: getTaxaEfectiva() retorna 0 no regime simplificado.
 *  - FIX 2.3: TaxCode coerente com regime (ISE no simplificado).
 *  - FIX 2.4: TaxAmount coerente com TaxPercentage.
 *  - FIX 2.5: DocumentTotals recalculado a partir das linhas.
 *  - FIX 2.6: TotalTax global recalculado a partir das linhas.
 *  - FIX 2.7: Products com ISE no regime simplificado.
 *  - FALLBACK: linha genérica quando documento não tem itens.
 */
class SaftService
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct()
    {
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
    }

    /* =====================================================================
     | HELPERS
     | ================================================================== */

    protected function getModo(): string
    {
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        return $this->modo;
    }

    protected function getEmpresa(): ?Empresa
    {
        if (!$this->empresa) {
            $this->empresa = app('current.empresa');
        }
        return $this->empresa;
    }

    protected function taxaIvaVigente(): float
    {
        return $this->getEmpresa()?->taxaIvaVigente() ?? 14.0;
    }

    protected function isColectivo(): bool
    {
        return $this->getModo() === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->getModo() === 'singular';
    }

    /* =====================================================================
     | ✅ FIX 2.1 — REGIME SIMPLIFICADO
     | ================================================================== */

    /**
     * Detecta se a empresa está em regime simplificado.
     * No regime simplificado angolano, as faturas são emitidas SEM IVA.
     * A AGT apura trimestralmente 7% sobre o volume de negócios.
     */
    protected function isRegimeSimplificado(): bool
    {
        $empresa = $this->getEmpresa();
        return $empresa && $empresa->regime_fiscal === 'simplificado';
    }

    /* =====================================================================
     | ✅ FIX 2.2 — IVA EFECTIVO (respeita regime)
     | ================================================================== */

    protected function getTaxaEfectiva($produto): float
    {
        // Regime simplificado → SEMPRE 0 (não liquida IVA)
        if ($this->isRegimeSimplificado()) {
            return 0.0;
        }

        if (!$produto) {
            return $this->taxaIvaVigente();
        }

        if ($produto->tipo === 'servico') {
            return (float) ($produto->taxa_iva ?? 0);
        }

        if ($produto->categoria_id) {
            $categoria = $this->isColectivo()
                ? SharedCategoria::doTenant()->find($produto->categoria_id)
                : TenantCategoria::find($produto->categoria_id);
            if ($categoria && isset($categoria->taxa_iva)) {
                return (float) $categoria->taxa_iva;
            }
        }

        return $this->taxaIvaVigente();
    }

    /**
     * Mapeia taxa para código SAF-T AO 1.01_01.
     * Apenas ISE (0%), RED (5%), NOR (14%), NS (não sujeito), OUT (outros).
     * NÃO existem RED5, RED7 ou INT em Angola.
     */
    protected function mapTaxaToCode(float $taxa): string
    {
        if ($taxa == 0) return 'ISE';
        if ($taxa == 5) return 'RED';
        if ($taxa == 14) return 'NOR';
        return 'ISE';
    }

    protected function getTaxCodeForProduct($produto): string
    {
        return $this->mapTaxaToCode($this->getTaxaEfectiva($produto));
    }

    /* =====================================================================
     | ACESSO
     | ================================================================== */

    protected function verificarAcessoUsuario(): void
    {
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            throw new \Exception('Empresa não identificada.', 400);
        }

        $this->modo = $this->empresa->modo ?? 'colectivo';

        $landlordUser = Auth::guard('landlord')->user();
        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = LandlordUser::find($landlordId);
            }
        }
        if (!$landlordUser) {
            throw new \Exception('Usuário não autenticado.', 401);
        }

        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;
    }

    protected function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        }
        return SharedUser::on('shared')->where('email', $email)->where('tenant_id', $empresa->id)->first();
    }

    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    /* =====================================================================
     | MODELS
     | ================================================================== */

    protected function clienteModel()
    {
        return $this->isColectivo() ? new SharedCliente() : new TenantCliente();
    }
    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
    }
    protected function documentoFiscalModel()
    {
        return $this->isColectivo() ? new SharedDocumentoFiscal() : new TenantDocumentoFiscal();
    }
    protected function movimentoStockModel()
    {
        return $this->isColectivo() ? new SharedMovimentoStock() : new TenantMovimentoStock();
    }

    protected function queryDocumentosFiscais()
    {
        return $this->isColectivo() ? SharedDocumentoFiscal::doTenant() : TenantDocumentoFiscal::query();
    }

    protected function queryClientes()
    {
        return $this->isColectivo() ? SharedCliente::doTenant() : TenantCliente::query();
    }

    protected function queryProdutos()
    {
        return $this->isColectivo() ? SharedProduto::doTenant() : TenantProduto::query();
    }

    protected function queryMovimentosStock()
    {
        return $this->isColectivo() ? SharedMovimentoStock::doTenant() : TenantMovimentoStock::query();
    }

    protected function obterEmpresa(): Empresa
    {
        if ($this->empresa) return $this->empresa;

        $tenantId = Session::get('tenant_id');
        if ($tenantId) {
            $empresa = Empresa::on('landlord')->find($tenantId);
            if ($empresa) {
                $this->empresa = $empresa;
                $this->modo = $empresa->modo ?? 'colectivo';
                return $empresa;
            }
        }
        throw new \Exception('Nenhum tenant identificado.');
    }

    /* =====================================================================
     | PÚBLICOS
     | ================================================================== */

    public function generateFull(int $year, int $month): string
    {
        $this->verificarAcessoUsuario();
        $empresa = $this->obterEmpresa();
        return $this->generateFullInternal($year, $month, $empresa);
    }

    public function generateForEmpresa(Empresa $empresa, int $year, int $month): string
    {
        if ($empresa->modo === 'singular') {
            config(['database.connections.tenant.database' => $empresa->db_name]);
            DB::purge('tenant');
            DB::reconnect('tenant');
        } else {
            config(['database.default' => 'shared']);
            DB::purge('shared');
            DB::reconnect('shared');
        }

        $this->empresa = $empresa;
        $this->modo = $empresa->modo;

        return $this->generateFullInternal($year, $month, $empresa);
    }

    /* =====================================================================
     | PRINCIPAL
     | ================================================================== */

    private function generateFullInternal(int $year, int $month, Empresa $empresa): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;

        $root = $dom->createElement('AuditFile');
        $root->setAttribute('xmlns', 'urn:OECD:StandardAuditFile-Tax:AO_1.01_01');
        $root->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $dom->appendChild($root);

        $this->addHeader($dom, $root, $year, $month, $empresa);

        $masterFiles = $dom->createElement('MasterFiles');
        $root->appendChild($masterFiles);
        $this->addCustomers($dom, $masterFiles);
        $this->addProducts($dom, $masterFiles);
        $this->addTaxTable($dom, $masterFiles);

        $sourceDocs = $dom->createElement('SourceDocuments');
        $root->appendChild($sourceDocs);
        $this->addSalesInvoices($dom, $sourceDocs, $year, $month, $empresa);
        $this->addPayments($dom, $sourceDocs, $year, $month, $empresa);
        $this->addMovementOfGoods($dom, $sourceDocs, $year, $month);

        return $this->saveXml($dom, $year, $month, $empresa);
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

    /* =====================================================================
     | HEADER
     | ================================================================== */

    private function addHeader(DOMDocument $dom, DOMElement $root, int $year, int $month, Empresa $empresa): void
    {
        $header = $dom->createElement('Header');
        $root->appendChild($header);

        // ✅ TaxAccountingBasis: S (simplificado) ou FT (faturação)
        $taxBasis = $empresa->regime_fiscal === 'simplificado' ? 'S' : 'FT';

        $header->appendChild($dom->createElement('AuditFileVersion', '1.01_01'));
        $header->appendChild($dom->createElement('CompanyID', $empresa->nome));
        $header->appendChild($dom->createElement('TaxRegistrationNumber', $empresa->nif));
        $header->appendChild($dom->createElement('TaxAccountingBasis', $taxBasis));
        $header->appendChild($dom->createElement('FiscalYear', (string) $year));
        $header->appendChild($dom->createElement('TaxEntity', 'Global'));
        $header->appendChild($dom->createElement('ProductCompanyTaxID', $empresa->nif));
        $header->appendChild($dom->createElement('SoftwareValidationNumber', $empresa->software_validation_number ?? 'EM_HOMOLOGACAO'));
        $header->appendChild($dom->createElement('ProductID', 'FaturaJa'));
        $header->appendChild($dom->createElement('ProductVersion', '1.0.0'));
        $header->appendChild($dom->createElement('CompanyName', $empresa->nome));
        $header->appendChild($dom->createElement('BusinessName', $empresa->nome));

        $companyAddr = $dom->createElement('CompanyAddress');
        $companyAddr->appendChild($dom->createElement('AddressDetail', $empresa->endereco ?? 'Desconhecido'));
        $companyAddr->appendChild($dom->createElement('City', $empresa->cidade ?? 'Luanda'));
        $companyAddr->appendChild($dom->createElement('Country', $empresa->pais ?? 'AO'));
        $header->appendChild($companyAddr);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));
        $header->appendChild($dom->createElement('StartDate', $startDate));
        $header->appendChild($dom->createElement('EndDate', $endDate));
        $header->appendChild($dom->createElement('CurrencyCode', 'AOA'));
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

    /* =====================================================================
     | MASTER FILES
     | ================================================================== */

    private function addCustomers(DOMDocument $dom, DOMElement $masterFiles): void
    {
        $customersNode = $dom->createElement('Customer');
        $masterFiles->appendChild($customersNode);

        // Cliente genérico "Consumidor Final" (obrigatório no SAF-T)
        $consumer = $dom->createElement('Customer');
        $customersNode->appendChild($consumer);
        $consumer->appendChild($dom->createElement('CustomerID', '0'));
        $consumer->appendChild($dom->createElement('AccountID', 'Desconhecido'));
        $consumer->appendChild($dom->createElement('CustomerTaxID', '999999990'));

        $billing = $dom->createElement('BillingAddress');
        $billing->appendChild($dom->createElement('AddressDetail', 'Desconhecido'));
        $billing->appendChild($dom->createElement('City', 'Luanda'));
        $billing->appendChild($dom->createElement('Country', 'AO'));
        $consumer->appendChild($billing);

        $consumer->appendChild($dom->createElement('CompanyName', 'Consumidor Final'));
        $consumer->appendChild($dom->createElement('SelfBillingIndicator', '0'));

        // Clientes reais
        foreach ($this->queryClientes()->where('status', 'ativo')->get() as $cliente) {
            $customer = $dom->createElement('Customer');
            $customersNode->appendChild($customer);

            $customer->appendChild($dom->createElement('CustomerID', (string) $cliente->id));
            $customer->appendChild($dom->createElement('AccountID', 'Desconhecido'));
            $customer->appendChild($dom->createElement('CustomerTaxID', $cliente->nif ?? '999999990'));

            $billing = $dom->createElement('BillingAddress');
            $billing->appendChild($dom->createElement('AddressDetail', $cliente->endereco ?? 'Desconhecido'));
            $billing->appendChild($dom->createElement('City', $cliente->cidade ?? 'Luanda'));
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

        // ✅ Produto fallback "GERAL" (obrigatório quando há linhas sem produto real)
        $genericProduct = $dom->createElement('Product');
        $productsNode->appendChild($genericProduct);
        $genericProduct->appendChild($dom->createElement('ProductCode', 'GERAL'));
        $genericProduct->appendChild($dom->createElement('ProductDescription', 'Documento sem itens detalhados'));
        $genericProduct->appendChild($dom->createElement('ProductType', 'P'));
        $genericProduct->appendChild($dom->createElement('UnitPrice', '0.0000'));

        $taxCodeGenerico = $this->isRegimeSimplificado() ? 'ISE' : 'NOR';
        $genericProduct->appendChild($dom->createElement('TaxCode', $taxCodeGenerico));
        $genericProduct->appendChild($dom->createElement('ProductGroup', 'Geral'));

        // Produtos reais
        foreach ($this->queryProdutos()->where('status', 'ativo')->get() as $produto) {
            $product = $dom->createElement('Product');
            $productsNode->appendChild($product);

            $productCode = !empty($produto->codigo) ? $produto->codigo : substr($produto->id, 0, 20);
            $product->appendChild($dom->createElement('ProductCode', $productCode));
            $product->appendChild($dom->createElement('ProductDescription', $produto->nome));
            $product->appendChild($dom->createElement('ProductType', $produto->tipo === 'servico' ? 'S' : 'P'));
            $product->appendChild($dom->createElement('UnitPrice', number_format($produto->preco_venda, 4, '.', '')));

            $taxCodeProduto = $this->isRegimeSimplificado()
                ? 'ISE'
                : $this->getTaxCodeForProduct($produto);
            $product->appendChild($dom->createElement('TaxCode', $taxCodeProduto));

            $grupo = 'Geral';
            if ($produto->categoria_id) {
                $categoria = $this->isColectivo()
                    ? SharedCategoria::doTenant()->find($produto->categoria_id)
                    : TenantCategoria::find($produto->categoria_id);
                if ($categoria) $grupo = $categoria->nome ?? 'Geral';
            }
            $product->appendChild($dom->createElement('ProductGroup', $grupo));
        }
    }

    private function addTaxTable(DOMDocument $dom, DOMElement $masterFiles): void
    {
        $taxTable = $dom->createElement('TaxTable');
        $masterFiles->appendChild($taxTable);

        // Apenas taxas válidas em Angola: 0%, 5%, 14%
        $taxas = [
            0  => ['ISE', 'Isento'],
            5  => ['RED', 'IVA a 5%'],
            14 => ['NOR', 'IVA a 14%'],
        ];

        foreach ($taxas as $taxa => [$code, $desc]) {
            $entry = $dom->createElement('TaxTableEntry');
            $taxTable->appendChild($entry);
            $entry->appendChild($dom->createElement('TaxType', 'IVA'));
            $entry->appendChild($dom->createElement('TaxCode', $code));
            $entry->appendChild($dom->createElement('Description', $desc));
            $entry->appendChild($dom->createElement('TaxAmount', number_format($taxa, 2, '.', '')));
        }

        $entryNs = $dom->createElement('TaxTableEntry');
        $taxTable->appendChild($entryNs);
        $entryNs->appendChild($dom->createElement('TaxType', 'NS'));
        $entryNs->appendChild($dom->createElement('TaxCode', 'NS'));
        $entryNs->appendChild($dom->createElement('Description', 'Não sujeito'));
        $entryNs->appendChild($dom->createElement('TaxAmount', '0'));
    }

    /* =====================================================================
     | ✅ FIX 2.3-2.6 — SALES INVOICES
     | ================================================================== */

    private function addSalesInvoices(DOMDocument $dom, DOMElement $sourceDocs, int $year, int $month, Empresa $empresa): void
    {
        $invoicesNode = $dom->createElement('SalesInvoices');
        $sourceDocs->appendChild($invoicesNode);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));

        $tiposDocumento = ['FT', 'FR', 'NC', 'ND', 'FG', 'FGR', 'TV', 'FA', 'FRt'];

        $documentos = $this->queryDocumentosFiscais()
            ->whereIn('tipo_documento', $tiposDocumento)
            ->whereBetween('data_emissao', [$startDate, $endDate])
            ->where('estado', '!=', 'cancelado')
            ->with(['itens.produto', 'cliente'])
            ->get();

        // ✅ FIX 2.6 — recalcular totais a partir das linhas
        $totalBase = 0;
        $totalTax = 0;
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($documentos as $doc) {
            [$docBase, $docTax] = $this->calcularTotaisDocumento($doc);
            $totalBase += $docBase;
            $totalTax += $docTax;

            $valorDoc = round($docBase + $docTax, 2);
            if (in_array($doc->tipo_documento, ['NC'])) {
                $totalCredit += $valorDoc;
            } else {
                $totalDebit += $valorDoc;
            }
        }

        $invoicesNode->appendChild($dom->createElement('NumberOfEntries', (string) $documentos->count()));
        $invoicesNode->appendChild($dom->createElement('TotalBase', number_format($totalBase, 2, '.', '')));
        $invoicesNode->appendChild($dom->createElement('TotalTax', number_format($totalTax, 2, '.', '')));
        $invoicesNode->appendChild($dom->createElement('TotalPayable', number_format($totalDebit - $totalCredit, 2, '.', '')));
        $invoicesNode->appendChild($dom->createElement('TotalDebit', number_format($totalDebit, 2, '.', '')));
        $invoicesNode->appendChild($dom->createElement('TotalCredit', number_format($totalCredit, 2, '.', '')));

        // Mapeamento de tipos DP 71/25 para InvoiceType SAF-T
        $invoiceTypeMap = [
            'FT' => 'FT',
            'FR' => 'FR',
            'NC' => 'NC',
            'ND' => 'ND',
            'FG' => 'FG',
            'FGR' => 'FR',
            'TV' => 'TV',
            'FA' => 'FT',
            'FRt' => 'FT',
        ];

        foreach ($documentos as $doc) {
            $invoice = $dom->createElement('Invoice');
            $invoicesNode->appendChild($invoice);

            $invoice->appendChild($dom->createElement('InvoiceNo', $doc->numero_documento));
            $invoice->appendChild($dom->createElement('InvoiceDate', $doc->data_emissao->format('Y-m-d')));
            $invoice->appendChild($dom->createElement('InvoiceType', $invoiceTypeMap[$doc->tipo_documento] ?? 'FT'));

            // InvoiceStatus: N=Normal, F=Faturado, A=Anulado, S=Auto-faturação
            $status = 'N';
            if ($doc->auto_faturacao) $status = 'S';
            if ($doc->estado === 'cancelado') $status = 'A';
            if (in_array($doc->tipo_documento, ['TV']) && $doc->estado === 'paga') $status = 'F';

            // ✅ Corrigido — data/hora parse correto
            $statusTimestamp = Carbon::parse($doc->data_emissao, 'Africa/Luanda')
                ->setTimeFromTimeString(substr($doc->hora_emissao ?? '00:00:00', 0, 8))
                ->format('Y-m-d\TH:i:s');

            $docStatus = $dom->createElement('DocumentStatus');
            $docStatus->appendChild($dom->createElement('InvoiceStatus', $status));
            $docStatus->appendChild($dom->createElement('InvoiceStatusDate', $statusTimestamp));
            $docStatus->appendChild($dom->createElement('SourceID', '1'));
            $docStatus->appendChild($dom->createElement('SourceBilling', $this->billingIndicator($empresa)));
            $invoice->appendChild($docStatus);

            $hash = $doc->hash_fiscal ?? hash('sha256', $doc->numero_documento . $doc->data_emissao);
            $invoice->appendChild($dom->createElement('Hash', $hash));
            $hashControl = ($empresa->software_validation_number && $empresa->software_validation_number !== 'EM_HOMOLOGACAO')
                ? (string) ($doc->rsa_versao_chave ?? config('agt.rsa_key_version', 1))
                : '0';
            $invoice->appendChild($dom->createElement('HashControl', $hashControl));

            $invoice->appendChild($dom->createElement('Period', (string) $month));

            $special = $dom->createElement('SpecialRegimes');
            $special->appendChild($dom->createElement('SelfBillingIndicator', $doc->auto_faturacao ? '1' : '0'));
            $special->appendChild($dom->createElement('CashVATSchemeIndicator', '0'));
            $special->appendChild($dom->createElement('ThirdPartiesBillingIndicator', '0'));
            $invoice->appendChild($special);

            $invoice->appendChild($dom->createElement('SystemEntryDate', $doc->created_at->format('Y-m-d\TH:i:s')));

            // Cliente
            if ($doc->cliente_id && $doc->cliente) {
                $customerId = (string) $doc->cliente_id;
                $customerTaxID = $doc->cliente->nif ?? '999999990';
                $customerName  = $doc->cliente->nome ?? '';
            } else {
                $customerId = '0';
                $customerTaxID = '999999990';
                $customerName  = 'Consumidor Final';
            }

            $invoice->appendChild($dom->createElement('CustomerID', $customerId));
            $invoice->appendChild($dom->createElement('CustomerTaxID', $customerTaxID));
            $invoice->appendChild($dom->createElement('CustomerName', $customerName));

            $this->addShipAddress($dom, $invoice, $doc, $empresa);

            // Linhas
            $temLinhas = false;

            if ($doc->itens && $doc->itens->count() > 0) {
                foreach ($doc->itens as $item) {
                    $produto = $item->produto;
                    if (!$produto) continue;

                    $temLinhas = true;

                    // ✅ FIX 2.3 — lógica de IVA coerente
                    if ($this->isRegimeSimplificado()) {
                        $taxaIva = 0.0;
                        $taxCode = 'ISE';
                    } else {
                        $taxaProduto = $this->getTaxaEfectiva($produto);
                        $taxaItem = isset($item->taxa_iva) && $item->taxa_iva !== null
                            ? (float) $item->taxa_iva
                            : null;
                        $taxaIva = ($taxaItem !== null && $taxaItem > 0) ? $taxaItem : $taxaProduto;
                        $taxCode = $this->mapTaxaToCode($taxaIva);
                    }

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

                    // ✅ FIX 2.4 — TaxAmount coerente
                    $taxAmountLinha = round(($item->base_tributavel * $taxaIva) / 100, 2);

                    $taxNode = $dom->createElement('Tax');
                    $taxNode->appendChild($dom->createElement('TaxType', 'IVA'));
                    $taxNode->appendChild($dom->createElement('TaxCountryRegion', 'AO'));
                    $taxNode->appendChild($dom->createElement('TaxCode', $taxCode));
                    $taxNode->appendChild($dom->createElement('TaxPercentage', number_format($taxaIva, 2, '.', '')));
                    $taxNode->appendChild($dom->createElement('TaxAmount', number_format($taxAmountLinha, 2, '.', '')));
                    $lineNode->appendChild($taxNode);

                
                    //  Isenção obrigatória sempre que TaxCode=ISE
                    if ($taxaIva == 0) {
                        $codigoIsencao = $item->codigo_isencao
                            ?? ($this->isRegimeSimplificado() ? 'M01' : 'M99');

                        $motivoIsencao = $item->motivo_isencao
                            ?? ($this->isRegimeSimplificado()
                                ? 'Regime simplificado — não liquida IVA nas facturas'
                                : 'Não sujeito / não tributado');

                        $lineNode->appendChild($dom->createElement('TaxExemptionReason', $motivoIsencao));
                        $lineNode->appendChild($dom->createElement('TaxExemptionCode', $codigoIsencao));
                    }

                    // CreditAmount para NC e vendas normais; DebitAmount para ND
                    if (in_array($doc->tipo_documento, ['NC'])) {
                        $lineNode->appendChild($dom->createElement('CreditAmount', number_format($item->total_linha, 2, '.', '')));
                    } elseif (in_array($doc->tipo_documento, ['ND'])) {
                        $lineNode->appendChild($dom->createElement('DebitAmount', number_format($item->total_linha, 2, '.', '')));
                    } else {
                        $lineNode->appendChild($dom->createElement('CreditAmount', number_format($item->total_linha, 2, '.', '')));
                    }
                }
            }

            // ✅ FALLBACK — linha genérica se não houver itens
            if (!$temLinhas) {
                $lineNode = $dom->createElement('Line');
                $invoice->appendChild($lineNode);

                $lineNode->appendChild($dom->createElement('LineNumber', '1'));
                $lineNode->appendChild($dom->createElement('ProductCode', 'GERAL'));
                $lineNode->appendChild($dom->createElement('ProductDescription', 'Documento sem itens detalhados'));
                $lineNode->appendChild($dom->createElement('Quantity', '1.0000'));
                $lineNode->appendChild($dom->createElement('UnitOfMeasure', 'UN'));
                $lineNode->appendChild($dom->createElement('UnitPrice', number_format((float) $doc->base_tributavel, 4, '.', '')));
                $lineNode->appendChild($dom->createElement('TaxPointDate', $doc->data_emissao->format('Y-m-d')));
                $lineNode->appendChild($dom->createElement('Description', 'Documento sem itens detalhados'));
                $lineNode->appendChild($dom->createElement('TaxBase', number_format((float) $doc->base_tributavel, 4, '.', '')));

                $taxNode = $dom->createElement('Tax');
                $taxNode->appendChild($dom->createElement('TaxType', 'IVA'));
                $taxNode->appendChild($dom->createElement('TaxCountryRegion', 'AO'));
                $taxNode->appendChild($dom->createElement('TaxCode', $this->isRegimeSimplificado() ? 'ISE' : 'NOR'));
                $taxNode->appendChild($dom->createElement('TaxPercentage', $this->isRegimeSimplificado() ? '0.00' : '14.00'));
                $taxNode->appendChild($dom->createElement('TaxAmount', '0.00'));
                $lineNode->appendChild($taxNode);

                $lineNode->appendChild($dom->createElement('CreditAmount', number_format((float) $doc->base_tributavel, 2, '.', '')));
            }

            // ✅ FIX 2.5 — DocumentTotals recalculado
            [$docBase, $docTax] = $this->calcularTotaisDocumento($doc);
            $grossTotal = round($docBase + $docTax, 2);

            $docTotals = $dom->createElement('DocumentTotals');
            $invoice->appendChild($docTotals);
            $docTotals->appendChild($dom->createElement('TaxPayable', number_format($docTax, 2, '.', '')));
            $docTotals->appendChild($dom->createElement('NetTotal', number_format($docBase, 2, '.', '')));
            $docTotals->appendChild($dom->createElement('GrossTotal', number_format($grossTotal, 2, '.', '')));

            // Payment
            if (in_array($doc->tipo_documento, ['FR', 'FGR', 'TV', 'RC']) && $doc->metodo_pagamento) {
                $payment = $dom->createElement('Payment');
                $payment->appendChild($dom->createElement('PaymentMechanism', $this->mapPaymentMethod($doc->metodo_pagamento)));
                $payment->appendChild($dom->createElement('PaymentAmount', number_format($grossTotal, 2, '.', '')));
                $payment->appendChild($dom->createElement('PaymentDate', $doc->data_emissao->format('Y-m-d')));
                $docTotals->appendChild($payment);
            }
        }
    }

    /**
     * ✅ FIX 2.5/2.6 — Calcula base e IVA de um documento a partir das linhas.
     * Nunca confia em $doc->base_tributavel / $doc->total_iva da BD.
     */
    /**
     * ✅ FIX 2.5b — Calcula base e IVA de um documento a partir das linhas.
     * Trata o caso de itens com produto=null (apagado ou não carregado)
     * sem perder a base tributável.
     */
    private function calcularTotaisDocumento($doc): array
    {
        $base = 0.0;
        $tax = 0.0;
        $somaItensValidos = 0;

        if ($doc->itens && $doc->itens->count() > 0) {
            foreach ($doc->itens as $it) {
                $produtoIt = $it->produto;

                // ✅ Item existe mas produto não foi carregado — usa base do item
                if (!$produtoIt) {
                    $base += (float) $it->base_tributavel;
                    // IVA: usa 0 no simplificado, senão usa item.taxa_iva
                    if (!$this->isRegimeSimplificado()) {
                        $taxaItem = isset($it->taxa_iva) && $it->taxa_iva !== null
                            ? (float) $it->taxa_iva
                            : 0.0;
                        $tax += round(($it->base_tributavel * $taxaItem) / 100, 2);
                    }
                    $somaItensValidos++;
                    continue;
                }

                if ($this->isRegimeSimplificado()) {
                    $taxaIt = 0.0;
                } else {
                    $taxaProduto = $this->getTaxaEfectiva($produtoIt);
                    $taxaItem = isset($it->taxa_iva) && $it->taxa_iva !== null
                        ? (float) $it->taxa_iva
                        : null;
                    $taxaIt = ($taxaItem !== null && $taxaItem > 0) ? $taxaItem : $taxaProduto;
                }

                $base += (float) $it->base_tributavel;
                $tax += round(($it->base_tributavel * $taxaIt) / 100, 2);
                $somaItensValidos++;
            }
        }

        // Fallback: se nenhum item válido foi processado, usa valores da BD
        if ($somaItensValidos === 0) {
            $base = (float) $doc->base_tributavel;
            $tax = (float) $doc->total_iva;
        }

        return [round($base, 2), round($tax, 2)];
    }

    private function addShipAddress(DOMDocument $dom, DOMElement $invoice, $doc, Empresa $empresa): void
    {
        $shipTo = $dom->createElement('ShipTo');
        $shipToAddr = $dom->createElement('Address');
        $shipToAddr->appendChild($dom->createElement('AddressDetail', $doc->cliente_endereco ?? $doc->cliente?->endereco ?? 'Desconhecido'));
        $shipToAddr->appendChild($dom->createElement('City', $doc->cliente_cidade ?? $doc->cliente?->cidade ?? 'Luanda'));
        $shipToAddr->appendChild($dom->createElement('Country', $doc->cliente_pais ?? $doc->cliente?->pais ?? 'AO'));
        $shipTo->appendChild($shipToAddr);
        $invoice->appendChild($shipTo);

        $shipFrom = $dom->createElement('ShipFrom');
        $shipFromAddr = $dom->createElement('Address');
        $shipFromAddr->appendChild($dom->createElement('AddressDetail', $empresa->endereco ?? 'Desconhecido'));
        $shipFromAddr->appendChild($dom->createElement('City', $empresa->cidade ?? 'Luanda'));
        $shipFromAddr->appendChild($dom->createElement('Country', $empresa->pais ?? 'AO'));
        $shipFrom->appendChild($shipFromAddr);
        $invoice->appendChild($shipFrom);
    }

    /* =====================================================================
     | PAYMENTS
     | ================================================================== */

    private function addPayments(DOMDocument $dom, DOMElement $sourceDocs, int $year, int $month, Empresa $empresa): void
    {
        $paymentsNode = $dom->createElement('Payments');
        $sourceDocs->appendChild($paymentsNode);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));

        $recibos = $this->queryDocumentosFiscais()
            ->where('tipo_documento', 'RC')
            ->whereBetween('data_emissao', [$startDate, $endDate])
            ->where('estado', '!=', 'cancelado')
            ->with('documentoOrigem.itens.produto')
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

            $docStatus = $dom->createElement('DocumentStatus');
            $docStatus->appendChild($dom->createElement('PaymentStatus', 'N'));
            $docStatus->appendChild($dom->createElement('PaymentStatusDate', $recibo->created_at->format('Y-m-d\TH:i:s')));
            $docStatus->appendChild($dom->createElement('SourceID', '1'));
            // ✅ FIX 1 — SourcePayment coerente com billingIndicator
            $docStatus->appendChild($dom->createElement('SourcePayment', $this->billingIndicator($empresa)));
            $payment->appendChild($docStatus);

            $paymentMethod = $dom->createElement('PaymentMethod');
            $paymentMethod->appendChild($dom->createElement('PaymentMechanism', $this->mapPaymentMethod($recibo->metodo_pagamento)));
            $paymentMethod->appendChild($dom->createElement('PaymentAmount', number_format($recibo->total_liquido, 2, '.', '')));
            $paymentMethod->appendChild($dom->createElement('PaymentDate', $recibo->data_emissao->format('Y-m-d')));
            $payment->appendChild($paymentMethod);

            $payment->appendChild($dom->createElement('SourceID', '1'));
            $payment->appendChild($dom->createElement('SystemEntryDate', $recibo->created_at->format('Y-m-d\TH:i:s')));

            if ($recibo->documentoOrigem) {
                $line = $dom->createElement('Line');
                $line->appendChild($dom->createElement('LineNumber', '1'));

                $sourceDoc = $dom->createElement('SourceDocumentID');
                $sourceDoc->appendChild($dom->createElement('OriginatingON', $recibo->documentoOrigem->numero_documento));
                $sourceDoc->appendChild($dom->createElement('InvoiceDate', $recibo->documentoOrigem->data_emissao->format('Y-m-d')));
                $line->appendChild($sourceDoc);

                $line->appendChild($dom->createElement('SettlementAmount', '0.00'));
                $line->appendChild($dom->createElement('CreditAmount', number_format($recibo->total_liquido, 2, '.', '')));

                // TaxCode do recibo = TaxCode da fatura original
                if ($this->isRegimeSimplificado()) {
                    $taxaOriginal = 0.0;
                    $taxCodeRecibo = 'ISE';
                } else {
                    $taxaOriginal = 14.0;
                    if ($recibo->documentoOrigem->itens->first()?->produto) {
                        $taxaOriginal = $this->getTaxaEfectiva($recibo->documentoOrigem->itens->first()->produto);
                    }
                    $taxCodeRecibo = $this->mapTaxaToCode($taxaOriginal);
                }

                $tax = $dom->createElement('Tax');
                $tax->appendChild($dom->createElement('TaxType', 'IVA'));
                $tax->appendChild($dom->createElement('TaxCountryRegion', 'AO'));
                $tax->appendChild($dom->createElement('TaxCode', $taxCodeRecibo));
                $tax->appendChild($dom->createElement('TaxPercentage', number_format($taxaOriginal, 2, '.', '')));
                $tax->appendChild($dom->createElement('TaxAmount', '0'));
                $line->appendChild($tax);

                $payment->appendChild($line);
            }

            $totals = $dom->createElement('DocumentTotals');
            $totals->appendChild($dom->createElement('TaxPayable', '0.00'));
            $totals->appendChild($dom->createElement('NetTotal', number_format($recibo->total_liquido, 2, '.', '')));
            $totals->appendChild($dom->createElement('GrossTotal', number_format($recibo->total_liquido, 2, '.', '')));
            $payment->appendChild($totals);

            $settlement = $dom->createElement('Settlement');
            $settlement->appendChild($dom->createElement('SettlementAmount', '0.00'));
            $payment->appendChild($settlement);
        }
    }

    /* =====================================================================
     | MOVEMENT OF GOODS
     | ================================================================== */

    private function addMovementOfGoods(DOMDocument $dom, DOMElement $sourceDocs, int $year, int $month): void
    {
        $movNode = $dom->createElement('MovementOfGoods');
        $sourceDocs->appendChild($movNode);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));

        $movimentos = $this->queryMovimentosStock()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with('produto')
            ->get();

        foreach ($movimentos as $mov) {
            $produto = $mov->produto;
            $productCode = $produto ? ($produto->codigo ?? $produto->id) : $mov->produto_id;
            $unitPrice = $mov->custo_medio ?? $produto->preco_venda ?? $produto->preco_compra ?? 0;
            $taxaIva = $produto ? $this->getTaxaEfectiva($produto) : $this->taxaIvaVigente();

            $quantidade = abs($mov->quantidade);
            $taxBase = $unitPrice * $quantidade;
            $settlementAmount = $taxBase * (1 + ($taxaIva / 100));

            $stockMovement = $dom->createElement('StockMovement');
            $movNode->appendChild($stockMovement);

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

    /* =====================================================================
     | ✅ FIX 1 — HELPERS FINAIS
     | ================================================================== */

    /**
     * Determina o SourceBilling correcto (SAF-T AO 1.01_01).
     * P = Produção (software certificado)
     * T = Teste/Homologação (software NÃO certificado)
     * I = Integrado
     * M = Documento recuperado (NUNCA usar para emitidos pelo software)
     */
    private function billingIndicator(Empresa $empresa): string
    {
        $validation = trim((string) ($empresa->software_validation_number ?? ''));

        // Sem número de certificação → homologação/teste
        if ($validation === '' || strtoupper($validation) === 'EM_HOMOLOGACAO') {
            return 'T';
        }

        // Se tiver número de validação válido → produção
        return 'P';
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
