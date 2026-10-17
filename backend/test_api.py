import httpx
import time
import json

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    print("=== TEST 1: Health & Root ===")
    r = client.get("/")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("[PASS] Root:", r.json())

    print("\n=== TEST 2: Dashboard Stats ===")
    r = client.get("/dashboard/stats")
    assert r.status_code == 200
    stats = r.json()
    print("[PASS] Stats:", stats)
    assert stats["total_patients"] >= 2
    assert stats["successfully_converted"] >= 2

    print("\n=== TEST 3: List Patients ===")
    r = client.get("/patients")
    assert r.status_code == 200
    patients = r.json()
    print(f"[PASS] Retrieved {len(patients)} patients")
    for p in patients:
        print(f"  - {p['patient_id']}: {p['full_name']} ({p['gender']}, DOB: {p['dob']})")

    print("\n=== TEST 4: Retrieve FHIR Resource for P-1001 ===")
    r = client.get("/fhir/Patient/P-1001")
    assert r.status_code == 200
    fhir_data = r.json()
    print("[PASS] FHIR Resource Type:", fhir_data.get("resourceType"))
    print("       FHIR ID:", fhir_data.get("id"))
    print("       FHIR Name:", fhir_data.get("name"))
    print("       FHIR Validation Status:", fhir_data.get("_medibridge_validation"))
    assert fhir_data["resourceType"] == "Patient"
    assert fhir_data["id"] == "P-1001"

    print("\n=== TEST 5: Retrieve FHIR Bundle ===")
    r = client.get("/fhir/Patient")
    assert r.status_code == 200
    bundle = r.json()
    print("[PASS] Bundle Resource Type:", bundle.get("resourceType"))
    print("       Total in Bundle:", bundle.get("total"))
    assert bundle["resourceType"] == "Bundle"
    assert bundle["total"] >= 2

    print("\n=== TEST 6: Sync Monitor Events ===")
    r = client.get("/sync/events")
    assert r.status_code == 200
    events = r.json()
    print(f"[PASS] Found {len(events)} sync events in change_log:")
    for ev in events:
        print(f"  - Event #{ev['id']}: Patient {ev['patient_id']} | Op: {ev['operation']} | Status: {ev['status']} | Validation: {ev['validation_status']}")

    print("\n=== TEST 7: Register a New Patient (End-to-End Workflow) ===")
    new_patient_payload = {
        "full_name": "Dr. Ananya Roy Sen",
        "dob": "1995-08-25",
        "gender": "female",
        "phone": "+91-98765-00000",
        "city": "Kolkata",
        "state": "West Bengal"
    }
    r = client.post("/patients", json=new_patient_payload)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    created = r.json()
    new_pid = created["patient_id"]
    print(f"[PASS] Registered new patient {new_pid} ({created['full_name']}) in PostgreSQL")

    print("Waiting 4 seconds for PostgreSQL trigger -> background worker to convert to FHIR...")
    time.sleep(4)

    # Verify FHIR resource was created
    r = client.get(f"/fhir/Patient/{new_pid}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    new_fhir = r.json()
    print(f"[PASS] FHIR resource generated for {new_pid}:")
    print(json.dumps(new_fhir, indent=2))
    assert new_fhir["name"][0]["family"] == "Sen"
    assert new_fhir["name"][0]["given"] == ["Dr.", "Ananya", "Roy"]
    assert new_fhir["gender"] == "female"
    assert new_fhir["birthDate"] == "1995-08-25"
    assert new_fhir["_medibridge_validation"] == "valid"

    print("\n=== TEST 8: Update Patient (Verify Change Detection & FHIR Regeneration) ===")
    update_payload = {
        "phone": "+91-91111-22222",
        "city": "Mumbai",
        "state": "Maharashtra"
    }
    r = client.put(f"/patients/{new_pid}", json=update_payload)
    assert r.status_code == 200
    print(f"[PASS] Updated patient {new_pid} in PostgreSQL (phone -> +91-91111-22222, city -> Mumbai)")

    print("Waiting 4 seconds for UPDATE trigger -> worker regeneration...")
    time.sleep(4)

    # Verify updated FHIR resource
    r = client.get(f"/fhir/Patient/{new_pid}")
    assert r.status_code == 200
    updated_fhir = r.json()
    print("[PASS] Regenerated FHIR resource telecom:", updated_fhir.get("telecom"))
    print("       Regenerated FHIR resource address:", updated_fhir.get("address"))
    assert updated_fhir["telecom"][0]["value"] == "+91-91111-22222"
    assert updated_fhir["address"][0]["city"] == "Mumbai"
    assert updated_fhir["address"][0]["state"] == "Maharashtra"

    # Verify sync monitor recorded both CREATE and UPDATE
    r = client.get(f"/sync/events?patient_id={new_pid}")
    assert r.status_code == 200
    patient_events = r.json()
    print(f"\n[PASS] Sync log for {new_pid} has {len(patient_events)} events:")
    for ev in patient_events:
        print(f"  - Event #{ev['id']}: Op: {ev['operation']} | Status: {ev['status']} | Validation: {ev['validation_status']}")
    ops = [ev["operation"] for ev in patient_events]
    assert "CREATE" in ops and "UPDATE" in ops

    print("\n==============================================")
    print("ALL 8 END-TO-END ACCEPTANCE TESTS PASSED! [SUCCESS]")
    print("==============================================")

if __name__ == "__main__":
    run_tests()
