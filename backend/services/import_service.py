import pandas as pd
from sqlalchemy.orm import Session

def process_excel_import(file_content, db: Session):

    try:
        df = pd.read_excel(file_content, dtype=object, engine="openpyxl")
    except Exception as e:
        file_content.seek(0)
        df = pd.read_csv(file_content, dtype=object, encoding="cp1252")

    # -----------------------------------------------------
    # CLEAN + FIX DUPLICATE HEADERS
    # -----------------------------------------------------
    cleaned_columns = []
    seen = {}

    for col in df.columns:
        col_clean = " ".join(str(col).replace("\n", " ").split()).upper()

        if col_clean in seen:
            seen[col_clean] += 1
            col_clean = f"{col_clean}.{seen[col_clean]}"
        else:
            seen[col_clean] = 0

        cleaned_columns.append(col_clean)

    df.columns = cleaned_columns

    df = df.where(pd.notnull(df), None)

    # -----------------------------------------------------
    # DEBUG DETECTION
    # -----------------------------------------------------
    birth_cols = [col for col in df.columns if "BIRTH" in col]
    civil_cols = [col for col in df.columns if "CIVIL" in col or "STATUS" in col]
    spouse_cols = [col for col in df.columns if "SPOUSE" in col or ".1" in col]
    sector_cols = [col for col in df.columns if any(
        key in col for key in [
            "FARMER", "FISHER", "TODA", "BRGY", "LGU",
            "PWD", "OFW", "STUDENT", "SENIOR",
            "LIFEGUARD", "SOLO"
        ]
    )]

    # -----------------------------------------------------
    # SAMPLE ROWS
    # -----------------------------------------------------
    sample_rows = []
    for i in range(min(5, len(df))):
        sample_rows.append(df.iloc[i].to_dict())

    # -----------------------------------------------------
    # RETURN DEBUG INFO
    # -----------------------------------------------------
    return {
        "total_rows": len(df),
        "columns": df.columns.tolist(),
        "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "detected_birthdate_columns": birth_cols,
        "detected_civil_status_columns": civil_cols,
        "detected_spouse_related_columns": spouse_cols,
        "detected_sector_columns": sector_cols,
        "sample_rows": sample_rows
    }
