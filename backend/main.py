from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware

# Authentication
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta

import models, schemas, crud
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="San Felipe Residential Profile Form")

# CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "thesis-super-secret-key-change-me"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 600

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# LOGIN ENDPOINT
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Check User
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create Token with ROLE included
    access_token = create_access_token(
        data={
            "sub": user.username, 
            "role": user.role  # <--- CRITICAL: Stamping the role on the key card
        }
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

# --- API Endpoints ---
@app.post("/residents/", response_model=schemas.Resident)
def create_resident(resident: schemas.ResidentCreate, db: Session = Depends(get_db)):
    """Create a new Resident Profile (Family Head) + Family Members"""
    return crud.create_resident(db=db, resident=resident)

@app.get("/residents/", response_model=List[schemas.Resident])
def read_residents(skip: int = 0, limit: int = 100, search: str = None, db: Session = Depends(get_db)):
    """Get all residents (with pagination and optional search)"""
    residents = crud.get_residents(db, skip=skip, limit=limit, search=search)
    return residents

@app.get("/residents/{resident_id}", response_model=schemas.Resident)
def read_resident(resident_id: int, db: Session = Depends(get_db)):
    """Get specific resident by ID"""
    db_resident = crud.get_resident(db, resident_id=resident_id)
    if db_resident is None:
        raise HTTPException(status_code=404, detail="Resident not found")
    return db_resident

@app.delete("/residents/{resident_id}", response_model=schemas.Resident)
def delete_resident(resident_id: int, db: Session = Depends(get_db)):
    """Soft delete a resident"""
    db_resident = crud.delete_resident(db, resident_id=resident_id)
    if db_resident is None:
        raise HTTPException(status_code=404, detail="Resident not found")
    return db_resident

@app.get("/barangays/", response_model=List[schemas.Barangay])
def get_barangays(db: Session = Depends(get_db)):
    return db.query(models.Barangay).all()

@app.get("/puroks/", response_model=List[schemas.Purok])
def get_puroks(db: Session = Depends(get_db)):
    return db.query(models.Purok).all()

@app.get("/relationships/", response_model=List[schemas.Relationship])
def get_relationships(db: Session = Depends(get_db)):
    return db.query(models.Relationship).all()

@app.get("/sectors/", response_model=List[schemas.Sector])
def get_sectors(db: Session = Depends(get_db)):
    return db.query(models.Sector).all()