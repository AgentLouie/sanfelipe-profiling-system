import pandas as pd
import re
from sqlalchemy.orm import Session
from app.models.models import ResidentProfile, FamilyMember


# ===============================
# CLEAN STRING
# ===============================
def clean_str(val):
    if val is None:
        return ""
    text = str(val).strip()
    if text.lower() in ["nan", "none", "null", "-", "na", "n/a"]:
        return ""
    return text


# ===============================
# PARSE DATE
# ===============================
def parse_date(date_val):
    if date_val is None or pd.isna(date_val):
        return None
    try:
        return pd.to_datetime(date_val).date()
    except:
        return None


# ===============================
# NORMALIZE COLUMN HEADERS
# ===============================
def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [
        re.sub(r'\s*[\(\n].*', '', col).strip().upper()
        for col in df.columns
    ]
    return df


# ===============================
# MAIN IMPORT FUNCTION (OPTIMIZED)
# ===============================
def process_excel_import(file_content, db: Session):

    # 🔥 If possible, use CSV instead of Excel for speed
    df = pd.read_csv(file_content)

    df = df.replace({pd.NaT: None})
    df = df.where(pd.notnull(df), None)
    df = normalize_columns(df)

    success_count = 0
    skipped_duplicates = 0
    errors = []

    # ----------------------------------------
    # 🔥 FETCH EXISTING RESIDENTS ONCE
    # ----------------------------------------
    existing_residents = {
        (
            r.last_name.upper(),
            r.first_name.upper(),
            (r.middle_name or "").upper(),
            r.barangay
        )
        for r in db.query(
            ResidentProfile.last_name,
            ResidentProfile.first_name,
            ResidentProfile.middle_name,
            ResidentProfile.barangay
        ).filter(ResidentProfile.is_deleted == False).all()
    }

    residents_to_add = []
    family_to_add = []

    # ----------------------------------------
    # PROCESS ROWS
    # ----------------------------------------
    for index, row in df.iterrows():
        try:
            last_name   = clean_str(row.get("LAST NAME")).upper()
            first_name  = clean_str(row.get("FIRST NAME")).upper()
            middle_name = clean_str(row.get("MIDDLE NAME")).upper()
            barangay    = clean_str(row.get("BARANGAY"))

            if last_name == "" and first_name == "":
                continue

            key = (last_name, first_name, middle_name, barangay)

            # 🔥 DUPLICATE CHECK IN MEMORY
            if key in existing_residents:
                skipped_duplicates += 1
                continue

            birthdate = parse_date(row.get("BIRTHDATE"))

            resident = ResidentProfile(
                last_name=last_name,
                first_name=first_name,
                middle_name=middle_name,
                ext_name=clean_str(row.get("EXTENSION NAME")),
                purok=clean_str(row.get("PUROK/SITIO")),
                barangay=barangay,
                birthdate=birthdate,
                sex=clean_str(row.get("SEX")),
                civil_status=clean_str(row.get("CIVIL STATUS")),
                contact_no=clean_str(row.get("PHONE NUMBER")),
                precinct_no=clean_str(row.get("PRECINCT NUMBER")),
                sector_summary=""
            )

            residents_to_add.append(resident)
            existing_residents.add(key)
            success_count += 1

        except Exception as e:
            errors.append(f"Row {index + 2}: {str(e)}")

    # ----------------------------------------
    # 🔥 BULK INSERT RESIDENTS
    # ----------------------------------------
    db.bulk_save_objects(residents_to_add)
    db.commit()

    return {
        "added": success_count,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
    }