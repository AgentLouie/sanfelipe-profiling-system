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
    # Columns to check for checkmarks/text
    possible_sectors = [
        'FARMER', 'FISHERFOLK', 'FISHERMAN/BANCA OWNER', 'TODA', 
        'BRGY BNS/BHW', 'BRGY TANOD', 'BRGY OFFICIAL', 'LGU EMPLOYEE', 
        'INDIGENOUS PEOPLE', 'PWD', 'OFW', 'STUDENT', 
        'SENIOR CITIZEN', 'LIFEGUARD', 'SOLO PARENT'
    ]
    
    for sector in possible_sectors:
        # Check if key exists before accessing to avoid errors during shift
        if sector in row:
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
    header_index = 0
    df = None
    
    # --- PHASE 1: READ THE FILE ---
    try:
        # Load raw first to find headers
        df_raw = pd.read_excel(file_content, header=None, dtype=str, engine='openpyxl')
    except Exception as e_xlsx:
        file_content.seek(0)
        try:
            df_raw = pd.read_csv(file_content, header=None, dtype=str, encoding='cp1252')
        except Exception as e_csv:
            return {"added": 0, "errors": [f"CRITICAL: Could not read file. {str(e_xlsx)}"]}

    # --- PHASE 2: FIND HEADER ROW ---
    found_header = False
    
    # Scan first 20 rows for "LAST NAME"
    for i in range(min(20, len(df_raw))):
        row_values = [str(x).strip().upper() for x in df_raw.iloc[i].values]
        
        if "LAST NAME" in row_values:
            header_index = i
            found_header = True
            
            # Set columns from this row
            df_raw.columns = row_values
            # Slice data to exclude header and above
            df = df_raw.iloc[i+1:].reset_index(drop=True)
            
            # Rename duplicates (e.g. Spouse Last Name)
            new_cols = []
            seen = {}
            for c in df_raw.columns:
                if c in seen:
                    seen[c] += 1
                    new_cols.append(f"{c}.{seen[c]}")
                else:
                    seen[c] = 0
                    new_cols.append(c)
            df.columns = new_cols
            break
            
    if not found_header:
        preview = df_raw.head(3).to_string()
        return {"added": 0, "errors": [f"Could not find 'LAST NAME' in first 20 rows. Preview:\n{preview}"]}

    # --- PHASE 3: SHIFT DETECTION & FIX ---
    # Issue: Sometimes data is shifted 1 column to the right (Column A is empty)
    # Check if 'LAST NAME' column is mostly empty but 'FIRST NAME' (next col) has data
    
    # Get non-null counts
    lname_col = df['LAST NAME']
    fname_col = df['FIRST NAME']
    
    # Count empty values
    empty_last = lname_col.isna().sum() + (lname_col == '').sum() + (lname_col == 'nan').sum() + (lname_col == 'None').sum()
    total_rows = len(df)
    
    # If LAST NAME is >90% empty, check if shifting helps
    if total_rows > 0 and (empty_last / total_rows) > 0.9:
        # Check if FIRST NAME looks populated (Last names often appear here in shifted data)
        # We assume the "FIRST NAME" column actually holds the LAST NAME
        
        # APPLY SHIFT: Move headers one step to the RIGHT
        # Old Headers: [LAST NAME, FIRST NAME, MIDDLE NAME...]
        # New Headers: [SHIFT_FIX, LAST NAME, FIRST NAME, MIDDLE NAME...]
        
        current_columns = df.columns.tolist()
        # Create new column list: Insert dummy at start, remove last
        shifted_columns = ['SHIFT_FIX'] + current_columns[:-1]
        
        df.columns = shifted_columns
        # print("LOG: Applied Column Shift Correction")

    # --- PHASE 4: PROCESS DATA ---
    df = df.where(pd.notnull(df), None)
    success_count = 0
    errors = []

    for index, row in df.iterrows():
        try:
            # Strict Check
            lname = clean_str(row.get('LAST NAME'))
            if not lname:
                continue

            # --- MAP COLUMNS ---
            resident = ResidentProfile(
                last_name=lname,
                first_name=clean_str(row.get('FIRST NAME')),
                middle_name=clean_str(row.get('MIDDLE NAME')),
                ext_name=clean_str(row.get('EXT NAME')),
                
                house_no=clean_str(row.get('HOUSE NO. / STREET')),
                purok=clean_str(row.get('PUROK/SITIO')),
                barangay=clean_str(row.get('BARANGAY')),
                
                sex=clean_str(row.get('SEX')),
                birthdate=parse_date(row.get('BIRTHDATE')),
                civil_status=clean_str(row.get('CIVIL STATUS')),
                religion=clean_str(row.get('RELIGION')),
                occupation=clean_str(row.get('OCCUPATION')),
                contact_no=clean_str(row.get('CONTACT')),
                precinct_no=clean_str(row.get('PRECINT NO')),
                
                # Sectors
                sector_summary=get_sectors(row)[0],
                other_sector_details=get_sectors(row)[1],
                
                # Spouse
                spouse_last_name=clean_str(row.get('LAST NAME.1')),
                spouse_first_name=clean_str(row.get('FIRST NAME.1')),
                spouse_middle_name=clean_str(row.get('MIDDLE NAME.1')),
                spouse_ext_name=clean_str(row.get('EXT NAME.1')),
            )
            
            db.add(resident)
            success_count += 1
            
        except Exception as e:
            errors.append(f"Row {index + 2}: {str(e)}")

    # --- PHASE 5: FINAL CHECK ---
    if success_count == 0:
        return {
            "added": 0, 
            "errors": [
                "Header found, but no rows added.",
                f"Data looks shifted? Last Name Empty Count: {empty_last}/{total_rows}",
                f"Detected Columns: {list(df.columns)}"
            ]
        }

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"added": 0, "errors": [f"Database Commit Error: {str(e)}"]}
    
    return {"added": success_count, "errors": errors}