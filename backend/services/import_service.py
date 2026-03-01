# app/services/import_service.py
# ------------------------------------------------------------
# Excel Import Service (Residents + Spouse + Family Members)
# Railway/Postgres-friendly:
# - PH date parsing (dayfirst=True)
# - Flexible column normalization
# - Flexible detection for family columns (supports "1. FIRST NAME", "1.FIRST NAME", "1 . FIRST NAME")
# - Inserts residents with ON CONFLICT DO NOTHING
# - Fetches resident IDs, then inserts family members (chunked)
# - Skips invalid family slots (requires FIRST NAME)
# - Returns family_added so your UI can show if family inserts are working
# ------------------------------------------------------------

from __future__ import annotations

import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import tuple_
from sqlalchemy.exc import SQLAlchemyError

from app.models.models import ResidentProfile, FamilyMember


# ===============================
# Helpers
# ===============================
def clean_str(val: Any) -> str:
    if val is None:
        return ""
    text = str(val).strip()
    if text.lower() in ["nan", "none", "null", "-", "na", "n/a"]:
        return ""
    return text


def get_any(row: pd.Series, *keys: str) -> str:
    for k in keys:
        v = row.get(k)
        if v is None:
            continue
        s = clean_str(v)
        if s != "":
            return s
    return ""


def parse_date(date_val: Any) -> Optional[Any]:
    """
    Parses Excel dates robustly:
    - supports pd.Timestamp
    - supports Excel serial numbers
    - supports strings like DD/MM/YYYY (PH common) using dayfirst=True
    """
    if date_val is None or pd.isna(date_val):
        return None

    if isinstance(date_val, pd.Timestamp):
        return date_val.date()

    if isinstance(date_val, (int, float)):
        try:
            return pd.to_datetime(date_val, origin="1899-12-30", unit="D").date()
        except Exception:
            return None

    s = clean_str(date_val)
    if not s:
        return None

    # PH common: DD/MM/YYYY
    try:
        return pd.to_datetime(s, dayfirst=True, errors="raise").date()
    except Exception:
        try:
            dt = pd.to_datetime(s, errors="coerce")
            return dt.date() if dt is not pd.NaT else None
        except Exception:
            return None


def is_checked(value: Any) -> bool:
    v = clean_str(value).lower()
    return v in ["\\", "/", "✓", "1", "yes", "y", "true"] or v != ""


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Unifies headers from OLD + NEW forms:
    - strips everything after first newline or '('
    - uppercases
    - normalizes common variants
    - IMPORTANT: keeps leading "1." / "2." etc so family member columns remain detectable
    """
    cols: List[str] = []
    for c in df.columns:
        c = str(c)

        # remove from first "(" or "\n" onward
        c = re.sub(r"\s*[\(\n].*", "", c)

        # normalize spaces
        c = re.sub(r"\s+", " ", c).strip().upper()

        # Standardize common variants
        c = c.replace("EXTENSION NAME", "EXT NAME")
        c = c.replace("CONTACT", "PHONE NUMBER")

        c = c.replace("PRECINCT NUMBER ", "PRECINCT NUMBER")
        c = c.replace("PRECINCT NUMBER.", "PRECINCT NUMBER")
        c = c.replace("PRECINCT NO.", "PRECINCT NUMBER")
        c = c.replace("PRECINT NO", "PRECINCT NUMBER")
        c = c.replace("PRECINT NO.", "PRECINCT NUMBER")

        cols.append(c)

    df.columns = cols
    return df


def chunked(items: List[Dict[str, Any]], size: int) -> List[List[Dict[str, Any]]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


# ===============================
# MAIN IMPORT
# ===============================
def process_excel_import(file_content, db: Session, sheet_name=None) -> Dict[str, Any]:
    df = pd.read_excel(
        file_content,
        sheet_name=(0 if sheet_name is None else sheet_name),
        dtype=object,
        engine="openpyxl",
    )

    df = df.replace({pd.NaT: None})
    df = df.where(pd.notnull(df), None)
    df = normalize_columns(df)

    success_count = 0
    skipped_duplicates = 0
    errors: List[str] = []

    # -------------------------------
    # Detect sector columns
    # -------------------------------
    possible_sectors = [
        "INDIGENOUS PEOPLE",
        "SENIOR CITIZEN",
        "PWD",
        "BRGY OFFICIAL",
        "BRGY OFFICIAL/EMPLOYEE",
        "BRGY BNS/BHW",
        "BRGY TANOD",
        "OFW",
        "SOLO PARENT",
        "FARMER",
        "FISHERFOLK",
        "FISHERMAN/BANCA OWNER",
        "LGU EMPLOYEE",
        "TODA",
        "STUDENT",
        "LIFEGUARD",
        "OTHERS",
    ]
    sector_columns = [c for c in possible_sectors if c in df.columns]

    # -------------------------------
    # Detect spouse columns (NEW profiled)
    # -------------------------------
    spouse_last_col = "LAST NAME.1" if "LAST NAME.1" in df.columns else None
    spouse_first_col = "FIRST NAME.1" if "FIRST NAME.1" in df.columns else None
    spouse_middle_col = "MIDDLE NAME.1" if "MIDDLE NAME.1" in df.columns else None
    spouse_ext_col = "EXT NAME.1" if "EXT NAME.1" in df.columns else None

    # -------------------------------
    # Detect family member columns
    # FIXED: allow "1. FIRST NAME" or "1.FIRST NAME" or "1 . FIRST NAME"
    # -------------------------------
    family_columns = [c for c in df.columns if re.match(r"^\d+\s*\.", str(c))]

    # Map member_no -> {FIELD: column_name}
    members_map: Dict[int, Dict[str, str]] = {}
    for col in family_columns:
        # Accept: "1. FIRST NAME" or "1.FIRST NAME"
        m = re.match(r"^(\d+)\s*\.\s*(.*)$", col)
        if not m:
            continue
        no = int(m.group(1))
        field = m.group(2).strip().upper()

        # normalize field names
        if "LAST NAME" in field:
            field = "LAST NAME"
        elif "FIRST NAME" in field:
            field = "FIRST NAME"
        elif "MIDDLE NAME" in field:
            field = "MIDDLE NAME"
        elif "EXT" in field:
            field = "EXT NAME"
        elif "RELATIONSHIP" in field:
            field = "RELATIONSHIP"
        else:
            continue

        members_map.setdefault(no, {})[field] = col

    # If members_map is empty, family insert will be impossible—capture as error for visibility
    if not members_map:
        errors.append(
            "No family member columns detected. Expected headers like '1. FIRST NAME', '1. RELATIONSHIP', etc."
        )

    # -------------------------------
    # Build rows for ResidentProfile insert
    # -------------------------------
    seen_in_file: set[Tuple[str, str, str, str]] = set()
    residents_to_insert: List[Dict[str, Any]] = []
    resident_keys_in_file: List[Tuple[str, str, str, str]] = []

    for index, row in df.iterrows():
        try:
            last_name = clean_str(row.get("LAST NAME")).upper()
            first_name = clean_str(row.get("FIRST NAME")).upper()
            middle_name = clean_str(row.get("MIDDLE NAME")).upper()
            barangay = clean_str(row.get("BARANGAY")).upper()

            if not last_name or not first_name:
                continue

            key = (last_name, first_name, middle_name, barangay)
            if key in seen_in_file:
                skipped_duplicates += 1
                continue
            seen_in_file.add(key)
            resident_keys_in_file.append(key)

            birthdate = parse_date(row.get("BIRTHDATE"))

            # sectors -> summary
            active_sectors = [c for c in sector_columns if is_checked(row.get(c))]
            sector_summary = ", ".join(active_sectors) if active_sectors else None

            spouse_last = clean_str(row.get(spouse_last_col)).upper() if spouse_last_col else ""
            spouse_first = clean_str(row.get(spouse_first_col)).upper() if spouse_first_col else ""
            spouse_middle = clean_str(row.get(spouse_middle_col)).upper() if spouse_middle_col else ""
            spouse_ext = clean_str(row.get(spouse_ext_col)).upper() if spouse_ext_col else ""

            residents_to_insert.append(
                {
                    "resident_code": "RES-" + uuid.uuid4().hex[:8].upper(),
                    "is_deleted": False,
                    "is_archived": False,
                    "is_family_head": True,
                    "is_active": True,
                    "status": "Active",
                    "last_name": last_name,
                    "first_name": first_name,
                    "middle_name": middle_name,
                    "ext_name": clean_str(row.get("EXT NAME")).upper() or None,
                    "house_no": clean_str(row.get("HOUSE NO. / STREET")) or None,
                    "purok": clean_str(row.get("PUROK/SITIO")) or clean_str(row.get("PUROK/SITIO ")) or "",
                    "barangay": barangay,
                    "birthdate": birthdate,
                    "sex": clean_str(row.get("SEX")),
                    "civil_status": clean_str(row.get("CIVIL STATUS")) or None,
                    "religion": clean_str(row.get("RELIGION")) or None,
                    "occupation": clean_str(row.get("OCCUPATION")) or None,
                    "contact_no": clean_str(row.get("PHONE NUMBER")) or None,
                    "precinct_no": get_any(row, "PRECINCT NUMBER", "PRECINCT NO", "PRECINT NO", "PRECINCT") or None,
                    # spouse fields
                    "spouse_last_name": spouse_last or None,
                    "spouse_first_name": spouse_first or None,
                    "spouse_middle_name": spouse_middle or None,
                    "spouse_ext_name": spouse_ext or None,
                    "sector_summary": sector_summary,
                }
            )

        except Exception as e:
            errors.append(f"Row {index + 2}: {str(e)}")

    # -------------------------------
    # Insert residents
    # -------------------------------
    inserted_count = 0
    if residents_to_insert:
        stmt = insert(ResidentProfile).values(residents_to_insert)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["last_name", "first_name", "middle_name", "barangay"]
        )

        try:
            result = db.execute(stmt)
            db.commit()
            inserted_count = result.rowcount or 0
            success_count = inserted_count
            skipped_duplicates += (len(residents_to_insert) - inserted_count)
        except SQLAlchemyError as e:
            db.rollback()
            return {
                "added": 0,
                "family_added": 0,
                "skipped_duplicates": skipped_duplicates,
                "errors": [f"Resident insert error: {str(e)}"],
            }

    # -------------------------------
    # Fetch IDs for residents in this file (for family members)
    # -------------------------------
    resident_id_map: Dict[Tuple[str, str, str, str], int] = {}
    if resident_keys_in_file:
        try:
            rows = (
                db.query(
                    ResidentProfile.id,
                    ResidentProfile.last_name,
                    ResidentProfile.first_name,
                    ResidentProfile.middle_name,
                    ResidentProfile.barangay,
                )
                .filter(
                    tuple_(
                        ResidentProfile.last_name,
                        ResidentProfile.first_name,
                        ResidentProfile.middle_name,
                        ResidentProfile.barangay,
                    ).in_(resident_keys_in_file)
                )
                .all()
            )

            for rid, ln, fn, mn, br in rows:
                resident_id_map[(ln.upper(), fn.upper(), (mn or "").upper(), br.upper())] = rid
        except SQLAlchemyError as e:
            db.rollback()
            return {
                "added": success_count,
                "family_added": 0,
                "skipped_duplicates": skipped_duplicates,
                "errors": errors + [f"Resident ID fetch error: {str(e)}"],
            }

    # -------------------------------
    # Build family_members rows
    # Key fixes:
    # - require FIRST NAME (prevents NOT NULL / invalid inserts)
    # - flexible family column detection above
    # -------------------------------
    family_to_insert: List[Dict[str, Any]] = []

    # If members_map is empty, skip family processing entirely (but return errors)
    if members_map:
        for index, row in df.iterrows():
            try:
                last_name = clean_str(row.get("LAST NAME")).upper()
                first_name = clean_str(row.get("FIRST NAME")).upper()
                middle_name = clean_str(row.get("MIDDLE NAME")).upper()
                barangay = clean_str(row.get("BARANGAY")).upper()

                if not last_name or not first_name:
                    continue

                key = (last_name, first_name, middle_name, barangay)
                resident_id = resident_id_map.get(key)
                if not resident_id:
                    continue

                for member_no in sorted(members_map.keys()):
                    cols = members_map[member_no]

                    lname = clean_str(row.get(cols.get("LAST NAME", ""))).upper()
                    fname = clean_str(row.get(cols.get("FIRST NAME", ""))).upper()
                    mname = clean_str(row.get(cols.get("MIDDLE NAME", ""))).upper()
                    ext = clean_str(row.get(cols.get("EXT NAME", ""))).upper()
                    rel = clean_str(row.get(cols.get("RELATIONSHIP", ""))).upper()

                    # MUST have first name
                    if fname == "":
                        continue

                    # default lname to household last name if empty
                    if lname == "":
                        lname = last_name

                    family_to_insert.append(
                        {
                            "profile_id": resident_id,
                            "last_name": lname,
                            "first_name": fname,
                            "middle_name": (mname or None),
                            "ext_name": (ext or None),
                            "relationship": (rel or None),
                            "is_active": True,
                            "is_family_head": False,
                        }
                    )

            except Exception as e:
                errors.append(f"Family row {index + 2}: {str(e)}")

    # -------------------------------
    # Insert family members (chunked)
    # -------------------------------
    family_inserted = 0
    if family_to_insert:
        try:
            for part in chunked(family_to_insert, 1000):
                result = db.execute(insert(FamilyMember).values(part))
                db.commit()
                family_inserted += result.rowcount or 0
        except SQLAlchemyError as e:
            db.rollback()
            errors.append(f"Family insert error: {str(e)}")

    return {
        "added": success_count,
        "family_added": family_inserted,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
    }