import pandas as pd
import re
import uuid
from sqlalchemy.orm import Session
from app.models.models import ResidentProfile


def generate_resident_code():
    return "RES-" + uuid.uuid4().hex[:8].upper()


def clean_str(val):
    if val is None:
        return ""
    text = str(val).strip()
    if text.lower() in ["nan", "none", "null", "-", "na", "n/a"]:
        return ""
    return text


def parse_date(date_val):
    if date_val is None or pd.isna(date_val):
        return None
    try:
        return pd.to_datetime(date_val).date()
    except:
        return None


def normalize_columns(df: pd.DataFrame):
    df.columns = [
        re.sub(r'\s*[\(\n].*', '', col).strip().upper()
        for col in df.columns
    ]
    return df


def process_excel_import(file_content, db: Session):

    df = pd.read_excel(file_content, dtype=object, engine="openpyxl")
    df = df.replace({pd.NaT: None})
    df = df.where(pd.notnull(df), None)
    df = normalize_columns(df)

    success_count = 0
    skipped_duplicates = 0
    errors = []

    # 🔥 Fetch existing residents once (based on UniqueConstraint)
    existing_residents = {
        (
            r.last_name.upper(),
            r.first_name.upper(),
            r.birthdate,
            r.barangay
        )
        for r in db.query(
            ResidentProfile.last_name,
            ResidentProfile.first_name,
            ResidentProfile.birthdate,
            ResidentProfile.barangay
        ).filter(ResidentProfile.is_deleted == False).all()
    }

    residents_to_add = []

    for index, row in df.iterrows():
        try:
            last_name = clean_str(row.get("LAST NAME")).upper()
            first_name = clean_str(row.get("FIRST NAME")).upper()
            middle_name = clean_str(row.get("MIDDLE NAME")).upper()
            barangay = clean_str(row.get("BARANGAY"))
            birthdate = parse_date(row.get("BIRTHDATE"))

            if not last_name or not first_name:
                continue

            key = (last_name, first_name, birthdate, barangay)

            if key in existing_residents:
                skipped_duplicates += 1
                continue

            resident = ResidentProfile(
                resident_code=generate_resident_code(),

                # Required defaults
                is_deleted=False,
                is_archived=False,
                is_family_head=True,
                is_active=True,
                status="Active",

                # Personal
                last_name=last_name,
                first_name=first_name,
                middle_name=middle_name,
                ext_name=clean_str(row.get("EXTENSION NAME")),

                # Address
                house_no=None,
                purok=clean_str(row.get("PUROK/SITIO")),
                barangay=barangay,

                # Spouse
                spouse_last_name=None,
                spouse_first_name=None,
                spouse_middle_name=None,
                spouse_ext_name=None,

                # Demographics
                birthdate=birthdate,
                sex=clean_str(row.get("SEX")),
                civil_status=clean_str(row.get("CIVIL STATUS")),
                religion=None,
                precinct_no=clean_str(row.get("PRECINCT NUMBER")),

                # Work
                occupation=None,
                contact_no=clean_str(row.get("PHONE NUMBER")),

                # Sector
                sector_summary=None,
                other_sector_details=None,

                # Photo
                photo_url=None
            )

            residents_to_add.append(resident)
            existing_residents.add(key)
            success_count += 1

        except Exception as e:
            errors.append(f"Row {index+2}: {str(e)}")

    # 🔥 Bulk insert
    db.bulk_save_objects(residents_to_add)
    db.commit()

    return {
        "added": success_count,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors
    }