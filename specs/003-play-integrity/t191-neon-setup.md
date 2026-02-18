# T191: Create Neon PostgreSQL Project - Setup Guide

**Task**: Create Neon PostgreSQL project with auto-suspend enabled for cost optimization

**Time Estimate**: 10 minutes

**Prerequisites**: 
- GitHub account (for Neon GitHub OAuth integration, optional but recommended)
- Neon account (free tier supports 3 projects, 10 GB storage)

---

## Step-by-Step Instructions

### 1. Create Neon Account (if needed)

1. Go to https://neon.tech
2. Click "Sign Up" → Select "Sign up with GitHub" (recommended) or email
3. Complete verification
4. You should see the Neon dashboard

### 2. Create Project: `exam-app-prod`

1. In Neon dashboard, click **"New Project"** or **"Create a project"**
2. Configure project details:
   - **Project name**: `exam-app-prod`
   - **Database name**: `exam_app_prod` (default is `neondb`, change it)
   - **Region**: Select closest to your users (us-east-1 for AWS compatibility, or eu-west-1 for Europe)
   - **PostgreSQL version**: 15 (default, compatible with exam-app schema)
3. Click **"Create Project"**
4. Wait for database initialization (2-3 minutes)

**Screenshot checkpoint**: You should see green "Ready" status next to your project

### 3. Enable Auto-Suspend (Cost Optimization)

1. In project dashboard, go to **Settings** (bottom left)
2. Find **"Compute"** section
3. Enable **"Auto-suspend inactive compute"** (default: 5 minutes inactivity)
4. Set **"Pause after"**: 5 minutes (cost: $0 when inactive)
5. Click **"Save"**

**Cost Impact**: Saves ~$15/month by suspending unused database (activates on connect, ~1-2s resume time)

### 4. Configure Connection Pooling  *(Part of T192 - do now for convenience)*

1. In project dashboard, go to **"Connection Pooling"** (or **"Pooling"**)
2. Verify **PgBouncer** is enabled (default)
3. Set **"Max connections"**: 20 (sufficient for Railway free tier)
4. Note the configuration:
   - Connection pooling mode: **"Transaction"** (recommended for serverless)
   - Pool size: 10 (default)

**Screenshot checkpoint**: Pooling settings saved

### 5. Create Root User Password (if needed)

1. Go to **"Roles"** section in project settings
2. If no root password, click on **"postgres"** role
3. Set a secure password (generate or use: `$(openssl rand -base64 32)`)
4. Keep this in a password manager (you'll need it for DATABASE_URL)

### 6. Get Connection String

1. In project dashboard, click **"Connect"** (top right button, or in Quick Start)
2. Select connection type: **"Connection string"** (not "psql command")
3. Choose **"Include password"** checkbox
4. Copy the connection string (looks like):
   ```
   postgresql://[user]:[password]@pg[xxxx].neon.tech:5432/exam_app_prod?sslmode=require
   ```

**IMPORTANT**: Save this connection string securely (password manager, .env.local, or secure note)

### 7. Test Local Connection  *(Part of T195 - do now)*

**Option A: Using psql (if PostgreSQL installed)**

```bash
# Install PostgreSQL client (if needed)
brew install postgresql  # macOS
apt-get install postgresql-client  # Linux

# Test connection (substitute your actual connection string)
psql "postgresql://[user]:[password]@pg[xxxx].neon.tech:5432/exam_app_prod?sslmode=require"

# You should see:
# psql (15.x)
# exam_app_prod=> 
# Type: \q to exit
```

**Option B: Using Node.js (recommended for team)**

```bash
cd /Users/danilo/repos/exam-app/api

# Create .env.local (don't commit!)
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://[user]:[password]@pg[xxxx].neon.tech:5432/exam_app_prod?sslmode=require"
EOF

# Test connection via Prisma
npx prisma db push --skip-generate

# Expected output:
# ✓ Database connection successful
# ✓ Migrations ready (or "No migrations needed")
```

**Success Indicator**: No connection errors, database responds with 200ms latency

### 8. Document Configuration for Railway  *(Needed for T202)*

Create a secure note with:

```
NEON PROJECT DETAILS
=====================

Project Name: exam-app-prod
Project ID: [shown in Neon dashboard]
Region: [selected region]
Database: exam_app_prod
Root User: postgres

CONNECTION DETAILS
==================
Pooled Connection String (T202 - DATABASE_URL):
postgresql://[user]:[password]@pg[xxxx]-pooler.neon.tech:5432/exam_app_prod?sslmode=require

Direct Connection String (for local testing):
postgresql://[user]:[password]@pg[xxxx].neon.tech:5432/exam_app_prod?sslmode=require

NOTE: Pooled string uses "-pooler" suffix, needed for Railway

Auto-suspend: Enabled (5 minutes)
Max Connections: 20
Pooling Mode: Transaction
Free Tier Storage: 10 GB (current: ~50 MB)
```

---

## Verification Checklist

✅ Project created in Neon console  
✅ Database name: `exam_app_prod`  
✅ Auto-suspend enabled (saves cost)  
✅ Connection pooling configured (PgBouncer, 20 max connections)  
✅ Root password set and saved  
✅ Connection string copied and tested  
✅ Local `psql` or `npx prisma` test successful  
✅ Pooled connection string noted for Railway (T202)  

---

## Troubleshooting

**"Connection refused" error**:
- Verify connection string uses correct subdomain (pg[xxxx].neon.tech)
- Check SSL mode is `sslmode=require`
- Ensure password is URL-encoded (special chars: %40 for @, %3A for :)

**"Max connections exceeded" error**:
- Occurs if >20 apps try to connect simultaneously
- Increase "Max connections" in Pooling settings to 50-100
- OR use Transaction mode (default) which multiplexes connections

**"Database doesn't exist" error**:
- Verify database name in connection string: `exam_app_prod`
- Check Neon dashboard shows database created

**Slow queries (>1s)**:
- Neon has ~100ms latency from US East (expected)
- If >500ms: try different region or check for long-running queries
- Serverless cold start: first query takes ~1-2s (auto-suspend activates)

**"sslmode error"**:
- Some clients need `sslmode=require` in connection string
- Neon requires SSL for security

---

## Next Steps

After T191 is complete:

1. **T192**: Configure connection pooling (detailed settings) ✅ Already done above
2. **T194**: Copy pooled connection string to secure location ✅ Done above
3. **T195**: Test local connection ✅ Done above
4. **T196**: Update Prisma schema datasource (no code changes needed, already supports env vars)
5. **T197-T199**: Create migration scripts and test database setup
6. **T200**: Create Railway project and link GitHub

---

## Cost Verification

At completion of T191-T195:

- **Neon free tier**: $0/month (includes 10 GB storage, auto-suspend)
- **Storage used**: ~50 MB (exam type configs + seeded questions)
- **Auto-suspend**: Active (pauses when idle >5 minutes, ~1-2s resume)
- **Estimated monthly cost**: $0 (free tier only)

---

## Reference

- [Neon Documentation](https://neon.tech/docs)
- [Neon Connection Pooling](https://neon.tech/docs/reference/connection-pooling)
- [Neon Postgres Compatibility](https://neon.tech/docs/reference/compatibility)
- [Prisma Neon Integration](https://www.prisma.io/dataguide/postgres/the-case-for-postgres#neon)
