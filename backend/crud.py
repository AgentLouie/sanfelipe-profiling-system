from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
import models, schemas


# ==========================================
# RESIDENT FETCH
# ==========================================

def get_resident(db: Session, resident_id: int):
    return (
        db.query(models.ResidentProfile)
        .options(
            joinedload(models.ResidentProfile.family_members),
            joinedload(models.ResidentProfile.sectors)
        )
        .filter(models.ResidentProfile.id == resident_id)
        .first()
    )


def get_resident_count(db: Session, search: str = None, barangay: str = None):
    query = db.query(models.ResidentProfile)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                models.ResidentProfile.last_name.ilike(search_fmt),
                models.ResidentProfile.first_name.ilike(search_fmt)
            )
        )

    if barangay:
        query = query.filter(
            func.upper(models.ResidentProfile.barangay) == barangay.upper()
        )

    return query.count()


def get_residents(db: Session, skip: int = 0, limit: int = 20, search: str = None, barangay: str = None):
    query = db.query(models.ResidentProfile).options(
        joinedload(models.ResidentProfile.family_members),
        joinedload(models.ResidentProfile.sectors)
    )

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                models.ResidentProfile.last_name.ilike(search_fmt),
                models.ResidentProfile.first_name.ilike(search_fmt)
            )
        )

    if barangay:
        query = query.filter(
            func.upper(models.ResidentProfile.barangay) == barangay.upper()
        )

    return (
        query.order_by(models.ResidentProfile.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# ==========================================
# CREATE
# ==========================================

def create_resident(db: Session, resident: schemas.ResidentCreate):
    resident_data = resident.model_dump()

    family_members_data = resident_data.pop("family_members", [])
    sector_ids = resident_data.pop("sector_ids", [])
    resident_data.pop("sector_summary", None)

    valid_columns = {c.name for c in models.ResidentProfile.__table__.columns}
    filtered_data = {k: v for k, v in resident_data.items() if k in valid_columns}

    db_resident = models.ResidentProfile(**filtered_data)

    db.add(db_resident)
    db.commit()
    db.refresh(db_resident)

    # Add sectors
    if sector_ids:
        sectors = db.query(models.Sector).filter(models.Sector.id.in_(sector_ids)).all()
        db_resident.sectors = sectors

    # Add family members
    for member_data in family_members_data:
        db_member = models.FamilyMember(
            **member_data.model_dump(),
            profile_id=db_resident.id
        )
        db.add(db_member)

    db.commit()
    db.refresh(db_resident)
    return db_resident


# ==========================================
# UPDATE
# ==========================================

def update_resident(db: Session, resident_id: int, resident_data: schemas.ResidentUpdate):
    db_resident = db.query(models.ResidentProfile).filter(
        models.ResidentProfile.id == resident_id
    ).first()

    if not db_resident:
        return None

    update_data = resident_data.model_dump(exclude={'sector_ids', 'family_members'})

    for key, value in update_data.items():
        setattr(db_resident, key, value)

    # Update sectors
    db_resident.sectors.clear()
    if resident_data.sector_ids:
        new_sectors = db.query(models.Sector).filter(
            models.Sector.id.in_(resident_data.sector_ids)
        ).all()
        db_resident.sectors = new_sectors

    # Update family members
    db.query(models.FamilyMember).filter(
        models.FamilyMember.profile_id == resident_id
    ).delete()

    for fm_data in resident_data.family_members:
        new_fm = models.FamilyMember(
            **fm_data.model_dump(),
            profile_id=resident_id
        )
        db.add(new_fm)

    db.commit()
    db.refresh(db_resident)
    return db_resident


# ==========================================
# DELETE (Safe with FK)
# ==========================================

def delete_resident(db: Session, resident_id: int):
    db.query(models.FamilyMember).filter(
        models.FamilyMember.profile_id == resident_id
    ).delete()

    db_resident = db.query(models.ResidentProfile).filter(
        models.ResidentProfile.id == resident_id
    ).first()

    if db_resident:
        db.delete(db_resident)
        db.commit()

    return db_resident


# ==========================================
# DASHBOARD (OPTIMIZED)
# ==========================================

def get_dashboard_stats(db: Session):

    total_residents = db.query(
        func.count(models.ResidentProfile.id)
    ).scalar() or 0

    total_households = db.query(
        func.count(
            func.distinct(
                func.concat(
                    models.ResidentProfile.barangay,
                    "-",
                    models.ResidentProfile.house_no
                )
            )
        )
    ).scalar() or 0

    total_male = db.query(
        func.count(models.ResidentProfile.id)
    ).filter(
        func.lower(models.ResidentProfile.sex).in_(["male", "m"])
    ).scalar() or 0

    total_female = db.query(
        func.count(models.ResidentProfile.id)
    ).filter(
        func.lower(models.ResidentProfile.sex).in_(["female", "f"])
    ).scalar() or 0

    # ===============================
    # Barangay Count
    # ===============================
    barangay_counts = db.query(
        models.ResidentProfile.barangay,
        func.count(models.ResidentProfile.id)
    ).group_by(models.ResidentProfile.barangay).all()

    stats_barangay = {b: count for b, count in barangay_counts if b}

    # ===============================
    # SECTOR COUNT (FROM sector_summary STRING)
    # ===============================

    required_sectors = [
        "Indigenous People",
        "Senior Citizen",
        "PWD",
        "BRGY. Official/Employee",
        "OFW",
        "Solo Parent",
        "Farmers",
        "Fisherfolk",
        "Fisherman/Banca Owner",
        "LGU Employee",
        "TODA",
        "Student",
        "Lifeguard",
        "Others"
    ]

    stats_sector = {}

    for sector in required_sectors:
        count = db.query(
            func.count(models.ResidentProfile.id)
        ).filter(
            func.lower(models.ResidentProfile.sector_summary).like(f"%{sector.lower()}%")
        ).scalar() or 0

        stats_sector[sector] = count

    return {
        "total_residents": total_residents,
        "total_households": total_households,
        "total_male": total_male,
        "total_female": total_female,
        "population_by_barangay": stats_barangay,
        "population_by_sector": stats_sector
    }

