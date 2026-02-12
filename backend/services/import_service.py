import pandas as pd
from sqlalchemy.orm import Session
from models import ResidentProfile, FamilyMember  # <--- MAKE SURE FamilyMember IS IMPORTED
from datetime import datetime
import io

def clean_str(val):
    if pd.isna(val) or val is None:
        return ""
    text = str(val).strip()
    if text.lower() in ['nan', 'none', 'null', '0', '0.0']: # Added 0 check
        return ""
    return text

def parse_date(date_val):
    if pd.isna(date_val) or str(date_val).strip() == "":
        return None
    
    # 1. Handle Excel/Pandas Timestamp objects
    if isinstance(date_val, (pd.Timestamp, datetime)):
        return date_val.date()

    text_val = str(date_val).strip()
    # Filter out garbage
    if text_val.lower() in ['nan', 'none', 'null', '-', 'na', 'n/a']:
        return None
        
    # 2. Try common formats
    formats = [
        '%m/%d/%Y', '%Y-%m-%d', '%d-%b-%y', '%m-%d-%Y', 
        '%Y/%m/%d', '%d/%m/%Y', '%B %d, %Y', '%d-%m-%Y'
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(text_val, fmt).date()
        except ValueError:
            continue
            
    return None

def get_column_value(row, col_name_start):
    """
    Finds a column that STARTS with the given name (handles newlines/spaces).
    Example: '1. MIDDLE NAME' matches '1. MIDDLE NAME\n(IF NOT APPLICABLE...)'
    """
    # Check exact match first
    if col_name_start in row:
        return clean_str(row[col_name_start])
        
    # Check partial match
    for col in row.index:
        if str(col).startswith(col_name_start):
            return clean_str(row[col])
            
    return ""

def get_sectors(row):
    active_sectors = []
    possible_sectors = [
        'FARMER', 'FISHERFOLK', 'FISHERMAN/BANCA OWNER', 'TODA', 
        'BRGY BNS/BHW', 'BRGY TANOD', 'BRGY OFFICIAL', 'LGU EMPLOYEE', 
        'INDIGENOUS PEOPLE', 'PWD', 'OFW', 'STUDENT', 
        'SENIOR CITIZEN', 'LIFEGUARD', 'SOLO PARENT'
    ]
    
    for sector in possible_sectors:
        # Check if column exists (via partial match or exact)
        # Using get_column_value helper to be safe against spacing
        val = get_column_value(row, sector)
        if val != "":
            active_sectors.append(sector)

    other_val = get_column_value(row, 'OTHERS')
    other_details = None
    if other_val != "":
        active_sectors.append("Others")
        if len(other_val) > 1:
            other_details = other_val

    summary = ", ".join(active_sectors) if active_sectors else "None"
    return summary, other_details

def process_excel_import(file_content, db: Session):
    header_index = 0
    df = None
    
    # --- PHASE 1: READ FILE ---
    try:
        df = pd.read_excel(file_content, header=None, dtype=str, engine='openpyxl')
    except Exception as e:
        file_content.seek(0)
        try:
            df = pd.read_csv(file_content, header=None, dtype=str, encoding='cp1252')
        except:
            return {"added": 0, "errors": [f"File Read Error: {str(e)}"]}

    # --- PHASE 2: FIND HEADERS ---
    found_header = False
    for i in range(min(20, len(df))):
        row_values = [str(x).strip().upper() for x in df.iloc[i].values]
        if "LAST NAME" in row_values:
            header_index = i
            found_header = True
            df.columns = row_values
            df = df.iloc[i+1:].reset_index(drop=True)
            
            # Handle Duplicate Columns (Spouse/Family)
            new_cols = []
            seen = {}
            for c in df.columns:
                if c in seen:
                    seen[c] += 1
                    new_cols.append(f"{c}.{seen[c]}")
                else:
                    seen[c] = 0
                    new_cols.append(c)
            df.columns = new_cols
            break
            
    if not found_header:
        return {"added": 0, "errors": ["Could not find 'LAST NAME' column."]}

    # --- PHASE 3: SHIFT FIX ---
    # Check if LAST NAME column is empty but FIRST NAME has data
    if 'LAST NAME' in df.columns:
        lname_col = df['LAST NAME']
        empty_count = lname_col.isna().sum() + (lname_col == '').sum()
        if len(df) > 0 and (empty_count / len(df)) > 0.9:
            # Shift columns right
            df.columns = ['SHIFT_FIX'] + df.columns.tolist()[:-1]

    # --- PHASE 4: PROCESSING ---
    df = df.where(pd.notnull(df), None)
    success_count = 0
    errors = []

    for index, row in df.iterrows():
        try:
            lname = clean_str(row.get('LAST NAME'))
            if not lname: continue

            # --- PARSE DATE (Enhanced) ---
            bday = parse_date(row.get('BIRTHDATE'))

            # --- SECTORS ---
            sector_str, other_str = get_sectors(row)

            # --- CREATE RESIDENT ---
            resident = ResidentProfile(
                last_name=lname,
                first_name=clean_str(row.get('FIRST NAME')),
                middle_name=clean_str(row.get('MIDDLE NAME')),
                ext_name=clean_str(row.get('EXT NAME')),
                
                house_no=clean_str(row.get('HOUSE NO. / STREET')),
                purok=clean_str(row.get('PUROK/SITIO')),
                barangay=clean_str(row.get('BARANGAY')),
                
                sex=clean_str(row.get('SEX')),
                birthdate=bday,
                civil_status=clean_str(row.get('CIVIL STATUS')),
                religion=clean_str(row.get('RELIGION')),
                occupation=clean_str(row.get('OCCUPATION')),
                contact_no=clean_str(row.get('CONTACT')),
                precinct_no=clean_str(row.get('PRECINT NO')),
                
                sector_summary=sector_str,
                other_sector_details=other_str,
                
                spouse_last_name=clean_str(row.get('LAST NAME.1')),
                spouse_first_name=clean_str(row.get('FIRST NAME.1')),
                spouse_middle_name=clean_str(row.get('MIDDLE NAME.1')),
                spouse_ext_name=clean_str(row.get('EXT NAME.1')),
            )
            
            # --- PROCESS FAMILY MEMBERS (1-5) ---
            # We add them to the resident object before flushing to DB
            for i in range(1, 6):
                # Search for columns like "1. LAST NAME", "1. FIRST NAME"
                # Using our helper to handle newlines/extras in headers
                fam_lname = get_column_value(row, f"{i}. LAST NAME")
                fam_fname = get_column_value(row, f"{i}. FIRST NAME")
                
                if fam_lname or fam_fname:
                    fam_mname = get_column_value(row, f"{i}. MIDDLE NAME")
                    fam_rel   = get_column_value(row, f"{i}. RELATIONSHIP")
                    
                    member = FamilyMember(
                        last_name=fam_lname,
                        first_name=fam_fname,
                        middle_name=fam_mname,
                        relationship=fam_rel
                    )
                    resident.family_members.append(member)

            db.add(resident)
            success_count += 1
            
        except Exception as e:
            errors.append(f"Row {index + 2}: {str(e)}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"added": 0, "errors": [f"Database Error: {str(e)}"]}
    
    return {"added": success_count, "errors": errors}