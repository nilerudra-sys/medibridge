from validator import validate_fhir_patient

# Test 1: Valid resource
valid_sample = {
    "resourceType": "Patient",
    "id": "P-9999",
    "gender": "female",
    "birthDate": "1990-01-01"
}
is_valid, msg = validate_fhir_patient(valid_sample)
print("Test 1 (Valid):", is_valid, "|", msg)
assert is_valid is True

# Test 2: Invalid resource (invalid gender code according to FHIR R4 value set)
invalid_gender_sample = {
    "resourceType": "Patient",
    "id": "P-9999",
    "gender": "alien"
}
is_valid, msg = validate_fhir_patient(invalid_gender_sample)
print("Test 2 (Invalid Gender):", is_valid, "|", msg[:100])
assert is_valid is False

# Test 3: Invalid birthDate format
invalid_date_sample = {
    "resourceType": "Patient",
    "id": "P-9999",
    "birthDate": "invalid-date-string"
}
is_valid, msg = validate_fhir_patient(invalid_date_sample)
print("Test 3 (Invalid Date):", is_valid, "|", msg[:100])
assert is_valid is False

print("\nValidation unit tests PASSED! Both valid and failure detection verified.")
