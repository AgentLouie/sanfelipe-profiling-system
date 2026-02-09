from sqlalchemy.orm import Session
import models, schemas
from sqlalchemy import or_

def get_resident(db: Session, resident_id: int):
    return db.query(models.ResidentProfile).filter(models.ResidentProfile.id == resident_id).first()

def get_residents(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(models.ResidentProfile)
    
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                models.ResidentProfile.last_name.ilike(search_fmt),
                models.ResidentProfile.first_name.ilike(search_fmt)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def create_resident(db: Session, resident: schemas.ResidentCreate):
    try:
        resident_data = resident.model_dump()
        
        # Extract List Data
        family_members_data = resident_data.pop("family_members", [])
        sector_ids = resident_data.pop("sector_ids", [])
        resident_data.pop("sector_summary", None)
        
        # Create the "sector_summary" string
        sector_names_list = []
        if sector_ids:
            selected_sectors = db.query(models.Sector).filter(models.Sector.id.in_(sector_ids)).all()
            sector_names_list = [sector.name for sector in selected_sectors]
            
        summary_string = ", ".join(sector_names_list)
        
        # Create Resident Object
        db_resident = models.ResidentProfile(
            **resident_data,
            sector_summary=summary_string
        )
        
        db.add(db_resident)
        db.commit()
        db.refresh(db_resident)

        # Associate Sectors
        if sector_ids:
            sectors = db.query(models.Sector).filter(models.Sector.id.in_(sector_ids)).all()
            db_resident.sectors = sectors
        
        # Create Family Members
        for member_data in family_members_data:
            db_member = models.FamilyMember(**member_data, profile_id=db_resident.id)
            db.add(db_member)
        
        db.commit()
        db.refresh(db_resident)
        return db_resident

    except Exception as e:
        db.rollback()
        raise e

def delete_resident(db: Session, resident_id: int):
    db_resident = db.query(models.ResidentProfile).filter(models.ResidentProfile.id == resident_id).first()
    if db_resident:
        db.delete(db_resident)
        db.commit()
    return db_resident