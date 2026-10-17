-- MediBridge Database Schema
-- PostgreSQL 15

-- ============================================================
-- PATIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
    id            SERIAL PRIMARY KEY,
    patient_id    VARCHAR(20) UNIQUE NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    dob           DATE NOT NULL,
    gender        VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    phone         VARCHAR(30),
    city          VARCHAR(100),
    state         VARCHAR(100),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHANGE LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS change_log (
    id                SERIAL PRIMARY KEY,
    patient_id        VARCHAR(20) NOT NULL,
    operation         VARCHAR(10) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE')),
    event_ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    validation_status VARCHAR(20) CHECK (validation_status IN ('valid', 'invalid', 'skipped', NULL)),
    error_details     TEXT
);

-- ============================================================
-- FHIR RESOURCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS fhir_resources (
    id                 SERIAL PRIMARY KEY,
    patient_id         VARCHAR(20) UNIQUE NOT NULL,
    fhir_json          JSONB NOT NULL,
    generated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validation_outcome VARCHAR(20) CHECK (validation_outcome IN ('valid', 'invalid', 'skipped'))
);

-- ============================================================
-- TRIGGER: Auto-update updated_at on patients
-- ============================================================
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON patients;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================
-- TRIGGER: Log INSERT on patients → change_log
-- ============================================================
CREATE OR REPLACE FUNCTION trg_log_patient_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO change_log (patient_id, operation, status)
    VALUES (NEW.patient_id, 'CREATE', 'pending');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_patient_insert ON patients;
CREATE TRIGGER log_patient_insert
    AFTER INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION trg_log_patient_insert();

-- ============================================================
-- TRIGGER: Log UPDATE on patients → change_log
-- ============================================================
CREATE OR REPLACE FUNCTION trg_log_patient_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO change_log (patient_id, operation, status)
    VALUES (NEW.patient_id, 'UPDATE', 'pending');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_patient_update ON patients;
CREATE TRIGGER log_patient_update
    AFTER UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION trg_log_patient_update();

-- ============================================================
-- INDEX: Speed up change_log polling
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_change_log_status ON change_log(status);
CREATE INDEX IF NOT EXISTS idx_change_log_patient_id ON change_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_patient_id ON fhir_resources(patient_id);
