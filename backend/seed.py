"""
seed.py — Inserts two synthetic demo patients into the database.
Run after the DB is initialised: python seed.py

Demo data is fictional and for demonstration purposes only.
"""
from __future__ import annotations
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://medibridge:medibridge_pass@localhost:5432/medibridge"
)

DEMO_PATIENTS = [
    {
        "patient_id": "P-1001",
        "full_name": "Asha Rao",
        "dob": "1998-04-12",
        "gender": "female",
        "phone": "+91-90000-10001",
        "city": "Pune",
        "state": "Maharashtra",
    },
    {
        "patient_id": "P-1002",
        "full_name": "Rohan Kumar Sharma",
        "dob": "1985-11-23",
        "gender": "male",
        "phone": "+91-98765-43210",
        "city": "Bengaluru",
        "state": "Karnataka",
    },
]


async def seed():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        for p in DEMO_PATIENTS:
            existing = await conn.fetchval(
                "SELECT id FROM patients WHERE patient_id = $1", p["patient_id"]
            )
            if existing:
                print(f"[SKIP] Patient {p['patient_id']} already exists.")
                continue

            await conn.execute(
                """
                INSERT INTO patients (patient_id, full_name, dob, gender, phone, city, state)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                p["patient_id"],
                p["full_name"],
                p["dob"],
                p["gender"],
                p["phone"],
                p["city"],
                p["state"],
            )
            print(f"[OK]   Inserted demo patient {p['patient_id']} — {p['full_name']}")
    finally:
        await conn.close()
    print("\nDemo seed complete. Triggers will have created change_log entries.")
    print("The background worker will process them within a few seconds of starting.")


if __name__ == "__main__":
    asyncio.run(seed())
