#!/bin/bash
# Trinetra AI Pre-Commit Hook Setup Script

echo "Setting up Git pre-commit hooks..."

HOOK_FILE=".git/hooks/pre-commit"

cat << 'EOF' > $HOOK_FILE
#!/bin/bash
# Pre-commit hook to prevent committing hardcoded secrets or .env files

echo "Running pre-commit security checks..."

# 1. Check for staged .env files (except .env.example)
STAGED_ENV_FILES=$(git diff --cached --name-only | grep -E '^\.env|\.env\.local|backend/\.env|frontend/\.env\.local')
if [ -n "$STAGED_ENV_FILES" ]; then
    echo "❌ ERROR: Attempting to commit environment secret files:"
    echo "$STAGED_ENV_FILES"
    echo "Please unstage these files before committing."
    exit 1
fi

# 2. Check for potential hardcoded API keys in staged files
STAGED_KEYS=$(git diff --cached -S"sk-" -S"AIza" -S"vapi_" --name-only)
if [ -n "$STAGED_KEYS" ]; then
    echo "⚠️ WARNING: Potential API keys detected in staged changes:"
    echo "$STAGED_KEYS"
    echo "Please verify no raw secrets are present."
fi

echo "✅ Security pre-commit checks passed."
exit 0
EOF

chmod +x $HOOK_FILE
echo "✅ Pre-commit hook installed successfully at $HOOK_FILE"
