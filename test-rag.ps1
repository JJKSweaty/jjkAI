# Test RAG Chat with Documents

Write-Host "🧪 Testing RAG Chat with Citations" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8787"

# Step 1: Upload a test document
Write-Host "📤 Step 1: Uploading test document..." -ForegroundColor Yellow
try {
    $uploadResponse = Invoke-RestMethod -Uri "$baseUrl/api/documents/upload" `
        -Method Post `
        -InFile "test-document.md" `
        -ContentType "multipart/form-data"
    
    $docId = $uploadResponse.document.id
    Write-Host "✅ Document uploaded: $($uploadResponse.document.title)" -ForegroundColor Green
    Write-Host "   Chunks: $($uploadResponse.document.chunks)" -ForegroundColor Gray
    Write-Host ""
    
    # Wait a moment for indexing
    Start-Sleep -Seconds 1
    
    # Step 2: Test RAG chat (non-streaming)
    Write-Host "💬 Step 2: Testing RAG chat..." -ForegroundColor Yellow
    Write-Host ""
    
    $chatRequest = @{
        query = "What is the document processing system?"
        maxResults = 5
    } | ConvertTo-Json
    
    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat/with-docs" `
        -Method Post `
        -Body $chatRequest `
        -ContentType "application/json"
    
    Write-Host "🤖 Answer:" -ForegroundColor Cyan
    Write-Host $chatResponse.answer
    Write-Host ""
    
    Write-Host "📚 Sources:" -ForegroundColor Cyan
    foreach ($citation in $chatResponse.citations) {
        Write-Host "   $($citation.formatted)" -ForegroundColor Gray
    }
    Write-Host ""
    
    Write-Host "📊 Retrieved Chunks:" -ForegroundColor Cyan
    foreach ($chunk in $chatResponse.chunks) {
        Write-Host "   - $($chunk.source) (score: $([math]::Round($chunk.score, 3)))" -ForegroundColor Gray
    }
    Write-Host ""
    
    # Step 3: Test with specific question
    Write-Host "💬 Step 3: Testing specific question..." -ForegroundColor Yellow
    Write-Host ""
    
    $chatRequest2 = @{
        query = "What are the features of the system?"
        maxResults = 5
    } | ConvertTo-Json
    
    $chatResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/chat/with-docs" `
        -Method Post `
        -Body $chatRequest2 `
        -ContentType "application/json"
    
    Write-Host "🤖 Answer:" -ForegroundColor Cyan
    Write-Host $chatResponse2.answer
    Write-Host ""
    
    # Step 4: Clean up
    Write-Host "🗑️  Step 4: Cleaning up..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "$baseUrl/api/documents/$docId" -Method Delete | Out-Null
    Write-Host "✅ Document deleted" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🎉 All RAG tests passed!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}
