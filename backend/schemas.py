from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class ReferenceBase(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class Barangay(ReferenceBase): pass
class Purok(ReferenceBase): pass
class Relationship(ReferenceBase): pass
class Sector(ReferenceBase): pass

class FamilyMemberBase(BaseModel):
    last_name: str
    first_name: str
    middle_name: Optional[str] = None
    ext_name: Optional[str] = None
    relationship: str

class FamilyMemberCreate(FamilyMemberBase): pass

class FamilyMember(FamilyMemberBase):
    id: int
    profile_id: int
    is_active: bool
    class Config:
        from_attributes = True

# --- RESIDENT SCHEMAS ---
class ResidentBase(BaseModel):
    last_name: str
    first_name: str
    middle_name: Optional[str] = None
    ext_name: Optional[str] = None
    
    house_no: Optional[str] = None
    purok: str
    barangay: str
    
    birthdate: date
    sex: str
    civil_status: str
    religion: Optional[str] = None
    occupation: Optional[str] = None
    precinct_no: Optional[str] = None
    contact_no: Optional[str] = None
    
    # Spouse Fields (New)
    spouse_last_name: Optional[str] = None
    spouse_first_name: Optional[str] = None
    spouse_middle_name: Optional[str] = None
    spouse_ext_name: Optional[str] = None

    other_sector_details: Optional[str] = None
    sector_summary: Optional[str] = None 

class ResidentCreate(ResidentBase):
    family_members: List[FamilyMemberCreate] = []
    sector_ids: List[int] = [] 

class Resident(ResidentBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    family_members: List[FamilyMember] = []
    sectors: List[Sector] = [] 

    class Config:
        from_attributes = True