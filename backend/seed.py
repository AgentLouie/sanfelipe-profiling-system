
from database import SessionLocal, engine
import models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated=["auto"])

# Create tables
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

# --- DATA LISTS ---

initial_barangays = [
    "Amagna", "Apostol", "Balincaguing", "Farañal", "Feria", 
    "Manglicmot", "Rosete", "San Rafael", "Santo Niño", "Sindol", "Maloma"
]

initial_puroks = [
    "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6",
    "Purok 7", "Purok 8", "Purok 9", "Purok 10", "Purok 11", "Purok 12",
    "Purok 13", "Purok 14", "Purok 15", "Purok 16", "Purok 17", "Purok 18",
    "Purok 19", "Purok 20", "Sitio Yangil", "Sitio Sagpat", "Sitio Tektek",
    "Sitio Cabuyao", "Sitio Banawen", "Sitio Anangka", "Sitio Lubong", "Sitio Cabaruan",
    "Sitio Liwa", "Sitio Kabwaan"
]

initial_relationships = [
    "Wife", "Husband", "Son", "Daughter", 
    "Brother", "Sister", "Mother", "Father",
    "Grandmother", "Grandfather", "Grandson", "Granddaughter",
    "Live-in Partner", "Guardian"
]

initial_sectors = [
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

def seed_data():
    # 1. Seed Barangays
    print("Seeding Barangays...")
    for b_name in initial_barangays:
        if not db.query(models.Barangay).filter_by(name=b_name).first():
            db.add(models.Barangay(name=b_name))
            print(f" - Added {b_name}")

    # 2. Seed Puroks
    print("Seeding Puroks...")
    for p_name in initial_puroks:
        if not db.query(models.Purok).filter_by(name=p_name).first():
            db.add(models.Purok(name=p_name))
            print(f" - Added {p_name}")

    # 3. Seed Relationships
    print("Seeding Relationships...")
    for r_name in initial_relationships:
        if not db.query(models.Relationship).filter_by(name=r_name).first():
            db.add(models.Relationship(name=r_name))
            print(f" - Added {r_name}")

    # 4. Seed Sectors
    print("Seeding Sectors...")
    for s_name in initial_sectors:
        if not db.query(models.Sector).filter_by(name=s_name).first():
            db.add(models.Sector(name=s_name))
            print(f" - Added {s_name}")
    
    # 5. Seed Admin User
    print("Seeding Users...")
    # Create ADMIN
    if not db.query(models.User).filter_by(username="admin").first():
        hashed_pw = pwd_context.hash("admin123")
        admin_user = models.User(username="admin", hashed_password=hashed_pw, role="admin") # <--- Role: admin
        db.add(admin_user)
        print(" - Added Super Admin (admin / admin123)")

    # SAVE AND CLOSE ONLY AT THE VERY END
    db.commit()
    print("Seeding Complete!")
    db.close()

if __name__ == "__main__":
    seed_data()