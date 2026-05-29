import asyncio
import os
from pathlib import Path
import asyncpg
from dotenv import load_dotenv

load_dotenv()

# We can specify migration file via argument or environment, default to our new migration
MIGRATION_FILE = Path("supabase/migrations/20260525_create_resumes_table.sql")

async def main():
    database_url = os.getenv("CLIENT_DATABASE_URL")
    if not database_url:
        print("Error: CLIENT_DATABASE_URL is not set.")
        return

    print(f"Connecting to database...")
    
    # Connect to the DB
    conn = await asyncpg.connect(database_url)
    try:
        db_name = await conn.fetchval("select current_database()")
        db_user = await conn.fetchval("select current_user")
        print(f"Connected to DB: {db_name} as user: {db_user}")

        if not MIGRATION_FILE.exists():
            print(f"Error: Migration file not found: {MIGRATION_FILE}")
            return

        print(f"Reading migration SQL from {MIGRATION_FILE}...")
        sql = MIGRATION_FILE.read_text(encoding="utf-8")

        print("Executing migration transaction...")
        async with conn.transaction():
            await conn.execute(sql)
        
        print("Migration applied successfully!")
    except Exception as e:
        print(f"FATAL: Migration failed: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
