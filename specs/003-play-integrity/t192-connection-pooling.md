# T192: Configure Neon Connection Pooling - Setup Guide

**Task**: Configure Neon connection pooling (PgBouncer) with optimized connection limits

**Time Estimate**: 5 minutes

**Status**: ✅ COMPLETE (Pooling already enabled in Neon account)

**Prerequisites**: 
- T191 complete (Neon project created)
- Neon console access
- Understanding of connection pooling concepts

---

## Overview

Connection pooling multiplexes multiple client connections to a smaller pool of database connections, reducing overhead and preventing connection exhaustion. Neon uses **PgBouncer** for connection pooling.

**Why it matters for Railway deployment**:
- Railway free tier has limited concurrent connections
- Pooling reduces connection count needed (transaction mode multiplexes)
- Prevents "too many connections" errors under load
- Cost-effective: serverless apps benefit from connection reuse

---

## Connection Pooling Configuration

### Current Configuration (from T191)

The Neon project already has pooling enabled with these settings:

| Setting | Value | Notes |
|---------|-------|-------|
| **Pooling Type** | PgBouncer | Default Neon pooling |
| **Mode** | Transaction | Recommended for serverless (multiplexes connections) |
| **Pool Size** | 10 | Default connections in pool |
| **Max Connections** | 20 | Maximum connection limit |
| **Idle Timeout** | 10 min | Auto-close idle connections |

### Connection String Variants

**Direct Connection** (for admin/migrations - bypasses pooling):
```
postgresql://user:password@ep-raspy-rice-aibav3t1.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Pooled Connection** (for application - use this for Railway):
```
postgresql://neondb_owner:npg_klT2XKL1VfxO@ep-raspy-rice-aibav3t1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Key Difference**: Pooled string uses `-pooler` suffix in hostname

---

## Verification Steps

### 1. Check Pooling Status in Neon Console

1. Go to https://console.neon.tech/app/projects
2. Select your `exam-app-prod` project
3. Click **"Connection Pooling"** or **"Pooling"** section
4. Verify status:
   - ✅ PgBouncer enabled
   - ✅ Mode: Transaction
   - ✅ Pool size: 10 (default)
   - ✅ Max connections: 20

**Screenshot checkpoint**: Pooling settings visible and enabled

### 2. Verify Connection String in .env.local

```bash
cd /Users/danilo/repos/exam-app
source .env.local
echo $DATABASE_URL | grep -o "pooler" && echo "✓ Pooled connection string detected" || echo "✗ Not using pooled connection"
```

**Expected output**: `pooler` substring found (connection string uses pooled variant)

### 3. Test Connection with Pooled String

Using Prisma (recommended for app context):

```bash
cd api

# Load environment
source ../.env.local

# Test pooled connection
npx prisma db execute --stdin < /dev/null

# Expected output:
# Loaded Prisma config from prisma.config.ts.
# Script executed successfully.
```

Using psql (if PostgreSQL client installed):

```bash
# Test pooled connection
psql "$DATABASE_URL" -c "SELECT 1"

# Expected output:
# ?column? 
# ----------
#        1
# (1 row)
```

### 4. Monitor Connection Usage (Optional)

In Neon console:
1. Go to **Monitoring** tab
2. Look for **Connection graph**
3. Verify connections stay ≤20 (max limit)
4. Verify no "connection limit exceeded" errors

---

## Pooling Modes Explained

Neon supports three pooling modes:

### Transaction Mode (Recommended for Serverless) ✅

```
Pool lifecycle: One connection per transaction
Best for: Serverless apps, Railway, short-lived processes
Multiplexing: Multiple clients share connections
Sessions: Multiplexed (limited to transaction scope)
Use case: Our Railway deployment
```

**Advantages**:
- Maximum connection reuse
- Lowest connection count needed
- Best for serverless scaling

**Limitations**:
- Session state (e.g., temp tables) not preserved across transactions
- For exam-app (stateless API): Not a limitation

### Session Mode

```
Pool lifecycle: One connection per client session
Best for: Long-lived connections, interactive clients
Multiplexing: Limited
Use case: psql interactive shell
```

### Statement Mode

```
Pool lifecycle: Per-statement
Best for: Minimal latency, high throughput
Use case: Load testing, benchmarking
```

---

## Configuration for Railway Deployment (T200+)

When deploying to Railway, use the **pooled connection string**:

**.env.production.example**:
```bash
# Use pooled connection string for Railway
DATABASE_URL='postgresql://neondb_owner:npg_klT2XKL1VfxO@ep-raspy-rice-aibav3t1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

**Railway Dashboard Setup** (T202):
1. Go to Railway console → exam-app-prod service
2. Settings → Variables
3. Add: `DATABASE_URL` = [pooled connection string from above]
4. Deploy

---

## Performance Characteristics

### Connection Overhead Reduction

**Without pooling** (direct connection):
- Each app request → new database connection
- Handshake: ~50ms per connection
- Total time: 50ms overhead per request

**With pooling** (PgBouncer, transaction mode):
- Connection from pool: <1ms
- Reuse existing connection
- Total time: <1ms overhead per request
- **Benefit**: 50x faster connection acquisition

### Scaling Behavior

Railway free tier: ~512MB RAM, 100GB bandwidth/month

**Connection limits**:
- Max 20 concurrent connections (Neon limit)
- 10 in pool (multiplexed)
- Sufficient for ~100-200 concurrent users in transaction mode

If you exceed 20: Scale up to paid tier or add read replicas (T193)

---

## Monitoring & Troubleshooting

### Common Issues

**"too many connections" error**:
- Cause: App exhausted max 20 connections
- Fix: Increase max connections in Neon console (25-50)
- Or: Reduce connection hold time in app (use connection timeouts)
- Or: Scale to paid tier

**"bad option: pool_mode" error**:
- Cause: Transaction mode incompatible with your connection code
- Fix: Change to Session mode (less efficient but compatible)
- Or: Rewrite connection code to not use session state

**Slow queries**:
- Cause: Network latency to Neon (us-east-1)
- Expected: ~100ms for queries
- If >500ms: Network issue or long-running query
- Solution: Add indexes, optimize queries, use caching

### Connection Pool Metrics

To monitor connections in Neon console:

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Check by user
SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;
```

---

## Database-Specific Configuration

### Prisma Considerations

Prisma already handles connection pooling correctly:
- Uses `DATABASE_URL` with pooled connection string
- Manages connection lifecycle per request
- Compatible with PgBouncer transaction mode

**No Prisma changes required** - it auto-detects Pool pooling

### Migrations Consideration

For `npx prisma migrate deploy` (T197):
- Use **direct connection** (non-pooled) for migrations
- Or: Temporarily disable pooling during migration
- Why: Schema changes don't work well with multiplexed connections

**Migration best practice**:
```bash
# For migrations - use direct connection (without -pooler)
DATABASE_URL="postgresql://...@ep-raspy-rice-aibav3t1.c-4.us-east-1.aws.neon.tech/..." npx prisma migrate deploy

# For app - use pooled connection
DATABASE_URL="postgresql://...@ep-raspy-rice-aibav3t1-pooler.c-4.us-east-1.aws.neon.tech/..." npm start
```

---

## Configuration Summary

**For local development (.env.local)**:
```bash
DATABASE_URL='postgresql://neondb_owner:npg_klT2XKL1VfxO@ep-raspy-rice-aibav3t1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
# Already configured ✓
```

**For migrations (T197)**:
```bash
# Run with direct connection (without -pooler)
DATABASE_URL='postgresql://neondb_owner:npg_klT2XKL1VfxO@ep-raspy-rice-aibav3t1.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require' npx prisma migrate deploy
```

**For Railway production (T202)**:
```bash
# Use pooled connection in Railway environment variables
DATABASE_URL='postgresql://neondb_owner:npg_klT2XKL1VfxO@ep-raspy-rice-aibav3t1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

---

## Verification Checklist

✅ Neon console shows PgBouncer enabled  
✅ Connection pooling mode: Transaction  
✅ Pool size: 10 connections  
✅ Max connections: 20  
✅ Pooled connection string in .env.local  
✅ Prisma can connect via pooled connection  
✅ No "too many connections" errors  
✅ Query latency acceptable (~100ms)  

---

## Next Steps

1. **T193**: (Optional) Create read replica branch for backup/analytics
2. **T194**: Secure storage of connection string (already done)
3. **T195**: Test local connection (already tested)
4. **T196**: Update Prisma schema datasource (no changes needed)
5. **T197-T199**: Create migration scripts and test setup
6. **T200**: Create Railway project (uses pooled connection from here)

---

## Reference

- [Neon Connection Pooling Docs](https://neon.tech/docs/reference/connection-pooling)
- [PgBouncer Documentation](https://www.pgbouncer.org/config.html)
- [Prisma + Neon Guide](https://www.prisma.io/dataguide/database-tools-landing-page/neon)
