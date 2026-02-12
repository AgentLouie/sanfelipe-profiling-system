from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
import models, schemas


# =====================================================
# HELPER: SAFE BARANGAY FILTER
# =====================================================

def apply_barangay_filter(query, barangay: str):
    if barangay:
        query = query.filter(
            func.lower(models.ResidentProfile.barangay)
            .like(f"%{barangay.lower()}%")
        )
    return query


# =====================================================
# HELPER: SECTOR FILTER
# =====================================================

def apply_sector_filter(query, sector: str):
    if sector:
        query = query.filter(
            func.lower(models.ResidentProfile.sector_summary)
            .like(f"%{sector.lower()}%")
        )
    return query


# =====================================================
# GET SINGLE RESIDENT
# =====================================================

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


# =====================================================
# COUNT RESIDENTS
# =====================================================

def get_resident_count(
    db: Session,
    search: str = None,
    barangay: str = None,
    sector: str = None   # ✅ ADDED
):
    query = db.query(models.ResidentProfile)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.ResidentProfile.last_name.ilike(search_fmt),
                models.ResidentProfile.first_name.ilike(search_fmt)
            )
        )

    query = apply_barangay_filter(query, barangay)
    query = apply_sector_filter(query, sector)

    return query.count()


# =====================================================
# GET RESIDENT LIST
# =====================================================

def get_residents(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    barangay: str = None,
    sector: str = None   # ✅ ADDED
):
    query = db.query(models.ResidentProfile).options(
        joinedload(models.ResidentProfile.family_members),
        joinedload(models.ResidentProfile.sectors)
    )

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.ResidentProfile.last_name.ilike(search_fmt),
                models.ResidentProfile.first_name.ilike(search_fmt)
            )
        )

    query = apply_barangay_filter(query, barangay)
    query = apply_sector_filter(query, sector)

    return (
        query.order_by(models.ResidentProfile.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
