# Limpeza do projeto Faturaja
Write-Host "Iniciando limpeza..." -ForegroundColor Green

if (-not (Test-Path "package.json")) {
    Write-Host "ERRO: nao esta na pasta frontend" -ForegroundColor Red
    exit
}

Write-Host "OK" -ForegroundColor Green

# Remover framer-motion de EmpresasSection.tsx
if (Test-Path "app/components/EmpresasSection.tsx") {
    Write-Host "Limpando EmpresasSection.tsx..."
    $file = "app/components/EmpresasSection.tsx"
    $content = (Get-Content $file) -replace 'import.*framer-motion.*', ''
    $content = $content -replace '<motion\.', '<'
    $content = $content -replace '</motion\.', '</'
    $content = $content -replace 'whileHover.*', ''
    $content = $content -replace 'transition.*', ''
    $content = $content -replace 'initial.*', ''
    $content = $content -replace 'animate.*', ''
    Set-Content $file $content
    Write-Host "OK" -ForegroundColor Green
}

# Remover de ModalVisualizacao.tsx
if (Test-Path "app/components/ModalVisualizacao.tsx") {
    Write-Host "Limpando ModalVisualizacao.tsx..."
    $file = "app/components/ModalVisualizacao.tsx"
    $content = (Get-Content $file) -replace 'import.*framer-motion.*', ''
    $content = $content -replace '<AnimatePresence>', ''
    $content = $content -replace '</AnimatePresence>', ''
    $content = $content -replace '<motion\.', '<'
    $content = $content -replace '</motion\.', '</'
    $content = $content -replace 'initial.*', ''
    $content = $content -replace 'animate.*', ''
    $content = $content -replace 'exit.*', ''
    Set-Content $file $content
    Write-Host "OK" -ForegroundColor Green
}

# Remover de page.tsx
if (Test-Path "app/page.tsx") {
    Write-Host "Limpando app/page.tsx..."
    $file = "app/page.tsx"
    $content = (Get-Content $file) -replace 'import.*framer-motion.*', ''
    $content = $content -replace '<AnimatePresence>', ''
    $content = $content -replace '</AnimatePresence>', ''
    $content = $content -replace '<motion\.', '<'
    $content = $content -replace '</motion\.', '</'
    Set-Content $file $content
    Write-Host "OK" -ForegroundColor Green
}

# Remover de configuracoes
if (Test-Path "app/dashboard/configuracoes/page.tsx") {
    Write-Host "Limpando configuracoes/page.tsx..."
    $file = "app/dashboard/configuracoes/page.tsx"
    $content = (Get-Content $file) -replace 'import.*framer-motion.*', ''
    $content = $content -replace '<AnimatePresence>', ''
    $content = $content -replace '</AnimatePresence>', ''
    $content = $content -replace '<motion\.', '<'
    $content = $content -replace '</motion\.', '</'
    Set-Content $file $content
    Write-Host "OK" -ForegroundColor Green
}

# Corrigir Radix UI - badge.tsx
if (Test-Path "components/ui/badge.tsx") {
    Write-Host "Corrigindo badge.tsx..."
    $file = "components/ui/badge.tsx"
    $content = (Get-Content $file) -replace 'from "radix-ui"', 'from "@radix-ui/react-slot"'
    Set-Content $file $content
    Write-Host "OK" -ForegroundColor Green
}

# Corrigir progress.tsx
if (Test-Path "components/ui/progress.tsx") {
    Write-Host "Corrigindo progress.tsx..."
    $file = "components/ui/progress.tsx"
    $content = (Get-Content $file) -replace 'import.*radix-ui.*', 'import * as ProgressPrimitive from "@radix-ui/react-progress"'
    Set-Content $file $content
    Write-Host "OK" -ForegroundColor Green
}

# Corrigir select.tsx
if (Test-Path "components/ui/select.tsx") {
    Write-Host "Corrigindo select.tsx..."
    $file = "components/ui/select.tsx"
    $content = (Get-Content $file) -replace 'import.*radix-ui.*', 'import * as SelectPrimitive from "@radix-ui/react-select"'
    Set-Content $file $content
    Write-Host "OK" -ForegroundColor Green
}

# Corrigir switch.tsx
if (Test-Path "components/ui/switch.tsx") {
    Write-Host "Corrigindo switch.tsx..."
    $file = "components/ui/switch.tsx"
    $content = (Get-Content $file) -replace 'import.*radix-ui.*', 'import * as SwitchPrimitives from "@radix-ui/react-switch"'
    $content = $content -replace 'SwitchPrimitive', 'SwitchPrimitives'
    Set-Content $file $content
    Write-Host "OK" -ForegroundColor Green
}

# Corrigir tabs.tsx
if (Test-Path "components/ui/tabs.tsx") {
    Write-Host "Corrigindo tabs.tsx..."
    $file = "components/ui/tabs.tsx"
    $content = (Get-Content $file) -replace 'import.*radix-ui.*', 'import * as TabsPrimitive from "@radix-ui/react-tabs"'
    Set-Content $file $content
    Write-Host "OK" -ForegroundColor Green
}

# Remover recharts de relatorios
if (Test-Path "app/dashboard/relatorios/page.tsx") {
    Write-Host "Removendo recharts de relatorios/page.tsx..."
    $file = "app/dashboard/relatorios/page.tsx"
    $content = (Get-Content $file) -replace 'import.*recharts.*', ''
    Set-Content $file $content
    Write-Host "OK - substitua este arquivo depois" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "CONCLUIDO!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "1. npm install"
Write-Host "2. npm run build"