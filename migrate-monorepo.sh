#!/usr/bin/env bash
# migrate-monorepo.sh
# Principal Full-Stack Engineer Monorepo Restructuring Script
# Target structure: /frontend, /backend, /database

# Text colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}==============================================${NC}"
echo -e "${CYAN}   TRINETRA MONOREPO RESTRUCTURING SYSTEM      ${NC}"
echo -e "${CYAN}==============================================${NC}"

# 1. Create target directories
dirs=("frontend" "backend" "database" "database/migrations")
for dir in "${dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo -e "${GREEN}[+] Created directory: /$dir${NC}"
    fi
done

# Helper function to move items safely using Git when tracked, or filesystem standard move when untracked
move_monorepo_item() {
    local src="$1"
    local dest="$2"
    
    if [ -e "$src" ]; then
        # Check if file is tracked by Git
        if git ls-files --error-unmatch "$src" >/dev/null 2>&1; then
            # Tracked by git, use git mv
            git mv "$src" "$dest"
            echo -e "${GREEN}[Git Move] Moved $src -> $dest${NC}"
        else
            # Not tracked by git, use standard mv
            mv "$src" "$dest"
            echo -e "${YELLOW}[FS Move] Moved $src -> $dest${NC}"
        fi
    fi
}

# 2. Files and folders to move into /frontend
frontend_items=(
    "components" "hooks" "lib" "store" "types" "utils" "public" "src"
    "middleware.ts" "next-env.d.ts" "next.config.ts" "postcss.config.mjs"
    "tailwind.config.ts" "tsconfig.json" "eslint.config.mjs" "proxy.ts" 
    ".env.local" "package.json" "package-lock.json" "tsconfig.tsbuildinfo"
)

echo -e "\n${CYAN}Moving frontend files to /frontend...${NC}"
for item in "${frontend_items[@]}"; do
    move_monorepo_item "$item" "frontend/"
done

# 3. Files and folders to move into /backend
backend_items=(
    "main.py" "voice_router.py" "database.py"
)

echo -e "\n${CYAN}Moving backend files to /backend...${NC}"
for item in "${backend_items[@]}"; do
    move_monorepo_item "$item" "backend/"
done

# 4. Database Migrations
echo -e "\n${CYAN}Moving database files...${NC}"
if [ -d "supabase/migrations" ]; then
    for sql_file in supabase/migrations/*.sql; do
        if [ -e "$sql_file" ]; then
            move_monorepo_item "$sql_file" "database/migrations/"
        fi
    done
    
    # Clean up empty directories
    if [ -d "supabase/migrations" ] && [ -z "$(ls -A supabase/migrations)" ]; then
        rm -rf "supabase/migrations"
        echo -e "${GRAY}[+] Cleaned up empty supabase/migrations folder${NC}"
    fi
    if [ -d "supabase" ] && [ -z "$(ls -A supabase)" ]; then
        rm -rf "supabase"
        echo -e "${GRAY}[+] Cleaned up empty supabase folder${NC}"
    fi
fi

# 5. Create backend requirements.txt
requirements_path="backend/requirements.txt"
if [ ! -f "$requirements_path" ]; then
    cat << 'EOF' > "$requirements_path"
fastapi>=0.100.0
uvicorn[standard]>=0.22.0
supabase>=2.0.0
python-dotenv>=1.0.0
pydantic>=2.0.0
EOF
    echo -e "${GREEN}[+] Created /backend/requirements.txt${NC}"
fi

# 6. Refactor backend/database.py to remove Next.js env bleeding
database_py_path="backend/database.py"
if [ -f "$database_py_path" ]; then
    # Clean env loading logic
    python3 -c "
import os
path = '$database_py_path'
if os.path.exists(path):
    with open(path, 'r') as f:
        content = f.read()
    
    target = '''# Force Python to look for Next.js\\'s default env file
load_dotenv(\".env.local\") 

# Fallback to standard .env if .env.local isn\\'t found
if not os.getenv(\"NEXT_PUBLIC_SUPABASE_URL\"):
    load_dotenv(\".env\")'''
    
    replacement = '''# Load environment variables locally from backend directory
load_dotenv()'''
    
    if target in content:
        content = content.replace(target, replacement)
        with open(path, 'w') as f:
            f.write(content)
        print('Updated database.py successfully.')
    else:
        # Try alternate replacement for escaped versions
        target_alt = '# Force Python to look for Next.js\\'s default env file\\nload_dotenv(\".env.local\")\\n\\n# Fallback to standard .env if .env.local isn\\'t found\\nif not os.getenv(\"NEXT_PUBLIC_SUPABASE_URL\"):\\n    load_dotenv(\".env\")'
        content = content.replace('load_dotenv(\".env.local\")', 'load_dotenv()')
        content = content.replace('if not os.getenv(\"NEXT_PUBLIC_SUPABASE_URL\"):\\n    load_dotenv(\".env\")', '')
        with open(path, 'w') as f:
            f.write(content)
        print('Performed fallback update on database.py.')
" 2>/dev/null
    echo -e "${GREEN}[Refactor] Refactored backend/database.py to load environment variables locally.${NC}"
fi

# 7. Create root-level package.json for unified orchestration
root_package_json_path="package.json"
cat << 'EOF' > "$root_package_json_path"
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
EOF
echo -e "${GREEN}[+] Created root-level /package.json orchestrator${NC}"

# 8. Create separate backend .env template
backend_env_example_path="backend/.env.example"
if [ ! -f "$backend_env_example_path" ]; then
    cat << 'EOF' > "$backend_env_example_path"
# Trinetra Python Backend Secrets
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-high-privilege-service-role-key
VAPI_PUBLIC_KEY=your-vapi-public-key
VAPI_AGENT_ID=your-vapi-agent-id
EOF
    echo -e "${GREEN}[+] Created /backend/.env.example${NC}"
fi

# 9. Create global gitignore with strict backend .venv & cache ignores
gitignore_path=".gitignore"
cat << 'EOF' > "$gitignore_path"
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
EOF
echo -e "${GREEN}[+] Created unified root /.gitignore${NC}"

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}   MONOREPO MIGRATION SUCCESSFUL!              ${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "Next Steps:"
echo -e "1. Run 'npm install' in the root directory to set up 'concurrently'."
echo -e "2. Copy backend keys into backend/.env (refer to backend/.env.example)."
echo -e "3. Update Vercel Root Directory to 'frontend'."
echo -e "4. Start development using: npm run dev"
echo -e "${GREEN}==============================================${NC}"
