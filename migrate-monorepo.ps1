# migrate-monorepo.ps1
# Principal Full-Stack Engineer Monorepo Restructuring Script
# Target structure: /frontend, /backend, /database

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   TRINETRA MONOREPO RESTRUCTURING SYSTEM      " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Create target directories
$dirs = @("frontend", "backend", "database", "database/migrations")
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "[+] Created directory: /$dir" -ForegroundColor Green
    }
}

# Helper function to move items safely using Git when tracked, or filesystem standard move when untracked
function Move-MonorepoItem {
    param (
        [string]$Source,
        [string]$Destination
    )
    if (Test-Path $Source) {
        # Check if file is tracked by Git
        $null = git ls-files --error-unmatch $Source 2>$null
        if ($LASTEXITCODE -eq 0) {
            # Tracked by git, use git mv
            git mv $Source $Destination
            Write-Host "[Git Move] Moved $Source -> $Destination" -ForegroundColor Green
        } else {
            # Not tracked by git, use standard Move-Item
            Move-Item -Path $Source -Destination $Destination -Force
            Write-Host "[FS Move] Moved $Source -> $Destination" -ForegroundColor Yellow
        }
    }
}

# 2. Files and folders to move into /frontend
$frontendItems = @(
    "components", "hooks", "lib", "store", "types", "utils", "public", "src",
    "middleware.ts", "next-env.d.ts", "next.config.ts", "postcss.config.mjs",
    "tailwind.config.ts", "tsconfig.json", "eslint.config.mjs", "proxy.ts", 
    ".env.local", "package.json", "package-lock.json", "tsconfig.tsbuildinfo"
)

Write-Host "`nMoving frontend files to /frontend..." -ForegroundColor Cyan
foreach ($item in $frontendItems) {
    Move-MonorepoItem -Source $item -Destination "frontend/"
}

# 3. Files and folders to move into /backend
$backendItems = @(
    "main.py", "voice_router.py", "database.py"
)

Write-Host "`nMoving backend files to /backend..." -ForegroundColor Cyan
foreach ($item in $backendItems) {
    Move-MonorepoItem -Source $item -Destination "backend/"
}

# 4. Database Migrations
Write-Host "`nMoving database files..." -ForegroundColor Cyan
if (Test-Path "supabase/migrations") {
    Get-ChildItem -Path "supabase/migrations/*.sql" | ForEach-Object {
        Move-MonorepoItem -Source $_.FullName -Destination "database/migrations/"
    }
    # Clean up empty supabase folder if needed
    if ((Get-ChildItem -Path "supabase/migrations").Count -eq 0) {
        Remove-Item -Path "supabase/migrations" -Force
        Write-Host "[+] Cleaned up empty supabase/migrations folder" -ForegroundColor Gray
    }
    if ((Get-ChildItem -Path "supabase").Count -eq 0) {
        Remove-Item -Path "supabase" -Force
        Write-Host "[+] Cleaned up empty supabase folder" -ForegroundColor Gray
    }
}

# 5. Create backend requirements.txt
$requirementsPath = "backend/requirements.txt"
if (!(Test-Path $requirementsPath)) {
    $requirementsContent = @"
fastapi>=0.100.0
uvicorn[standard]>=0.22.0
supabase>=2.0.0
python-dotenv>=1.0.0
pydantic>=2.0.0
"@
    Set-Content -Path $requirementsPath -Value $requirementsContent
    Write-Host "[+] Created /backend/requirements.txt" -ForegroundColor Green
}

# 6. Refactor backend/database.py to remove Next.js env bleeding
$databasePyPath = "backend/database.py"
if (Test-Path $databasePyPath) {
    $dbContent = Get-Content -Path $databasePyPath -Raw
    # Replace the bleeding load_dotenv calls with clean load_dotenv()
    $targetContent = @"
# Force Python to look for Next.js's default env file
load_dotenv(".env.local") 

# Fallback to standard .env if .env.local isn't found
if not os.getenv("NEXT_PUBLIC_SUPABASE_URL"):
    load_dotenv(".env")
"@
    
    $replacementContent = @"
# Load environment variables locally from backend directory
load_dotenv()
"@
    if ($dbContent -match [regex]::Escape($targetContent)) {
        $dbContent = $dbContent -replace [regex]::Escape($targetContent), $replacementContent
        Set-Content -Path $databasePyPath -Value $dbContent
        Write-Host "[Refactor] Updated backend/database.py to load environment variables locally." -ForegroundColor Green
    } else {
        Write-Host "[i] backend/database.py target content was already modified or not found." -ForegroundColor Gray
    }
}

# 7. Create root-level package.json for unified orchestration
$rootPackageJsonPath = "package.json"
$rootPackageJsonContent = @"
{
  "name": "trinetra-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "install:all": "npm install --prefix frontend",
    "dev:frontend": "npm run dev --prefix frontend",
    "dev:backend": "cd backend && uvicorn main:app --reload --port 8000",
    "dev:tunnel": "cloudflared tunnel --url http://localhost:8000",
    "dev": "concurrently --kill-others -n \"frontend,backend,tunnel\" -c \"cyan,green,yellow\" \"npm run dev:frontend\" \"npm run dev:backend\" \"npm run dev:tunnel\""
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
"@
Set-Content -Path $rootPackageJsonPath -Value $rootPackageJsonContent
Write-Host "[+] Created root-level /package.json orchestrator" -ForegroundColor Green

# 8. Create separate backend .env template
$backendEnvExamplePath = "backend/.env.example"
if (!(Test-Path $backendEnvExamplePath)) {
    $backendEnvContent = @"
# Trinetra Python Backend Secrets
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-high-privilege-service-role-key
VAPI_PUBLIC_KEY=your-vapi-public-key
VAPI_AGENT_ID=your-vapi-agent-id
"@
    Set-Content -Path $backendEnvExamplePath -Value $backendEnvContent
    Write-Host "[+] Created /backend/.env.example" -ForegroundColor Green
}

# 9. Create global gitignore with strict backend .venv & cache ignores
$gitignorePath = ".gitignore"
$gitignoreContent = @"
# Root GitIgnore
node_modules/
.next/
*.log

# Backend Virtual Environments
backend/.venv/
backend/env/
backend/Venv/

# Python Compilation Caches
**/__pycache__/
**/*.pyc
**/*.pyo
**/*.pyd

# Local Environment variables
.env.local
.env
backend/.env
frontend/.env.local
"@
Set-Content -Path $gitignorePath -Value $gitignoreContent
Write-Host "[+] Created unified root /.gitignore" -ForegroundColor Green

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host "   MONOREPO MIGRATION SUCCESSFUL!              " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm install' in the root directory to set up 'concurrently'."
Write-Host "2. Copy backend keys into backend/.env (refer to backend/.env.example)."
Write-Host "3. Update Vercel Root Directory to 'frontend'."
Write-Host "4. Start development using: npm run dev"
Write-Host "==============================================" -ForegroundColor Green
