# Railway Deploy Hook: Prisma Migrate
# This script ensures your Neon database schema is up to date after each deployment.

# Add this as a post-deploy script in Railway settings or run manually in the shell.

npx prisma migrate deploy --schema=api/prisma/schema.prisma
