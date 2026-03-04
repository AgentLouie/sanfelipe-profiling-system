TRUNCATE TABLE resident_profiles RESTART IDENTITY CASCADE;
TRUNCATE family_members RESTART IDENTITY CASCADE;


SELECT DISTINCT barangay FROM resident_profiles;


SELECT * FROM family_members LIMIT 20;

DELETE FROM family_members;

ALTER TABLE resident_profiles
ADD CONSTRAINT uq_resident_identity
UNIQUE (last_name, first_name, middle_name, barangay);

SELECT DISTINCT barangay FROM resident_profiles ORDER BY barangay;

UPDATE resident_profiles
SET barangay = 'FARANAL'
WHERE UPPER(barangay) LIKE '%FARANAL%';

UPDATE resident_profiles
SET barangay = 'FARANAL'
WHERE UPPER(barangay) LIKE '%FARANAL%';

UPDATE resident_profiles

ALTER TABLE family_members
ADD COLUMN is_family_head BOOLEAN DEFAULT FALSE;
SET barangay = 'FARAÑAL'
WHERE upper(trim(barangay)) IN ('FARANAL', 'FARAÑAL');

-- Normalize Santo/Sto Niño variants to official
UPDATE resident_profiles
SET barangay = 'STO NIÑO'
WHERE upper(trim(barangay)) IN (
  'STO NIÑO',
  'STO NINO',
  'SANTO NIÑO',
  'SANTO NINO'
);

SELECT barangay, COUNT(*)
FROM resident_profiles
GROUP BY barangay
ORDER BY barangay;

SELECT DISTINCT barangay FROM resident_profiles ORDER BY barangay;

SELECT 
  barangay,
  LENGTH(barangay),
  OCTET_LENGTH(barangay)
FROM resident_profiles
WHERE barangay LIKE '%Ñ%'
GROUP BY barangay;

SELECT id, name FROM barangays ORDER BY name;

UPDATE barangays
SET name = 'FARAÑAL'
WHERE lower(name) = 'faranal';

UPDATE barangays
SET name = 'STO NIÑO'
WHERE lower(name) IN ('sto nino', 'santo nino');

SELECT house_no, COUNT(*) 
FROM resident_profiles
GROUP BY house_no
ORDER BY house_no;

SELECT DISTINCT house_no FROM resident_profiles LIMIT 10;

SELECT last_name, first_name, house_no
FROM resident_profiles
WHERE house_no IS NOT NULL
LIMIT 10;

UPDATE barangays
SET name = 'STO NIÑO'
WHERE name = 'Santo Niño';

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'resident_profiles';

SELECT spouse_first_name, spouse_last_name
FROM resident_profiles
WHERE spouse_first_name IS NOT NULL
OR spouse_last_name IS NOT NULL;

SELECT id, first_name, last_name, spouse_first_name, spouse_last_name
FROM resident_profiles
LIMIT 10;

SELECT spouse_last_name, spouse_first_name
FROM resident_profiles
WHERE last_name = 'DelaCruz';

SELECT DISTINCT sex FROM resident_profiles;

ALTER TABLE resident_profiles
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE resident_profiles
ADD COLUMN deleted_at TIMESTAMP;

SELECT id, first_name, last_name, is_deleted
FROM resident_profiles
ORDER BY id DESC;

SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'resident_profiles';

ALTER TABLE resident_profiles
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;

SELECT id, username, role FROM users;

ALTER TABLE resident_profiles
ADD COLUMN status VARCHAR DEFAULT 'Active';

ALTER TABLE resident_profiles
ADD COLUMN is_family_head BOOLEAN DEFAULT TRUE;

ALTER TABLE resident_profiles
ADD COLUMN status VARCHAR(50) DEFAULT 'Active';

ALTER TABLE resident_profiles
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;

UPDATE resident_profiles
SET is_family_head = TRUE
WHERE is_family_head IS NULL;

UPDATE resident_profiles
SET is_family_head = TRUE
WHERE is_family_head IS NULL;

UPDATE resident_profiles
SET status = 'Active'
WHERE status IS NULL;

UPDATE resident_profiles SET sex = 'N/A' WHERE sex IS NULL;

UPDATE family_members
SET last_name = NULL
WHERE UPPER(last_name) IN (
    'DAUGHTER',
    'SON',
    'ANAK',
    'CHILD',
    'KAPATID',
    'SISTER',
    'BROTHER',
	'NIECE'
);

SELECT * FROM audit_logs;

SELECT * FROM audit_logs ORDER BY timestamp DESC;

SELECT id, is_deleted, is_archived
FROM resident_profiles
WHERE id = 5;

SELECT id, is_deleted FROM resident_profiles WHERE id = 5;

SELECT current_database();

SELECT id, is_deleted
FROM resident_profiles
ORDER BY id;

SELECT current_database();
SELECT inet_server_addr();
SELECT inet_server_port();

ALTER TABLE users ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE resident_profiles
ADD COLUMN resident_code VARCHAR(20);

CREATE UNIQUE INDEX ix_resident_code
ON resident_profiles (resident_code);

UPDATE resident_profiles
SET resident_code = 'SF-' || LPAD(id::text, 6, '0')
WHERE resident_code IS NULL;

ALTER TABLE resident_profiles
ALTER COLUMN resident_code SET NOT NULL;

SELECT last_name, first_name FROM resident_profiles 
WHERE last_name = 'ABAD' AND is_deleted = FALSE
ORDER BY first_name ASC;

SELECT first_name, middle_name, last_name, birthdate, is_deleted
FROM resident_profiles
WHERE first_name = 'TEST';

SELECT *
FROM resident_profiles
WHERE UPPER(first_name) = 'TEST';

SELECT COUNT(*) FROM resident_profiles;

CREATE INDEX idx_resident_first_name ON resident_profiles (first_name);
CREATE INDEX idx_resident_middle_name ON resident_profiles (middle_name);
CREATE INDEX idx_resident_last_name ON resident_profiles (last_name);
CREATE INDEX idx_resident_code ON resident_profiles (resident_code);

ALTER TABLE resident_profiles
ADD COLUMN photo_url TEXT;

CREATE INDEX idx_resident_lookup 
ON resident_profiles (last_name, first_name, middle_name, barangay);

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'resident_profiles'::regclass;

ON CONFLICT (last_name, first_name, middle_name, barangay) DO NOTHING

UNIQUE (last_name, first_name, middle_name, barangay)

SELECT COUNT(*) 
FROM resident_profiles
WHERE last_name = 'NERY';
SELECT COUNT(*) 
FROM resident_profiles;
SELECT last_name, first_name, middle_name, barangay
FROM resident_profiles
WHERE last_name = 'NERY';

SELECT last_name, COUNT(*) 
FROM resident_profiles
GROUP BY last_name
ORDER BY COUNT(*) DESC
LIMIT 10;

INSERT INTO barangays (name)
SELECT DISTINCT barangay
FROM resident_profiles
WHERE barangay IS NOT NULL AND barangay <> ''
ON CONFLICT (name) DO NOTHING;

ALTER TABLE barangays
ADD CONSTRAINT uq_barangays_name UNIQUE (name);

SELECT * FROM barangays ORDER BY name;

UPDATE resident_profiles
SET barangay = 'STO NIÑO'
WHERE UPPER(REPLACE(barangay, '.', '')) IN ('STO NIÑO', 'STO NIÑO');

-- normalize everything else to uppercase
UPDATE resident_profiles
SET barangay = UPPER(barangay)
WHERE barangay IS NOT NULL;

SELECT barangay, COUNT(*)
FROM resident_profiles
GROUP BY barangay
ORDER BY barangay;

UPDATE resident_profiles
SET barangay = 'STO NIÑO'
WHERE barangay IS NOT NULL
  AND UPPER(REPLACE(barangay, '.', '')) LIKE 'STO%NIÑO%';

UPDATE resident_profiles
SET barangay = UPPER(TRIM(barangay))
WHERE barangay IS NOT NULL;

SELECT last_name, first_name, middle_name, barangay, COUNT(*) AS cnt
FROM resident_profiles
GROUP BY last_name, first_name, middle_name, barangay
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

TRUNCATE TABLE barangays RESTART IDENTITY;

INSERT INTO barangays (name)
SELECT DISTINCT barangay
FROM resident_profiles
WHERE barangay IS NOT NULL AND barangay <> ''
ORDER BY barangay;

ALTER TABLE barangays
ADD CONSTRAINT uq_barangays_name UNIQUE (name);

UPDATE barangays
SET name = 'STO NIÑO'
WHERE name = 'STO. NIÑO';

DELETE FROM barangays b
USING barangays b2
WHERE b.name = b2.name
  AND b.id > b2.id;

  -- 1) Delete the duplicate variant
DELETE FROM barangays
WHERE name = 'STO. NIÑO';

-- 2) (Optional) Normalize any other dotted Sto Niño variants just in case
DELETE FROM barangays
WHERE REPLACE(UPPER(name), '.', '') = 'STO NIÑO'
  AND name <> 'STO NIÑO';