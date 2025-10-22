# Simple Document Upload Test (Works with any PowerShell version)

Write-Host "🧪 Testing JJK.AI Document Processing" -ForegroundColor Cyan
Write-Host ""

# Test 1: Upload test document
Write-Host "📤 Uploading test-document.md..." -ForegroundColor Yellow

try {
    # Create multipart form data manually
    $boundary = [System.Guid]::NewGuid().ToString()
    $filePath = "test-document.md"
    
    if (-not (Test-Path $filePath)) {
        Write-Host "❌ Error: test-document.md not found" -ForegroundColor Red
        exit 1
    }
    
    $fileContent = [System.IO.File]::ReadAllBytes($filePath)
    $fileName = [System.IO.Path]::GetFileName($filePath)
    
    # Build multipart body
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: text/markdown",
        "",
        [System.Text.Encoding]::UTF8.GetString($fileContent),
        "--$boundary--"
    )
    
    $body = $bodyLines -join "`r`n"
    
    $response = Invoke-WebRequest -Uri "http://localhost:8787/api/documents/upload" `
        -Method Post `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $body
    
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Upload successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📄 Document Details:" -ForegroundColor Cyan
    Write-Host "   ID: $($result.document.id)"
    Write-Host "   Title: $($result.document.title)"
    Write-Host "   Filename: $($result.document.filename)"
    Write-Host "   MIME Type: $($result.document.mime)"
    Write-Host "   Blocks: $($result.document.blocks)"
    Write-Host "   Chunks: $($result.document.chunks)"
    Write-Host "   Status: $($result.document.status)"
    Write-Host ""
    
    $docId = $result.document.id
    
    # Test 2: List documents
    Write-Host "📋 Listing all documents..." -ForegroundColor Yellow
    $listResponse = Invoke-WebRequest -Uri "http://localhost:8787/api/documents" -Method Get
    $docs = ($listResponse.Content | ConvertFrom-Json).documents
    Write-Host "✅ Found $($docs.Count) document(s)" -ForegroundColor Green
    Write-Host ""
    
    # Test 3: Get document details
    Write-Host "🔍 Getting document details..." -ForegroundColor Yellow
    $detailResponse = Invoke-WebRequest -Uri "http://localhost:8787/api/documents/$docId" -Method Get
    $doc = ($detailResponse.Content | ConvertFrom-Json).document
    Write-Host "✅ Retrieved: $($doc.title)" -ForegroundColor Green
    Write-Host ""
    
    # Test 4: Delete document
    Write-Host "🗑️  Deleting document..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "http://localhost:8787/api/documents/$docId" -Method Delete | Out-Null
    Write-Host "✅ Document deleted" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
