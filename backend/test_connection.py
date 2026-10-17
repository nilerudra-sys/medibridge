import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://medibridge:medibridge_pass@localhost:5432/medibridge")

async def test():
    print(f"Connecting to {DATABASE_URL}...")
    conn = await asyncpg.connect(DATABASE_URL)
    tables = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    table_names = [t["table_name"] for t in tables]
    print("Tables found:", table_names)

    # Check triggers
    triggers = await conn.fetch("SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public'")
    print("Triggers found:")
    for tr in triggers:
        print(f" - {tr['trigger_name']} on {tr['event_object_table']} ({tr['event_manipulation']})")

    patients = await conn.fetch("SELECT patient_id, full_name, dob, gender FROM patients")
    print(f"Patients in DB ({len(patients)}):", [dict(p) for p in patients])

    changes = await conn.fetch("SELECT id, patient_id, operation, status FROM change_log")
    print(f"Change log entries ({len(changes)}):", [dict(c) for c in changes])

    await conn.close()

if __name__ == "__main__":
    asyncio.run(test())
