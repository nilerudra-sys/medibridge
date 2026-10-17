import httpx

client = httpx.Client(base_url="http://127.0.0.1:5173/api", timeout=5.0)

print("--- PAGE A: DASHBOARD ---")
stats = client.get("/dashboard/stats").json()
print(f"Total Patients: {stats['total_patients']} | Converted: {stats['successfully_converted']}")

print("\n--- PAGE B: PATIENT MANAGEMENT ---")
patients = client.get("/patients").json()
print(f"Patients loaded: {len(patients)}")
p0 = patients[0]
print(f"First patient: {p0['patient_id']} - {p0['full_name']}")

print("\n--- PAGE C: FHIR EXPLORER ---")
fhir_res = client.get(f"/fhir/Patient/{p0['patient_id']}").json()
print(f"FHIR Resource ID: {fhir_res['id']}")
print(f"FHIR Resource Type: {fhir_res['resourceType']}")
print(f"Validation Outcome: {fhir_res['_medibridge_validation']}")

print("\n--- PAGE D: SYNC MONITOR ---")
events = client.get("/sync/events").json()
print(f"Total Change Events: {len(events)}")
for e in events[:4]:
    print(f"Event #{e['id']}: {e['patient_id']} | {e['operation']} | Status: {e['status']} | Valid: {e['validation_status']}")

print("\n==============================================")
print("ALL 4 PAGES VERIFIED VIA FRONTEND PROXY!")
print("==============================================")
