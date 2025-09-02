from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import qrcode
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"

# Models
class Restaurant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantCreate(BaseModel):
    name: str
    email: str
    password: str

class RestaurantLogin(BaseModel):
    email: str
    password: str

class RestaurantResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

class Dish(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    category: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DishCreate(BaseModel):
    name: str
    category: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None

class DishResponse(BaseModel):
    id: str
    name: str
    category: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime

class MenuResponse(BaseModel):
    restaurant: RestaurantResponse
    dishes: List[DishResponse]
    categories: List[str]

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_restaurant(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        restaurant_id: str = payload.get("sub")
        if restaurant_id is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if restaurant is None:
        raise HTTPException(status_code=401, detail="Restaurant not found")
    
    return Restaurant(**restaurant)

def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    """Convert ISO strings back to datetime objects from MongoDB"""
    if isinstance(item, dict):
        for key, value in item.items():
            if key in ['created_at'] and isinstance(value, str):
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
    return item

# Auth routes
@api_router.post("/auth/register", response_model=dict)
async def register_restaurant(restaurant_data: RestaurantCreate):
    # Check if restaurant already exists
    existing = await db.restaurants.find_one({"email": restaurant_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Restaurant with this email already exists")
    
    # Create new restaurant
    hashed_password = hash_password(restaurant_data.password)
    restaurant = Restaurant(
        name=restaurant_data.name,
        email=restaurant_data.email,
        password_hash=hashed_password
    )
    
    restaurant_dict = prepare_for_mongo(restaurant.dict())
    await db.restaurants.insert_one(restaurant_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": restaurant.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "restaurant": RestaurantResponse(**restaurant.dict())
    }

@api_router.post("/auth/login", response_model=dict)
async def login_restaurant(login_data: RestaurantLogin):
    restaurant = await db.restaurants.find_one({"email": login_data.email})
    if not restaurant or not verify_password(login_data.password, restaurant["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    restaurant = parse_from_mongo(restaurant)
    access_token = create_access_token(data={"sub": restaurant["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "restaurant": RestaurantResponse(**restaurant)
    }

# Dish management routes
@api_router.post("/dishes", response_model=DishResponse)
async def create_dish(dish_data: DishCreate, current_restaurant: Restaurant = Depends(get_current_restaurant)):
    dish = Dish(
        restaurant_id=current_restaurant.id,
        **dish_data.dict()
    )
    
    dish_dict = prepare_for_mongo(dish.dict())
    await db.dishes.insert_one(dish_dict)
    
    return DishResponse(**dish.dict())

@api_router.get("/dishes", response_model=List[DishResponse])
async def get_restaurant_dishes(current_restaurant: Restaurant = Depends(get_current_restaurant)):
    dishes = await db.dishes.find({"restaurant_id": current_restaurant.id}).to_list(length=None)
    return [DishResponse(**parse_from_mongo(dish)) for dish in dishes]

@api_router.put("/dishes/{dish_id}", response_model=DishResponse)
async def update_dish(dish_id: str, dish_data: DishCreate, current_restaurant: Restaurant = Depends(get_current_restaurant)):
    # Check if dish exists and belongs to current restaurant
    existing_dish = await db.dishes.find_one({"id": dish_id, "restaurant_id": current_restaurant.id})
    if not existing_dish:
        raise HTTPException(status_code=404, detail="Dish not found")
    
    # Update dish
    update_data = prepare_for_mongo(dish_data.dict())
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.dishes.update_one({"id": dish_id}, {"$set": update_data})
    
    updated_dish = await db.dishes.find_one({"id": dish_id})
    return DishResponse(**parse_from_mongo(updated_dish))

@api_router.delete("/dishes/{dish_id}")
async def delete_dish(dish_id: str, current_restaurant: Restaurant = Depends(get_current_restaurant)):
    result = await db.dishes.delete_one({"id": dish_id, "restaurant_id": current_restaurant.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dish not found")
    return {"message": "Dish deleted successfully"}

# Public menu routes
@api_router.get("/menu/{restaurant_id}", response_model=MenuResponse)
async def get_public_menu(restaurant_id: str):
    # Get restaurant info
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Get all dishes for this restaurant
    dishes = await db.dishes.find({"restaurant_id": restaurant_id}).to_list(length=None)
    dish_responses = [DishResponse(**parse_from_mongo(dish)) for dish in dishes]
    
    # Get unique categories
    categories = list(set(dish["category"] for dish in dishes))
    categories.sort()
    
    return MenuResponse(
        restaurant=RestaurantResponse(**parse_from_mongo(restaurant)),
        dishes=dish_responses,
        categories=categories
    )

# QR Code generation
@api_router.get("/qr/{restaurant_id}")
async def generate_qr_code(restaurant_id: str):
    # Verify restaurant exists
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Generate QR code URL (pointing to frontend menu page)
    frontend_url = "https://scanmenu-1.preview.emergentagent.com"  # Use the actual frontend URL
    menu_url = f"{frontend_url}/menu/{restaurant_id}"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(menu_url)
    qr.make(fit=True)
    
    # Create QR code image
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    img_buffer = io.BytesIO()
    qr_img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    
    return StreamingResponse(img_buffer, media_type="image/png")

@api_router.get("/qr/{restaurant_id}/base64")
async def generate_qr_code_base64(restaurant_id: str):
    # Verify restaurant exists
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Generate QR code URL
    frontend_url = "https://scanmenu-1.preview.emergentagent.com"  # Use the actual frontend URL
    menu_url = f"{frontend_url}/menu/{restaurant_id}"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(menu_url)
    qr.make(fit=True)
    
    # Create QR code image
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    img_buffer = io.BytesIO()
    qr_img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    
    img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
    
    return {
        "qr_code": f"data:image/png;base64,{img_base64}",
        "menu_url": menu_url
    }

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_restaurant: Restaurant = Depends(get_current_restaurant)):
    total_dishes = await db.dishes.count_documents({"restaurant_id": current_restaurant.id})
    categories = await db.dishes.distinct("category", {"restaurant_id": current_restaurant.id})
    
    return {
        "restaurant_name": current_restaurant.name,
        "total_dishes": total_dishes,
        "total_categories": len(categories),
        "categories": categories
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()