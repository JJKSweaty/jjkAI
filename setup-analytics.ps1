# Token Analytics Dashboard - Quick Setup Script (Windows PowerShell)
# Run this script to install all dependencies and set up the database

Write-Host "🚀 Token Analytics Dashboard Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install frontend dependencies
Write-Host "📦 Step 1/4: Installing frontend dependencies..." -ForegroundColor Yellow
npm install recharts @radix-ui/react-tabs
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Install server dependencies
Write-Host "📦 Step 2/4: Installing server dependencies..." -ForegroundColor Yellow
Set-Location apps\server
npm install @supabase/supabase-js
Set-Location ..\..
Write-Host "✅ Server dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Build server
Write-Host "🔨 Step 3/4: Building server..." -ForegroundColor Yellow
Set-Location apps\server
npm run build
Set-Location ..\..
Write-Host "✅ Server built successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Database setup instructions
Write-Host "🗄️  Step 4/4: Database Setup Required" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Please complete the following manual steps:" -ForegroundColor White
Write-Host ""
Write-Host "1. Open your Supabase SQL Editor" -ForegroundColor White
Write-Host "   URL: https://app.supabase.com/project/YOUR_PROJECT/sql" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Copy the contents of: apps\server\migrations\create_usage_tracking.sql" -ForegroundColor White
Write-Host ""
Write-Host "3. Paste into SQL Editor and click 'Run'" -ForegroundColor White
Write-Host ""
Write-Host "4. Verify tables were created:" -ForegroundColor White
Write-Host "   SELECT table_name FROM information_schema.tables" -ForegroundColor Gray
Write-Host "   WHERE table_schema = 'public'" -ForegroundColor Gray
Write-Host "   AND table_name IN ('usage_events', 'price_map');" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Verify environment variables are set:" -ForegroundColor White
Write-Host "   Frontend (.env.local):" -ForegroundColor Gray
Write-Host "     - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Gray
Write-Host "     - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "   Server (apps\server\.env):" -ForegroundColor Gray
Write-Host "     - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Gray
Write-Host "     - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host "     - ANTHROPIC_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Setup complete! Next steps:" -ForegroundColor Green
Write-Host ""
Write-Host "  Terminal 1 - Start frontend:" -ForegroundColor Cyan
Write-Host "    npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 2 - Start server:" -ForegroundColor Cyan
Write-Host "    cd apps\server; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Then visit: http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Click the token badge to view analytics!" -ForegroundColor Yellow
Write-Host ""
