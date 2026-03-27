#!/usr/bin/env pwsh
# ADMIN PANEL - Quick Testing Script
# Run: ./test-admin-panel.ps1

Write-Host "🧪 TESTING ADMIN PANEL INCREMENTAL" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: TypeScript Compilation
Write-Host "Test 1: TypeScript Compilation..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript: PASS" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript: FAIL" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Build
Write-Host "Test 2: Build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build: PASS" -ForegroundColor Green
} else {
    Write-Host "❌ Build: FAIL" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Check files exist
Write-Host "Test 3: Checking files..." -ForegroundColor Yellow
$files = @(
    "app\admin\(operations)\layout.tsx",
    "app\admin\(operations)\page.tsx",
    "components\admin\shared\AdminSidebar.tsx",
    "components\admin\shared\StatusBadge.tsx",
    "components\admin\shared\EmptyState.tsx",
    "components\admin\operations\InboxVirtual.tsx",
    "components\admin\operations\InboxItemCard.tsx",
    "app\api\admin\inbox-action\route.ts"
)

$allExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file NOT FOUND" -ForegroundColor Red
        $allExist = $false
    }
}

if ($allExist) {
    Write-Host "✅ Files: PASS" -ForegroundColor Green
} else {
    Write-Host "❌ Files: FAIL" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Check legacy routes still exist
Write-Host "Test 4: Checking legacy routes..." -ForegroundColor Yellow
$legacyRoutes = @(
    "app\admin\businesses\page.tsx",
    "app\admin\applications\page.tsx",
    "app\admin\payments\page.tsx"
)

foreach ($route in $legacyRoutes) {
    if (Test-Path $route) {
        Write-Host "  ✅ $route (legacy OK)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $route (not found, may be expected)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ ALL TESTS PASSED!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. npm run dev" -ForegroundColor White
Write-Host "2. Navigate to http://localhost:3000/admin" -ForegroundColor White
Write-Host "3. Check ADMIN_TESTING_CHECKLIST.md for manual tests" -ForegroundColor White
Write-Host ""
Write-Host "Docs:" -ForegroundColor Cyan
Write-Host "- ADMIN_INCREMENTAL_IMPLEMENTATION.md (implementation guide)" -ForegroundColor White
Write-Host "- ADMIN_TESTING_CHECKLIST.md (80+ tests)" -ForegroundColor White
Write-Host "- ADMIN_IMPLEMENTATION_SUMMARY.md (summary)" -ForegroundColor White
Write-Host ""
