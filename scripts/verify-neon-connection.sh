#!/bin/bash

# T191/T195 Verification Script: Test Neon PostgreSQL Connection
# Usage: ./scripts/verify-neon-connection.sh

set -e

echo "🔍 Neon PostgreSQL Connection Verification"
echo "==========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo ""
    echo "Set DATABASE_URL to your Neon connection string:"
    echo "  export DATABASE_URL='postgresql://user:password@pg[xxxx]-pooler.neon.tech:5432/exam_app_prod?sslmode=require'"
    echo ""
    exit 1
fi

echo "✓ DATABASE_URL set:"
echo "  Host: $(echo $DATABASE_URL | grep -oP '(?<=@)[^:]+' || echo 'unknown')"
echo "  Database: $(echo $DATABASE_URL | grep -oP '(?<=/)[^?]+' || echo 'unknown')"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql not found, using Node.js/Prisma instead"
    echo ""
    echo "Testing with Prisma..."
    
    cd api
    
    # Test connection with Prisma
    if npx prisma db execute --stdin < /dev/null 2>&1 | grep -q "error"; then
        echo "❌ Prisma connection failed"
        cd ..
        exit 1
    fi
    
    echo "✓ Prisma can connect to database"
    
    # Test if migrations can run
    echo "Checking migrations..."
    if npx prisma migrate status 2>&1 | grep -q "success"; then
        echo "✓ Database is initialized (migrations status OK)"
    fi
    
    cd ..
else
    echo "Testing with psql..."
    
    # Test connection
    if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
        echo "✓ PostgreSQL connection successful"
    else
        echo "❌ PostgreSQL connection failed"
        exit 1
    fi
    
    # Get version
    VERSION=$(psql "$DATABASE_URL" -t -c "SELECT version()" 2>/dev/null || echo "unknown")
    echo "✓ PostgreSQL version: $VERSION"
    
    # Check tables
    TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")
    echo "✓ Tables in database: $TABLES"
fi

echo ""
echo "✅ Connection verification complete!"
echo ""
echo "Next steps:"
echo "  1. Run database migrations: cd api && npx prisma migrate deploy"
echo "  2. Seed database: cd api && npx prisma db seed"
echo "  3. Proceed to T196 (Prisma schema verification)"
