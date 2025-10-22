# Test Document Upload - PowerShell Script

Write-Host "🧪 Testing JJK.AI Document Processing" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8787/api/documents"

# Test 1: Upload the test markdown file
Write-Host "📤 Test 1: Uploading test-document.md..." -ForegroundColor Yellow

$filePath = "test-document.md"
if (-not (Test-Path $filePath)) {
    Write-Host "❌ Error: test-document.md not found in current directory" -ForegroundColor Red
    Write-Host "   Please run this from the project root: claude-duo-web/" -ForegroundColor Red
    exit 1
}

try {
    $form = @{
        file = Get-Item -Path $filePath
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/upload" -Method Post -Form $form
    
    Write-Host "✅ Upload successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📄 Document Details:" -ForegroundColor Cyan
    Write-Host "   ID: $($response.document.id)"
    Write-Host "   Title: $($response.document.title)"
    Write-Host "   Filename: $($response.document.filename)"
    Write-Host "   MIME Type: $($response.document.mime)"
    Write-Host "   Blocks: $($response.document.blocks)"
    Write-Host "   Chunks: $($response.document.chunks)"
    Write-Host "   Status: $($response.document.status)"
    Write-Host ""
    
    $docId = $response.document.id
    
    # Test 2: List all documents
    Write-Host "📋 Test 2: Listing all documents..." -ForegroundColor Yellow
    $documents = Invoke-RestMethod -Uri $baseUrl -Method Get
    Write-Host "✅ Found $($documents.documents.Count) document(s)" -ForegroundColor Green
    Write-Host ""
    
    # Test 3: Get specific document
    Write-Host "🔍 Test 3: Getting document details..." -ForegroundColor Yellow
    $docDetails = Invoke-RestMethod -Uri "$baseUrl/$docId" -Method Get
    Write-Host "✅ Retrieved document: $($docDetails.document.title)" -ForegroundColor Green
    Write-Host ""
    
    # Test 4: Delete document
    Write-Host "🗑️  Test 4: Deleting document..." -ForegroundColor Yellow
    $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/$docId" -Method Delete
    Write-Host "✅ Document deleted successfully" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Response details:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message
}
