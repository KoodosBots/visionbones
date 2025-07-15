#!/bin/bash

echo "🔧 Preparing VisionBones for deployment..."
echo "======================================="

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to generate package-lock.json if missing
generate_lockfile() {
    local dir=$1
    local name=$2
    
    echo "📦 Checking $name..."
    if [ ! -f "$dir/package-lock.json" ]; then
        echo "   ⚠️  package-lock.json missing in $name"
        echo "   📝 Generating package-lock.json..."
        
        # Save current directory
        pushd "$dir" > /dev/null
        
        # Remove node_modules to ensure clean install
        rm -rf node_modules
        
        # Try multiple methods to generate package-lock.json
        if command -v npm >/dev/null 2>&1; then
            # Method 1: Try package-lock-only
            npm install --package-lock-only 2>/dev/null
            
            if [ ! -f "package-lock.json" ]; then
                echo "   🔄 Trying full install method..."
                # Method 2: Full install
                npm install 2>/dev/null
            fi
            
            if [ ! -f "package-lock.json" ]; then
                echo "   🔄 Trying alternative npm version..."
                # Method 3: Force with different npm flags
                npm install --package-lock --no-workspaces 2>/dev/null || npm install --no-workspaces 2>/dev/null
            fi
        fi
        
        # Return to previous directory
        popd > /dev/null
        
        if [ -f "$dir/package-lock.json" ]; then
            echo "   ✅ package-lock.json generated successfully"
        else
            echo "   ⚠️  Could not generate package-lock.json"
            echo "   📝 Docker will use npm install instead of npm ci"
        fi
    else
        echo "   ✅ package-lock.json exists"
    fi
}

# Check and generate lockfiles
generate_lockfile "$PROJECT_ROOT/webapp" "webapp"
generate_lockfile "$PROJECT_ROOT/bot" "bot"

# Check .env file
echo ""
echo "🔑 Checking environment configuration..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        echo "   ⚠️  .env file missing"
        echo "   📝 Creating .env from .env.example..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        echo "   ✅ .env file created"
        echo "   ⚠️  Please edit .env with your actual values before deploying!"
    else
        echo "   ❌ No .env or .env.example found!"
    fi
else
    echo "   ✅ .env file exists"
fi

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual values (if not already done)"
echo "2. Run ./deploy.sh to deploy with Docker"
echo ""