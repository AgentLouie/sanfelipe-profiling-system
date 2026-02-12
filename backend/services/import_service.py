import pandas as pd
from sqlalchemy.orm import Session
from models import ResidentProfile
from datetime import datetime
import io

def clean_str(val):
    if pd.isna(val) or val is None:
        return ""
    text = str(val).strip()
    if text.lower() in ['nan', 'none', 'null']:
        return ""
    return text

def parse_date(date_val):
    if pd.isna(date_val) or str(date_val).strip() == "":
        return None
    if isinstance(date_val, (pd.Timestamp, datetime)):
        return date_val.date()
    text_val = str(date_val).strip()
    if text_val.lower() in ['nan', 'none']:
        return None
    for fmt in ('%m/%d/%Y', '%Y-%m-%d', '%d-%b-%y', '%m-%d-%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(text_val, fmt).date()
        except ValueError:
            continue
    return None

def get_sectors(row):
    active_sectors = []
    # Using the exact columns from your file structure
    possible_sectors = [
        'FARMER', 'FISHERFOLK', 'FISHERMAN/BANCA OWNER', 'TODA', 
        'BRGY BNS/BHW', 'BRGY TANOD', 'BRGY OFFICIAL', 'LGU EMPLOYEE', 
        'INDIGENOUS PEOPLE', 'PWD', 'OFW', 'STUDENT', 
        'SENIOR CITIZEN', 'LIFEGUARD', 'SOLO PARENT'
    ]
    for sector in possible_sectors:
        val = row.get(sector)
        if clean_str(val) != "":
            active_sectors.append(sector)

    other_val = clean_str(row.get('OTHERS'))
    other_details = None
    if other_val != "":
        active_sectors.append("Others")
        if len(other_val) > 1:
            other_details = other_val

    summary = ", ".join(active_sectors) if active_sectors else "None"
    return summary, other_details

def process_excel_import(file_content, db: Session):
    # --- STEP 1: FIND THE HEADER ROW ---
    # We read the file without a header first to scan for "LAST NAME"
    header_index = 0
    found_header = False
    
    try:
        # Load raw data to scan
        df_scan = pd.read_excel(file_content, header=None, dtype=str, engine='openpyxl')
        
        # Scan first 20 rows
        for i in range(min(20, len(df_scan))):
            # Convert row to string and check for keywords
            row_str = " ".join([str(x).upper() for x in df_scan.iloc[i].values])
            if "LAST NAME" in row_str and "FIRST NAME" in row_str:
                header_index = i
                found_header = True
                break
                
        if not found_header:
            return {"added": 0, "errors": ["Could not find 'LAST NAME' column. Please ensure headers are within the first 20 rows."]}

        # --- STEP 2: RELOAD WITH CORRECT HEADER ---
        file_content.seek(0) # Reset file pointer
        df = pd.read_excel(file_content, header=header_index, dtype=str, engine='openpyxl')
        
    except Exception as e:
        # Fallback for CSV
        try:
            file_content.seek(0)
            df = pd.read_csv(file_content, header=0, dtype=str, encoding='cp1252')
        except:
            return {"added": 0, "errors": [f"File Read Error: {str(e)}"]}

    # Clean and Normalize Data
    df = df.where(pd.notnull(df), None)
    df.columns = df.columns.str.strip().str.upper()
    
    # DEBUG: Print columns to logs (optional, helps debugging)
    # print(f"Detected Columns: {df.columns.tolist()}")

    success_count = 0
    errors = []

    # --- STEP 3: ITERATE ---
    for index, row in df.iterrows():
        try:
            # Required Field Check
            lname = clean_str(row.get('LAST NAME'))
            if not lname:
                # Log skipped rows to help you debug
                # errors.append(f"Row {index + 2}: Skipped (No Last Name)") 
                continue

            # --- PARSE PERSONAL ---
            fname = clean_str(row.get('FIRST NAME'))
            mname = clean_str(row.get('MIDDLE NAME'))
            ext   = clean_str(row.get('EXT NAME'))
            
            # --- PARSE SPOUSE ---
            # Pandas handles duplicates as 'LAST NAME.1'
            spouse_lname  = clean_str(row.get('LAST NAME.1'))
            spouse_fname  = clean_str(row.get('FIRST NAME.1'))
            spouse_mname  = clean_str(row.get('MIDDLE NAME.1'))
            spouse_ext    = clean_str(row.get('EXT NAME.1'))

            # --- PARSE DATE ---
            birthdate = parse_date(row.get('BIRTHDATE'))

            # --- SECTORS ---
            sector_summary_str, other_details_str = get_sectors(row)

            # --- CREATE OBJECT ---
            resident = ResidentProfile(
                last_name=lname,
                first_name=fname,
                middle_name=mname,
                ext_name=ext,
                
                house_no=clean_str(row.get('HOUSE NO. / STREET')),
                purok=clean_str(row.get('PUROK/SITIO')),
                barangay=clean_str(row.get('BARANGAY')),
                
                sex=clean_str(row.get('SEX')),
                birthdate=birthdate,
                civil_status=clean_str(row.get('CIVIL STATUS')),
                religion=clean_str(row.get('RELIGION')),
                occupation=clean_str(row.get('OCCUPATION')),
                contact_no=clean_str(row.get('CONTACT')),
                precinct_no=clean_str(row.get('PRECINT NO')),
                
                sector_summary=sector_summary_str,
                other_sector_details=other_details_str,
                
                spouse_last_name=spouse_lname,
                spouse_first_name=spouse_fname,
                spouse_middle_name=spouse_mname,
                spouse_ext_name=spouse_ext,
            )
            
            db.add(resident)
            success_count += 1
            
        except Exception as e:
            errors.append(f"Row {index + 2 + header_index}: {str(e)}")

    # 4. COMMIT
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"added": 0, "errors": [f"Database Error: {str(e)}"]}
    
    return {"added": success_count, "errors": errors}