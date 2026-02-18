# Deployment Guide: Play Integrity Guard (Railway + Neon)

**Feature**: 003-play-integrity  
**Deployment Stack**: Railway (backend hosting) + Neon (PostgreSQL serverless)  
**Cost**: ~$10-20/month (vs $200+/month for AWS)  
**Date**: February 18, 2026  
**Status**: Production Deployment

---

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Detailed Setup](#detailed-setup)
   - [Neon PostgreSQL Database](#neon-postgresql-setup)
   - [Railway Backend Deployment](#railway-deployment)
   - [Environment Configuration](#environment-configuration)
3. [Database Migrations](#database-migrations)
4. [Testing Post-Deployment](#testing)
5. [Monitoring & Debugging](#monitoring)
6. [Rollback Procedures](#rollback)
7. [Production Checklist](#production-checklist)

---

## Quick Start (5 minutes)

### Prerequisites

- GitHub account with `003-play-integrity` branch
- Credit card for Neon account (free tier available, no charges unless exceeding limits)
- Neon account (https://neon.tech)
- Railway account (https://railway.app)

### Step 1: Create Neon Database (2 min)

```bash
# Go to https://neon.tech
# Sign up (free tier: 3 projects, 10GB storage)
# Create new project > Click "exam-app-prod"
# Copy pooled connection string (ends in -pooler.neon.tech)
# Format: postgresql://[user]:[password]@pgXXXX-pooler.neon.tech:5432/exam_app_prod?sslmode=require
```

Save this as `DATABASE_URL` in a secure location (password manager, 1Password, etc.)

### Step 2: Create Railway Service (2 min)

```bash
# Go to https://railway.app
# New Project > Deploy from GitHub
# Select: danilocasim/exam-app repository
# Root Directory: api/
# Wait 2-3 minutes for first deployment
```

### Step 3: Configure Environment Variables (1 min)

```bash
# In Railway Dashboard:
# Go to project > api service > Variables
# Add:
# - DATABASE_URL = [paste Neon pooled connection string from Step 1]
# - NODE_ENV = production
# - JWT_SECRET = [generate: openssl rand -hex 32]
# - GOOGLE_CLIENT_ID = [from Google Cloud Console]
# - GOOGLE_CLIENT_SECRET = [from Google Cloud Console]
# - PLAY_INTEGRITY_CREDENTIALS = [from Google Play Console]
```

**✅ Done!** Your backend is now live. Test it:

```bash
# Get your Railway URL from the deployment logs
# Example: https://api-prod-xyzabc.railway.app
curl https://api-prod-xyzabc.railway.app/health
# Expected: {"status":"ok"}
```

---

## Detailed Setup

### Neon PostgreSQL Setup

#### Create Neon Account & Project

1. **Go to neon.tech**:
   - Sign up with GitHub account (recommended for integration)
   - Create new project called `exam-app-prod`
   - Region: Choose closest to your users (US-East, EU-Frankfurt, AP-Singapore, etc.)

2. **Database Configuration**:
   - Database name: `exam_app_prod` (auto-created with project)
   - Admin user: auto-generated (email-based username)
   - Role: Neon Postgres compatible (standard PostgreSQL)
   - Branching: Enable `main` branch + optional `dev` branch (free)

3. **Get Connection String**:
   - Go to Project > Connection Details
   - Copy: **"Pooled connection"** (important: ends in -pooler.neon.tech)
   - Format: `postgresql://neondb_owner:[PASSWORD]@pg[ID]-pooler.neon.tech:5432/exam_app_prod?sslmode=require`
   - **Never expose** this string in public repos

#### Connection Pooling Configuration

Neon provides built-in PgBouncer connection pooling (enabled by default).

**Default pooling settings**:
- Mode: Transaction mode (each transaction gets a pooled connection)
- Max connections: 10 (free tier), upgradeable to 20-100
- Min connections: 1
- Timeout: 300s idle timeout (auto-disconnect)

**To adjust pooling** (if needed for load):

```bash
# In Neon console: Connection pooling
# - Set max_client_conn to 20 (for higher traffic)
# - Set reserve_pool_size to 5
```

#### Test Connection from Local Machine

```bash
# Install PostgreSQL client tools (macOS):
brew install postgresql

# Connect to Neon database:
psql "postgresql://neondb_owner:[PASSWORD]@pg[ID]-pooler.neon.tech:5432/exam_app_prod?sslmode=require"

# Expected: Connected to postgres on neon.
# Type "select version();" to verify
```

#### Enable Auto-Suspend (Cost Optimization)

Neon **free tier auto-suspends** branches after 5 minutes of inactivity (resumes on next connection, no downtime).

```bash
# In Neon console: Project > Settings > Compute
# Auto-suspend: 5 minutes (default, free)
# Always-on: Disable for free tier (costs $5/month otherwise)
```

**Result**: Zero cost if API idle for 5+ minutes. Resume is instant (<1s).

---

### Railway Deployment

#### Create Railway Project

1. **Go to railway.app**:
   - Create new project
   - Click "Deploy from GitHub"
   - Select: `danilocasim/exam-app`
   - Configure:
     - **Source**: `main` or `003-play-integrity` branch ✅
     - **Root Directory**: `api/` (important!)
     - **Auto-deploy**: Enable (auto-deploy on push to branch)

2. **Wait for Deployment**:
   - Railway builds Docker image (2-3 min)
   - Deploys to container (1 min)
   - Service URL auto-generated: `https://api-[hash].railway.app`
   - Check Deployment > Logs for build progress

3. **Get Service URL**:
   - Go to project > api service > Settings
   - Copy URL: `https://api-[hash].railway.app`
   - This is your production API endpoint

#### Docker Build Configuration

Railway auto-detects Node.js projects. If custom build needed:

**Create Dockerfile** (if not auto-detecting):

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

#### Health Check Configuration

Railway auto-discovers health endpoints. For explicit config:

```bash
# In Railway dashboard: api service > Environment
# Add: PORT=3000
# Railway will ping GET /health every 30s
# Expected response: {"status":"ok"}
```

**Create health endpoint** (in api/src/health/health.controller.ts):

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

Register in `app.module.ts`:

```typescript
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController, ...otherControllers],
})
export class AppModule {}
```

---

## Environment Configuration

### Railway Environment Variables

In Railway dashboard > api service > Variables, add:

```bash
# Database (from Neon)
DATABASE_URL=postgresql://neondb_owner:PASSWORD@pgXXXX-pooler.neon.tech:5432/exam_app_prod?sslmode=require

# Node/Application
NODE_ENV=production
PORT=3000

# JWT Authentication (generate with: openssl rand -hex 32)
JWT_SECRET=abc123def456ghi789jkl012mno345pqr

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=XXXX.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSP_XXXXXXXXX

# Google Play Integrity (base64-encoded service account JSON from Google Play Console)
PLAY_INTEGRITY_CREDENTIALS=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsICJwcm9qZWN0X2lkIjogIi4uLiIKfQ==

# Optional: Analytics
LOG_LEVEL=info
SENTRY_DSN= # if using Sentry for error tracking
```

### Local Development Override

Create `.env.local` (git-ignored):

```bash
DATABASE_URL=postgresql://localhost/exam_app_dev
NODE_ENV=development
JWT_SECRET=dev-secret-not-for-prod
GOOGLE_CLIENT_ID=[dev-client-id].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=[dev-secret]
PLAY_INTEGRITY_CREDENTIALS={}
```

---

## Database Migrations

### Initial Migration to Production

**Step 1: Backup Neon** (recommended before first migration):

```bash
# In Neon console: Project > Backups
# Manual backup: Click "Backup" button
# Save timestamp in notes for future reference
```

**Step 2: Run Migrations**:

```bash
cd api

# Method 1: Local machine (with DATABASE_URL from Neon)
export DATABASE_URL="postgresql://neondb_owner:PASSWORD@pgXXXX-pooler.neon.tech:5432/exam_app_prod?sslmode=require"
npx prisma migrate deploy

# Method 2: Via Railway deployment (automatic on build)
# Modify: api/Dockerfile to run migrations before server start
```

**Updated Dockerfile** (if using Railway with auto-migrations):

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Run migrations before starting server
CMD npx prisma migrate deploy && npm run start:prod
```

**Step 3: Seed Production Data**:

```bash
# After migrations succeed, seed exam types and questions
npx prisma db seed

# Expected output:
# Seeded exam types: AWS CCP, AWS SAA, ...
# Seeded questions: 1000+ AWS CCP questions
```

**Step 4: Verify Tables Created**:

```bash
# Connect to Neon and check tables
psql "postgresql://neondb_owner:PASSWORD@pgXXXX-pooler.neon.tech:5432/exam_app_prod?sslmode=require"

# In psql:
\dt  # List all tables
SELECT COUNT(*) FROM "User";  # Check user table
SELECT COUNT(*) FROM "Question" WHERE "examTypeId" = '1';  # Check questions
```

### Future Migrations

Whenever schema.prisma changes:

```bash
cd api

# Create migration
npx prisma migrate dev --name description_of_change

# This generates migration file in api/prisma/migrations/

# To apply to production:
export DATABASE_URL="postgresql://neondb_owner:PASSWORD@pgXXXX-pooler.neon.tech:5432/exam_app_prod?sslmode=require"
npx prisma migrate deploy

# Or push via git > Railway auto-deploys with Dockerfile running migrations
```

---

## Testing Post-Deployment

### Endpoint Testing

**Test health endpoint**:

```bash
RAILWAY_URL="https://api-[hash].railway.app"

curl "$RAILWAY_URL/health"
# Expected: {"status":"ok","timestamp":"2026-02-18T..."}
```

**Test integrity endpoint**:

```bash
curl -X POST "$RAILWAY_URL/api/integrity/verify" \
  -H "Content-Type: application/json" \
  -d '{"token":"test-token"}'
# Expected: {"success":false,"error":"..."} or {"success":true,"verdict":{...}} depending on implementation
```

### Database Connectivity Test

```bash
# From local machine:
export DATABASE_URL="postgresql://neondb_owner:PASSWORD@pgXXXX-pooler.neon.tech:5432/exam_app_prod?sslmode=require"

# Use Prisma to query:
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findMany().then(u => console.log('Users:', u.length)).catch(e => console.error(e)).finally(() => prisma.\$disconnect());
"
```

### Mobile App Integration

**Update mobile API config** (mobile/src/services/api.config.ts):

```typescript
const API_CONFIG = {
  isDev: __DEV__,
  baseURL: __DEV__ 
    ? 'http://localhost:3000'  // Local dev server
    : 'https://api-[hash].railway.app',  // Production Railway
};

export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: 10000,
  validateStatus: () => true,  // Don't throw on any status
});
```

**Test mobile app**:

```bash
cd mobile
npx expo start
# Select: a (Android) or i (iOS)
# App should:
# - Connect to production API
# - Fetch questions from /exam-types/[examTypeId]/questions
# - Submit exam attempts to /exam-attempts
# - Verify integrity via /api/integrity/verify
```

---

## Monitoring & Debugging

### Monitoring Dashboards

#### Railway Logs

```bash
# Go to Railway dashboard > api service > Logs
# Real-time logs for:
# - HTTP requests
# - Error stack traces
# - Database connection errors
# - Startup messages
```

**Common log entries**:

```
[10:30:45] GET /api/integrity/verify 200 45ms
[10:30:46] PrismaClientKnownRequestError: Unique constraint failed on `User.email`
[10:30:47] Database connected to exam_app_prod (pool size: 10)
```

#### Neon Metrics

```bash
# Go to Neon console > Project > Monitoring
# Metrics:
# - Connections: Current active connections (target: <10 for free tier)
# - Compute time: CPU usage (should be low for light traffic)
# - Storage: Database size (~100MB for 1M questions)
# - Auto-suspend: Tracks idle suspend/resume activity
```

### Error Tracking

#### Check Railway Logs for Deployment Issues

```bash
# Go to Railway > api service > Deployments > [latest] > Logs
# Look for:
# - "Build failed": npm install or npm run build errors
# - "Module not found": missing dependencies
# - "Port already in use": conflict with another service
# - "ENOTFOUND": database/API connectivity issues
```

#### Common Issues & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| `PrismaClientInitializationError: Can't reach database server` | DATABASE_URL invalid or Neon down | Verify DATABASE_URL in Railway Variables, check Neon status dashboard |
| `Error: Cannot find module '@prisma/client'` | Missing dependencies on build | Ensure `npm ci --only=production` in Dockerfile, include Prisma in package.json |
| `ENOENT: no such file or directory, open 'dist/main.js'` | Build command didn't run | Check `npm run build` completes, add `RUN npm run build` in Dockerfile |
| `POST /api/integrity/verify 404` | Health controller added but not imported in AppModule | Import HealthModule in app.module.ts |
| `Connection timeout` | Neon connection pool exhausted or auto-suspended | Reduce max_client_conn, wait for auto-resume (~1s), check idle timeout setting |

---

## Rollback Procedures

### Quick Rollback (Instant, Zero Downtime)

#### Option 1: Railway Rollback

```bash
# In Railway dashboard > api service > Deployments
# Click on [previous-working-deployment]
# Click "Rollback to this deployment"
# Takes 30 seconds, zero downtime
```

This automatically redeploys the previous Docker image without rebuilding.

#### Option 2: GitHub Rollback (if pushing broke API)

```bash
cd somewhere  # Any repo, not exam-app
git clone https://github.com/danilocasim/exam-app.git
cd exam-app

# Find last working commit
git log --oneline 003-play-integrity | head -10

# Revert to working state
git revert [commit-hash]  # Creates new commit
# or
git reset --hard [commit-hash]  # Destructive, only if safe

git push origin 003-play-integrity
# Railway auto-deploys new version (2-3 min)
```

### Database Rollback (Neon)

**If migration corrupted schema**:

1. **Option A: Neon Branch Rollback** (zero-downtime):
   ```bash
   # In Neon > Project > Branches
   # Create new branch from [last-working-backup]
   # Test migrations on new branch
   # Switch DATABASE_URL to new branch when ready
   ```

2. **Option B: Manual Restore**:
   ```bash
   # In Neon > Project > Backups
   # Click [date-of-valid-backup]
   # Create new database from backup
   # Test, then switch DATABASE_URL when ready
   ```

### Rollback Checklist

- [ ] Identify commit/deployment that introduced issue
- [ ] Deploy previous working version via Railway Deployments or git revert
- [ ] Test `/health` endpoint responds 200
- [ ] Test API endpoints return expected responses
- [ ] Check mobile app connects and works (if applicable)
- [ ] Monitor logs for new errors (5-10 min)
- [ ] Document incident: what broke, when, how fixed

---

## Production Checklist

### Pre-Live Deployment

- [ ] All tests passing locally: `cd api && npm test`
- [ ] Build succeeds locally: `npm run build`
- [ ] Database migrations tested locally: `npx prisma migrate dev`
- [ ] Environment variables configured in Railway (no .env in build!)
- [ ] Health endpoint working: `curl /health` returns expected format
- [ ] Integrity endpoint tested: `curl -X POST /api/integrity/verify` with mock token
- [ ] Mobile app updated with production Railway URL

### First 24 Hours Post-Launch

- [ ] Monitor Railway logs for errors (check every hour)
- [ ] Monitor Neon connection count (should stay <10)
- [ ] Test mobile app from multiple devices (iOS + Android)
- [ ] Check Play Store reviews/feedback for issues
- [ ] Monitor API response times (should be <500ms for most requests)
- [ ] Verify database backups automatically run (Neon default: daily)

### Ongoing Monitoring

- [ ] Set up alerts (optional: Sentry, Datadog, or Railway's built-in monitoring)
- [ ] Weekly review of logs for anomalies
- [ ] Monthly database size check (Neon dashboard)
- [ ] Test rollback procedure quarterly
- [ ] Document any deployment issues for future reference

### Cost Verification

**Expected monthly costs**:

| Service | Cost | Notes |
|---------|------|-------|
| Neon Free Tier | $0 | 10GB storage, auto-suspend enabled |
| Railway Free Tier | $0* | 512MB RAM, auto-pause if no traffic |
| Total | ~$0-20/mo | Upgrade only if exceeding free tier limits |

*Railway free tier includes: 100GB bandwidth/month, 5 project slots, community support.

**Upgrade triggers**:
- Neon: >10GB storage = $0.50/GB/month (upgrade at 20GB = ~$5/month)
- Railway: >512MB RAM or sustained traffic = $5/month+ for paid plan

**Cost optimization tips**:
1. Keep Neon auto-suspend enabled (5 minutes idle)
2. Use Railway free tier as long as possible (5 project slots)
3. Monitor Neon connection pool (prevent exhaustion)
4. Clean up old database branches (each uses storage quota)
5. Use Railway's GitHub integration for CI/CD (no extra cost)

---

## FAQ

**Q: How do I see logs from the deployed API?**  
A: Railway dashboard > api service > Logs. Scroll to find errors, or filter by timestamp.

**Q: Can I use a custom domain (e.g., api.example.com)?**  
A: Yes. Railway > Domains > Add Custom Domain. Requires DNS CNAME record update.

**Q: What if Neon goes down?**  
A: Neon has 99.9% uptime SLA. Free customers alsoget this. Use Neon's status dashboard to check: https://neon.statuspage.io

**Q: How do I scale for more traffic?**  
A: 
- Neon: Increase max connections (Settings > Connection pooling)
- Railway: Upgrade plan (Dashboard > Billing), or split into multiple services
- Consider caching (Redis) if traffic > 10,000 requests/day

**Q: Can I use the same Neon database for staging and production?**  
A: Not recommended. Create 2 Neon projects for isolation. Or use Neon's branch feature (create staging branch).

**Q: What's the backup strategy?**  
A: Neon auto-backups daily, retained for 7 days (free tier). Manual snapshots preserved until deleted.

---

## Support & Additional Resources

- **Railway Docs**: https://docs.railway.app
- **Neon Docs**: https://neon.tech/docs
- **Prisma Docs**: https://www.prisma.io/docs (database client)
- **GitHub Issues**: Report bugs in exam-app repo

**For Play Integrity Feature Questions**:
- See: [spec.md](spec.md) - Feature specification
- See: [plan.md](plan.md) - Implementation architecture
- See: [quickstart.md](quickstart.md) - Development setup

---

**Last Updated**: February 18, 2026  
**Maintainer**: Release Engineering Team  
**Status**: Production Deployment Guide ✅
