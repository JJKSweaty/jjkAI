# Test the search_chunks PostgreSQL function directly
# This helps debug RPC call issues

$ErrorActionPreference = "Stop"

Write-Host "`n=== Testing search_chunks Function ===" -ForegroundColor Cyan

# Test 1: Check if function exists and what it returns
Write-Host "`n1. Calling search_chunks with simple query..." -ForegroundColor Yellow

$body = @{
    query = "document"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8787/api/chat/with-docs" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "SUCCESS! Got response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host "Details:" $_.ErrorDetails.Message
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
