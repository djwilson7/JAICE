import asyncio
import os
import sys
from pathlib import Path
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DEFAULT_MIGRATION_FILE = Path("supabase/migrations/20260525_create_resumes_table.sql")


def get_migration_file() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    env_path = os.getenv("MIGRATION_FILE")
    if env_path:
        return Path(env_path)
    return DEFAULT_MIGRATION_FILE

async def main():
    database_url = os.getenv("CLIENT_DATABASE_URL")
    if not database_url:
        print("Error: CLIENT_DATABASE_URL is not set.")
        return

    migration_file = get_migration_file()

    print(f"Connecting to database...")
    
    # Connect to the DB
    conn = await asyncpg.connect(database_url)
    try:
        db_name = await conn.fetchval("select current_database()")
        db_user = await conn.fetchval("select current_user")
        print(f"Connected to DB: {db_name} as user: {db_user}")

        if not migration_file.exists():
            print(f"Error: Migration file not found: {migration_file}")
            return

        print(f"Reading migration SQL from {migration_file}...")
        sql = migration_file.read_text(encoding="utf-8")

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
