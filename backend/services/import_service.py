import pandas as pd
import re
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.models.models import ResidentProfile


# ============================================
# CLEAN STRING
# ============================================
def clean_str(val):
    if val is None:
        return ""
    text = str(val).strip()
    if text.lower() in ["nan", "none", "null", "-", "na", "n/a"]:
        return ""
    return text


# ============================================
# PARSE DATE
# ============================================
def parse_date(date_val):
    if date_val is None or pd.isna(date_val):
        return None

    if isinstance(date_val, pd.Timestamp):
        return date_val.date()

    if isinstance(date_val, (int, float)):
        try:
            return pd.to_datetime(date_val, origin="1899-12-30", unit="D").date()
        except:
            return None

    try:
        return pd.to_datetime(clean_str(date_val)).date()
    except:
        return None


# ============================================
# MAIN IMPORT FUNCTION
# ============================================
def process_excel_import(file_content, db: Session):

    # Read Excel
    df = pd.read_excel(file_content, dtype=object, engine="openpyxl")

    # Clean dataframe
    df = df.replace({pd.NaT: None})
    df = df.where(pd.notnull(df), None)

    # Normalize headers
    df.columns = [
        re.sub(r'\s+', ' ', col.strip().upper())
        for col in df.columns
    ]

    success_count = 0
    skipped_duplicates = 0
    errors = []

    # Track duplicates INSIDE the file
    seen_in_file = set()

    residents_to_insert = []

    # ============================================
    # PROCESS ROWS
    # ============================================
    for index, row in df.iterrows():
        try:
            last_name = clean_str(row.get("LAST NAME")).upper()
            first_name = clean_str(row.get("FIRST NAME")).upper()
            middle_name = clean_str(row.get("MIDDLE NAME")).upper()
            barangay = clean_str(row.get("BARANGAY")).upper()

            if not last_name or not first_name:
                continue

            # Unique key (must match DB constraint)
            key = (last_name, first_name, middle_name, barangay)

            # Skip duplicates inside CSV
            if key in seen_in_file:
                skipped_duplicates += 1
                continue

            seen_in_file.add(key)

            birthdate = parse_date(row.get("BIRTHDATE"))

            residents_to_insert.append({
                "resident_code": "RES-" + uuid.uuid4().hex[:8].upper(),
                "is_deleted": False,
                "is_archived": False,
                "is_family_head": True,
                "is_active": True,
                "status": "Active",
                "last_name": last_name,
                "first_name": first_name,
                "middle_name": middle_name,
                "ext_name": clean_str(row.get("EXT NAME")),
                "house_no": clean_str(row.get("HOUSE NO. / STREET")),
                "purok": clean_str(row.get("PUROK/SITIO")),
                "barangay": barangay,
                "birthdate": birthdate,
                "sex": clean_str(row.get("SEX")),
                "civil_status": clean_str(row.get("CIVIL STATUS")),
                "religion": clean_str(row.get("RELIGION")),
                "occupation": clean_str(row.get("OCCUPATION")),
                "contact_no": clean_str(row.get("CONTACT")),
                "precinct_no": clean_str(row.get("PRECINT NO")),
                "sector_summary": None
            })

        except Exception as e:
            errors.append(f"Row {index+2}: {str(e)}")

    # ============================================
    # BULK INSERT WITH ON CONFLICT
    # ============================================
    if residents_to_insert:
        stmt = insert(ResidentProfile).values(residents_to_insert)

        stmt = stmt.on_conflict_do_nothing(
            index_elements=[
                "last_name",
                "first_name",
                "middle_name",
                "barangay"
            ]
        )

        result = db.execute(stmt)
        db.commit()

        inserted_count = result.rowcount
        success_count = inserted_count

        # Count DB-level duplicates
        skipped_duplicates += len(residents_to_insert) - inserted_count

    return {
        "added": success_count,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors
    }