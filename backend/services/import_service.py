import pandas as pd
import re
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.models import ResidentProfile


# ============================================
# Generate Resident Code
# ============================================
def generate_resident_code():
    return "RES-" + uuid.uuid4().hex[:8].upper()


# ============================================
# Clean String
# ============================================
def clean_str(val):
    if val is None:
        return ""
    text = str(val).strip()
    if text.lower() in ["nan", "none", "null", "-", "na", "n/a"]:
        return ""
    return text


# ============================================
# Parse Date
# ============================================
def parse_date(date_val):
    if date_val is None or pd.isna(date_val):
        return None
    try:
        return pd.to_datetime(date_val).date()
    except:
        return None


# ============================================
# Normalize Column Names (OLD + NEW FORMAT)
# ============================================
def normalize_columns(df: pd.DataFrame):
    new_columns = []
    for col in df.columns:
        col = col.strip().upper()
        col = re.sub(r"\s*\(.*\)", "", col)   # remove (...)
        col = col.replace("\n", " ").strip()   # flatten newlines
        col = col.replace("EXT NAME", "EXTENSION NAME")
        col = col.replace("PRECINT NO", "PRECINCT NUMBER")
        col = col.replace("CONTACT", "PHONE NUMBER")
        new_columns.append(col)
    df.columns = new_columns
    return df


# ============================================
# Safe Column Getter
# ============================================
def get_column(row, possible_names):
    for name in possible_names:
        if name in row.index:
            return row.get(name)
    return None


# ============================================
# MAIN IMPORT FUNCTION
# ============================================
def process_excel_import(file_content, filename: str, db: Session):

    # Detect file type
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(file_content)
    elif filename.lower().endswith(".xlsx"):
        df = pd.read_excel(file_content, dtype=object, engine="openpyxl")
    else:
        raise ValueError("Unsupported file format")

    df = df.replace({pd.NaT: None})
    df = df.where(pd.notnull(df), None)
    df = normalize_columns(df)

    success_count = 0
    skipped_duplicates = 0
    errors = []

    # ============================================
    # Fetch Existing Residents (1 Query Only)
    # ============================================
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

    # Track duplicates within this file
    file_duplicates: set = set()

    # ============================================
    # PROCESS ROWS
    # ============================================
    for index, row in df.iterrows():
        try:
            last_name  = clean_str(get_column(row, ["LAST NAME"])).upper()
            first_name = clean_str(get_column(row, ["FIRST NAME"])).upper()
            middle_name = clean_str(get_column(row, ["MIDDLE NAME"])).upper()
            barangay   = clean_str(get_column(row, ["BARANGAY"]))
            birthdate  = parse_date(get_column(row, ["BIRTHDATE"]))

            if not last_name or not first_name:
                continue

            key = (last_name, first_name, middle_name, barangay)

            # Skip if already in DB
            if key in existing_residents:
                skipped_duplicates += 1
                continue

            # Skip if duplicate within this file
            if key in file_duplicates:
                skipped_duplicates += 1
                continue

            file_duplicates.add(key)

            resident = ResidentProfile(
                resident_code=generate_resident_code(),

                # System
                is_deleted=False,
                is_archived=False,
                is_family_head=True,
                is_active=True,
                status="Active",

                # Personal
                last_name=last_name,
                first_name=first_name,
                middle_name=middle_name,
                ext_name=clean_str(get_column(row, ["EXTENSION NAME"])),

                # Address
                house_no=clean_str(get_column(row, ["HOUSE NO. / STREET"])),
                purok=clean_str(get_column(row, ["PUROK/SITIO"])),
                barangay=barangay,

                # Spouse
                spouse_last_name=None,
                spouse_first_name=None,
                spouse_middle_name=None,
                spouse_ext_name=None,

                # Demographics
                birthdate=birthdate,
                sex=clean_str(get_column(row, ["SEX"])),
                civil_status=clean_str(get_column(row, ["CIVIL STATUS"])),
                religion=clean_str(get_column(row, ["RELIGION"])),
                precinct_no=clean_str(get_column(row, ["PRECINCT NUMBER"])),

                # Work
                occupation=clean_str(get_column(row, ["OCCUPATION"])),
                contact_no=clean_str(get_column(row, ["PHONE NUMBER"])),

                # Sector
                sector_summary=None,
                other_sector_details=None,

                # Photo
                photo_url=None,
            )

            db.add(resident)

            # ── Flush row-by-row so a single duplicate doesn't
            #    kill the entire batch (unlike bulk_save_objects).
            try:
                db.flush()
                # Only add to the in-memory set AFTER a successful flush
                existing_residents.add(key)
                success_count += 1
            except IntegrityError:
                db.rollback()          # rolls back only this row
                skipped_duplicates += 1

        except Exception as e:
            errors.append(f"Row {index + 2}: {str(e)}")

    # ============================================
    # FINAL COMMIT
    # ============================================
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"added": 0, "skipped_duplicates": 0, "errors": [str(e)]}

    return {
        "added": success_count,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
    }