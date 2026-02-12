import pandas as pd
from sqlalchemy.orm import Session
from models import ResidentProfile
from datetime import datetime
import io

def parse_date(date_val):
    if pd.isna(date_val) or str(date_val).strip() == "":
        return None
    
    # Handle Excel Timestamps
    if isinstance(date_val, (pd.Timestamp, datetime)):
        return date_val.date()

    text_val = str(date_val).strip()
    
    # Try multiple date formats
    for fmt in ('%m/%d/%Y', '%Y-%m-%d', '%d-%b-%y', '%m-%d-%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(text_val, fmt).date()
        except ValueError:
            continue
    return None

def get_sectors(row):
    """
    Scans the specific boolean columns in the Excel file.
    If a column has ANY value (not empty), we consider the resident part of that sector.
    """
    active_sectors = []
    
    # List of columns to check (based on your Excel header)
    possible_sectors = [
        'FARMER', 'FISHERFOLK', 'FISHERMAN/BANCA OWNER', 'TODA', 
        'BRGY BNS/BHW', 'BRGY TANOD', 'BRGY OFFICIAL', 'LGU EMPLOYEE', 
        'INDIGENOUS PEOPLE', 'PWD', 'OFW', 'STUDENT', 
        'SENIOR CITIZEN', 'LIFEGUARD', 'SOLO PARENT'
    ]

    for sector in possible_sectors:
        val = row.get(sector)
        # If the cell is not null and not empty string, add the sector
        if pd.notnull(val) and str(val).strip() != "":
            active_sectors.append(sector)

    # Handle "OTHERS" specifically
    # If "OTHERS" has text (e.g., "Vendor"), add "Others: Vendor"
    # If it just has a checkmark, add "Others"
    other_val = row.get('OTHERS')
    other_details = None
    
    if pd.notnull(other_val) and str(other_val).strip() != "":
        val_str = str(other_val).strip()
        active_sectors.append("Others")
        # If the value is descriptive (longer than 1 char), save it as details
        if len(val_str) > 1:
            other_details = val_str

    # Join all found sectors with commas
    summary = ", ".join(active_sectors) if active_sectors else "None"
    
    return summary, other_details

def process_excel_import(file_content, db: Session):
    # 1. Read File (Robust Method)
    try:
        df = pd.read_excel(file_content, dtype=str, engine='openpyxl')
    except Exception as e_xlsx:
        file_content.seek(0)
        try:
            df = pd.read_csv(file_content, dtype=str, encoding='cp1252')
        except Exception as e_csv:
            return {"added": 0, "errors": [f"Could not read file. Error: {str(e_xlsx)}"]}

    # 2. Clean Data
    df = df.where(pd.notnull(df), None)
    
    # Normalize headers to UPPERCASE and Strip spaces
    df.columns = df.columns.str.strip().str.upper()
    
    success_count = 0
    errors = []

    # 3. Iterate Rows
    for index, row in df.iterrows():
        try:
            # Required Field Check
            lname = row.get('LAST NAME')
            if not lname:
                continue

            # --- PARSE PERSONAL ---
            fname = row.get('FIRST NAME', '')
            mname = row.get('MIDDLE NAME', '')
            ext   = row.get('EXT NAME', '')
            
            # --- PARSE SPOUSE ---
            # Pandas renames duplicates to .1, .2
            spouse_lname  = row.get('LAST NAME.1', '') 
            spouse_fname  = row.get('FIRST NAME.1', '')
            spouse_mname  = row.get('MIDDLE NAME.1', '')
            spouse_ext    = row.get('EXT NAME.1', '')

            # --- PARSE DATE ---
            birthdate = parse_date(row.get('BIRTHDATE'))

            # --- PARSE SECTORS (NEW LOGIC) ---
            sector_summary_str, other_details_str = get_sectors(row)

            # --- CREATE OBJECT ---
            resident = ResidentProfile(
                last_name=str(lname),
                first_name=str(fname),
                middle_name=str(mname),
                ext_name=str(ext),
                
                # Address
                house_no=str(row.get('HOUSE NO. / STREET', '')),
                purok=str(row.get('PUROK/SITIO', '')),
                barangay=str(row.get('BARANGAY', '')),
                
                # Personal
                sex=str(row.get('SEX', '')),
                birthdate=birthdate,
                civil_status=str(row.get('CIVIL STATUS', '')),
                religion=str(row.get('RELIGION', '')),
                occupation=str(row.get('OCCUPATION', '')),
                contact_no=str(row.get('CONTACT', '')),
                precinct_no=str(row.get('PRECINT NO', '')),
                
                # Sectors
                sector_summary=sector_summary_str,
                other_sector_details=other_details_str, # Make sure schema supports this
                
                # Spouse
                spouse_last_name=str(spouse_lname),
                spouse_first_name=str(spouse_fname),
                spouse_middle_name=str(spouse_mname),
                spouse_ext_name=str(spouse_ext),
            )
            
            db.add(resident)
            success_count += 1
            
        except Exception as e:
            errors.append(f"Row {index + 2} Skipped: {str(e)}")

    # 4. SAFE COMMIT
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"added": 0, "errors": [f"Database Save Error: {str(e)}"]}
    
    return {"added": success_count, "errors": errors}