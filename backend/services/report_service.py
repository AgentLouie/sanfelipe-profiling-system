import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
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


# ===============================
# CHECK RESIDENT EXISTS
# (Now includes birthdate)
# ===============================
def resident_exists(db: Session, last_name, first_name, middle_name, birthdate, barangay):
    return db.query(ResidentProfile).filter(
        and_(
            func.upper(ResidentProfile.last_name) == last_name.upper(),
            func.upper(ResidentProfile.first_name) == first_name.upper(),
            func.upper(func.coalesce(ResidentProfile.middle_name, "")) == middle_name.upper(),
            ResidentProfile.birthdate == birthdate,
            ResidentProfile.barangay == barangay,
            ResidentProfile.is_deleted == False
        )
    ).first()


# ===============================
# CHECK IF FAMILY MEMBER EXISTS
# ===============================
def family_member_exists(db: Session, profile_id, lname, fname, rel):
    return db.query(FamilyMember).filter(
        and_(
            FamilyMember.profile_id == profile_id,
            FamilyMember.last_name == lname,
            FamilyMember.first_name == fname,
            FamilyMember.relationship == rel
        )
    ).first()


# ===============================
# CHECK IF SECTOR CHECKED
# ===============================
def is_checked(value):
    val = clean_str(value).lower()

    if val in ["\\", "/", "✓", "1", "yes", "y", "true"]:
        return True

    if val != "":
        return True

    return False


# ===============================
# MAIN IMPORT FUNCTION
# ===============================
def process_excel_import(file_content, db: Session):

    df = pd.read_excel(file_content, dtype=object, engine="openpyxl")
    df = df.replace({pd.NaT: None})
    df = df.where(pd.notnull(df), None)
    df.columns = df.columns.str.strip()

    success_count = 0
    skipped_duplicates = 0
    errors = []

    # ---------------------------
    # Sector Columns
    # ---------------------------
    possible_sectors = [
        "FARMER",
        "FISHERFOLK",
        "FISHERMAN/BANCA OWNER",
        "TODA",
        "BRGY BNS/BHW",
        "BRGY TANOD",
        "BRGY OFFICIAL",
        "LGU EMPLOYEE",
        "INDIGENOUS PEOPLE",
        "PWD",
        "OFW",
        "STUDENT",
        "SENIOR CITIZEN",
        "LIFEGUARD",
        "SOLO PARENT",
        "OTHERS"
    ]

    excel_columns = [col.strip().upper() for col in df.columns]

    sector_columns = [
        col for col in possible_sectors
        if col in excel_columns
    ]

    # ---------------------------
    # PROCESS EACH ROW
    # ---------------------------
    for index, row in df.iterrows():
        try:
            last_name = clean_str(row.get("LAST NAME"))
            first_name = clean_str(row.get("FIRST NAME"))
            middle_name = clean_str(row.get("MIDDLE NAME"))
            barangay = clean_str(row.get("BARANGAY"))

            if last_name == "" and first_name == "":
                continue

            birthdate = parse_date(row.get("BIRTHDATE"))

            # Duplicate check
            existing = resident_exists(
                db,
                last_name,
                first_name,
                middle_name,
                birthdate,
                barangay
            )

            if existing:
                skipped_duplicates += 1
                continue

            # Precinct (handles misspelling)
            precinct_no = ""
            for col in df.columns:
                if col.strip().upper() in ["PRECINT NO", "PRECINCT NO", "PRECINCT"]:
                    precinct_no = clean_str(row.get(col))
                    break

            # Sector processing
            active_sectors = []
            for col in sector_columns:
                if is_checked(row.get(col)):
                    active_sectors.append(col)

            sector_summary = ", ".join(active_sectors) if active_sectors else "None"

            # Spouse
            spouse_last = clean_str(row.get("LAST NAME.1"))
            spouse_first = clean_str(row.get("FIRST NAME.1"))
            spouse_middle = clean_str(row.get("MIDDLE NAME.1"))
            spouse_ext = clean_str(row.get("EXT NAME.1"))

            # Create resident
            resident = ResidentProfile(
                last_name=last_name.upper(),
                first_name=first_name.upper(),
                middle_name=middle_name.upper(),
                ext_name=clean_str(row.get("EXT NAME")),
                house_no=clean_str(row.get("HOUSE NO. / STREET")),
                purok=clean_str(row.get("PUROK/SITIO")),
                barangay=barangay,
                birthdate=birthdate,
                sex=clean_str(row.get("SEX")),
                civil_status=clean_str(row.get("CIVIL STATUS")),
                religion=clean_str(row.get("RELIGION")),
                occupation=clean_str(row.get("OCCUPATION")),
                contact_no=clean_str(row.get("CONTACT")),
                precinct_no=precinct_no,
                spouse_last_name=spouse_last,
                spouse_first_name=spouse_first,
                spouse_middle_name=spouse_middle,
                spouse_ext_name=spouse_ext,
                sector_summary=sector_summary
            )

            db.add(resident)
            db.flush()

            # ---------------------------
            # FAMILY MEMBERS
            # ---------------------------
            for i in range(1, 6):

                lname = ""
                fname = ""
                mname = ""
                rel = ""

                for col in df.columns:
                    clean_col = col.strip().upper()

                    if clean_col.startswith(f"{i}. LAST NAME"):
                        lname = clean_str(row.get(col))

                    if clean_col.startswith(f"{i}. FIRST NAME"):
                        fname = clean_str(row.get(col))

                    if clean_col.startswith(f"{i}. MIDDLE NAME"):
                        mname = clean_str(row.get(col))

                    if clean_col.startswith(f"{i}. RELATIONSHIP"):
                        rel = clean_str(row.get(col))

                if lname == "" and fname == "" and rel == "":
                    continue

                if family_member_exists(db, resident.id, lname, fname, rel):
                    continue

                db.add(FamilyMember(
                    profile_id=resident.id,
                    last_name=lname,
                    first_name=fname,
                    middle_name=mname,
                    relationship=rel
                ))

            success_count += 1

        except Exception as e:
            errors.append(f"Row {index+2}: {str(e)}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"added": 0, "errors": [str(e)]}

    return {
        "added": success_count,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors
    }
