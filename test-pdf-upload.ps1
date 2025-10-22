# Test PDF Upload to JJK.AI Backend
# Usage: .\test-pdf-upload.ps1 "path\to\your\file.pdf"

param(
    [string]$FilePath = ""
)

Write-Host "Testing PDF Upload to JJK.AI" -ForegroundColor Cyan
Write-Host ""

# Prompt for file path if not provided
if ([string]::IsNullOrEmpty($FilePath)) {
    $FilePath = Read-Host "Enter the path to your PDF file"
}

# Check if file exists
if (-not (Test-Path $FilePath)) {
    Write-Host "Error: File not found: $FilePath" -ForegroundColor Red
    exit 1
}

# Check if it's a PDF
$extension = [System.IO.Path]::GetExtension($FilePath).ToLower()
if ($extension -ne ".pdf") {
    Write-Host "Warning: File is not a PDF (extension: $extension)" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

$fileName = [System.IO.Path]::GetFileName($FilePath)
Write-Host "File: $fileName" -ForegroundColor White
Write-Host "Backend: http://localhost:8787/api/documents/upload" -ForegroundColor White
Write-Host ""

try {
    # Use built-in form data instead of manual multipart construction
    Add-Type -AssemblyName "System.Net.Http"
    
    $httpClient = New-Object System.Net.Http.HttpClient
    $content = New-Object System.Net.Http.MultipartFormDataContent
    
    # Read file
    $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
    $fileContent = New-Object System.Net.Http.ByteArrayContent(,$fileBytes)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/pdf")
    
    $content.Add($fileContent, "file", $fileName)
    
    Write-Host "Uploading..." -ForegroundColor Yellow
    
    # Upload
    $response = $httpClient.PostAsync("http://localhost:8787/api/documents/upload", $content).Result
    $responseContent = $response.Content.ReadAsStringAsync().Result
    
    if ($response.IsSuccessStatusCode) {
        Write-Host "Upload successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Cyan
        $result = $responseContent | ConvertFrom-Json
        
        if ($result.success) {
            $doc = $result.document
            Write-Host "  Document ID: $($doc.id)" -ForegroundColor White
            Write-Host "  Title: $($doc.title)" -ForegroundColor White
            Write-Host "  Filename: $($doc.filename)" -ForegroundColor White
            Write-Host "  Pages: $($doc.pages)" -ForegroundColor White
            Write-Host "  Blocks: $($doc.blocks)" -ForegroundColor White
            Write-Host "  Chunks: $($doc.chunks)" -ForegroundColor White
            Write-Host "  Status: $($doc.status)" -ForegroundColor Green
            
            if ($doc.chunks -gt 0) {
                Write-Host ""
                Write-Host "PDF processed and stored in Supabase!" -ForegroundColor Green
                Write-Host "  - Extracted text from $($doc.pages) pages" -ForegroundColor White
                Write-Host "  - Created $($doc.chunks) searchable chunks" -ForegroundColor White
                Write-Host "  - Ready for RAG retrieval!" -ForegroundColor White
            }
        }
        else {
            Write-Host "Unexpected response format:" -ForegroundColor Yellow
            Write-Host $responseContent
        }
    }
    else {
        Write-Host "Upload failed!" -ForegroundColor Red
        Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Yellow
        Write-Host "Response:" -ForegroundColor Yellow
        Write-Host $responseContent -ForegroundColor Red
    }
    
    $httpClient.Dispose()
}
catch {
    Write-Host "Upload failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
