from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os, uuid, jwt, bcrypt, logging, base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "divyalive")]
app = FastAPI(title="DivyaLive Phase 1 API")
api = APIRouter(prefix="/api")
SECRET = os.environ.get("JWT_SECRET", "divyalive-phase1-secret-change-me")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@divyalive.app")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "DivyaLive@2026")

class CategoryIn(BaseModel):
    name: str; icon: str = "flare"; sortOrder: int = 0; enabled: bool = True
class WallpaperIn(BaseModel):
    name: str; description: str = ""; deity: str = ""; category: str
    tags: List[str] = []; thumbnailUrl: str = ""; previewUrl: str = ""; wallpaperUrl: str = ""
    type: str = "still"; resolution: str = "1080 × 1920"; fileSize: str = "Demo asset"
    animationType: str = "Still"; isPremium: bool = False; isFeatured: bool = False
    isPublished: bool = True; sortOrder: int = 0
class FestivalIn(BaseModel):
    name: str; startDate: str; endDate: str; banner: str = ""; description: str = ""; featuredWallpaper: str = ""
class DarshanIn(BaseModel):
    date: str; wallpaperId: str; deity: str; quote: str; featured: bool = True
class AdminLogin(BaseModel):
    email: EmailStr; password: str

def clean(doc):
    if not doc: return None
    doc.pop("_id", None)
    return doc
def token_for(email):
    return jwt.encode({"sub": email, "role": "admin", "exp": datetime.now(timezone.utc)+timedelta(hours=12)}, SECRET, algorithm="HS256")
async def admin_guard(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "): raise HTTPException(401, "Admin authentication required")
    try:
        data = jwt.decode(authorization[7:], SECRET, algorithms=["HS256"])
        if data.get("role") != "admin": raise ValueError()
        return data
    except Exception: raise HTTPException(401, "Invalid or expired admin session")

async def seed():
    if await db.categories.count_documents({}) == 0:
        names = ["Mahadev", "Shri Krishna", "Shri Ram", "Ganesh Ji", "Maa Durga", "Maa Lakshmi", "Surya Dev", "Om & Spiritual", "Temple", "Nature & Spiritual", "Aarti", "Festival Specials"]
        await db.categories.insert_many([{"id": str(uuid.uuid4()), "name": n, "icon": "sparkles", "sortOrder": i, "enabled": True} for i,n in enumerate(names)])
    if await db.wallpapers.count_documents({}) == 0:
        base = Path("/app/frontend/assets/devotional")
        def asset(name):
            p=base/f"{name}.jpg"
            return "data:image/jpeg;base64,"+base64.b64encode(p.read_bytes()).decode() if p.exists() else ""
        rows=[]
        specs=[("Mahadev", "mahadev", "Mahadev • Himalaya", "Mahadev"), ("Shri Krishna", "krishna", "Krishna • Yamuna Glow", "Krishna"), ("Ganesh Ji", "ganesha", "Ganesh Ji • Shubh Aarambh", "Ganesh Ji"), ("Temple", "temple", "Temple • Pratah Darshan", "Temple")]
        for i,(cat,asset_name,title,deity) in enumerate(specs):
            for copy in range(3 if cat in ["Mahadev","Shri Krishna"] else 2):
                rows.append({"id":str(uuid.uuid4()),"name":title if copy==0 else f"{title} {copy+1}","description":"A licensed-safe DivyaLive demo artwork for Phase 1.","deity":deity,"category":cat,"tags":[deity,"meditation","demo"],"thumbnailUrl":asset(asset_name),"previewUrl":asset(asset_name),"wallpaperUrl":asset(asset_name),"type":"still","resolution":"1080 × 1920","fileSize":"Demo asset","animationType":"Still","isPremium":False,"isFeatured":copy==0,"isPublished":True,"createdAt":datetime.now(timezone.utc).isoformat(),"updatedAt":datetime.now(timezone.utc).isoformat(),"sortOrder":copy})
        await db.wallpapers.insert_many(rows)
    if await db.daily_darshan.count_documents({}) == 0:
        hero=await db.wallpapers.find_one({"deity":"Mahadev"},{"_id":0})
        await db.daily_darshan.insert_one({"id":str(uuid.uuid4()),"date":datetime.now(timezone.utc).date().isoformat(),"wallpaperId":hero["id"],"deity":"महादेव","quote":"शिव में शांति, शिव में शक्ति।","featured":True})
    if await db.admins.count_documents({}) == 0:
        await db.admins.insert_one({"email":ADMIN_EMAIL,"passwordHash":bcrypt.hashpw(ADMIN_PASSWORD.encode(),bcrypt.gensalt()).decode(),"role":"admin"})

@app.on_event("startup")
async def startup(): await seed()
@api.get("/health")
async def health(): return {"status":"ok","service":"divyalive"}
@api.get("/categories")
async def categories(): return [clean(x) async for x in db.categories.find({"enabled":True},{"_id":0}).sort("sortOrder",1)]
@api.get("/wallpapers")
async def wallpapers(search: str="", category: str="", featured: Optional[bool]=None, page: int=1, limit: int=30):
    q={"isPublished":True}; terms=[]
    if search: terms=[{"name":{"$regex":search,"$options":"i"}},{"deity":{"$regex":search,"$options":"i"}},{"category":{"$regex":search,"$options":"i"}},{"tags":{"$regex":search,"$options":"i"}}]; q["$or"]=terms
    if category: q["category"]=category
    if featured is not None: q["isFeatured"]=featured
    return [clean(x) async for x in db.wallpapers.find(q,{"_id":0}).sort([("sortOrder",1),("createdAt",-1)]).skip((page-1)*limit).limit(limit)]
@api.get("/wallpapers/{wallpaper_id}")
async def wallpaper(wallpaper_id: str):
    item=clean(await db.wallpapers.find_one({"id":wallpaper_id},{"_id":0}))
    if not item: raise HTTPException(404,"Wallpaper not found")
    return item
@api.get("/daily-darshan")
async def daily(): return clean(await db.daily_darshan.find_one({}, {"_id":0}, sort=[("date",-1)]))
@api.post("/auth/admin/login")
async def login(body: AdminLogin):
    admin=await db.admins.find_one({"email":str(body.email)})
    if not admin or not bcrypt.checkpw(body.password.encode(), admin["passwordHash"].encode()): raise HTTPException(401,"Incorrect admin credentials")
    return {"access_token":token_for(str(body.email)),"admin":{"email":str(body.email),"role":"admin"}}
@api.get("/admin/dashboard")
async def dashboard(_: Any=Depends(admin_guard)):
    return {"users":await db.users.count_documents({}),"wallpapers":await db.wallpapers.count_documents({}),"categories":await db.categories.count_documents({}),"published":await db.wallpapers.count_documents({"isPublished":True}),"drafts":await db.wallpapers.count_documents({"isPublished":False}),"popular":[]}
@api.get("/admin/wallpapers")
async def admin_wallpapers(_: Any=Depends(admin_guard)): return [clean(x) async for x in db.wallpapers.find({},{"_id":0}).sort("createdAt",-1).limit(100)]
@api.post("/admin/wallpapers")
async def add_wallpaper(body: WallpaperIn, _: Any=Depends(admin_guard)):
    now=datetime.now(timezone.utc).isoformat(); item=body.model_dump()|{"id":str(uuid.uuid4()),"createdAt":now,"updatedAt":now}; await db.wallpapers.insert_one(item); return clean(item)
@api.put("/admin/wallpapers/{item_id}")
async def edit_wallpaper(item_id: str, body: WallpaperIn, _: Any=Depends(admin_guard)):
    item=body.model_dump()|{"updatedAt":datetime.now(timezone.utc).isoformat()}; result=await db.wallpapers.update_one({"id":item_id},{"$set":item})
    if not result.matched_count: raise HTTPException(404,"Wallpaper not found")
    return {"id":item_id,**item}
@api.delete("/admin/wallpapers/{item_id}")
async def delete_wallpaper(item_id: str, _: Any=Depends(admin_guard)): await db.wallpapers.delete_one({"id":item_id}); return {"ok":True}
@api.get("/admin/categories")
async def admin_categories(_: Any=Depends(admin_guard)): return [clean(x) async for x in db.categories.find({},{"_id":0}).sort("sortOrder",1)]
@api.post("/admin/categories")
async def add_category(body: CategoryIn, _: Any=Depends(admin_guard)):
    item=body.model_dump()|{"id":str(uuid.uuid4())}; await db.categories.insert_one(item); return clean(item)
@api.put("/admin/categories/{item_id}")
async def edit_category(item_id: str, body: CategoryIn, _: Any=Depends(admin_guard)): await db.categories.update_one({"id":item_id},{"$set":body.model_dump()}); return {"id":item_id,**body.model_dump()}
@api.delete("/admin/categories/{item_id}")
async def delete_category(item_id: str, _: Any=Depends(admin_guard)): await db.categories.delete_one({"id":item_id}); return {"ok":True}
@api.post("/admin/festivals")
async def add_festival(body: FestivalIn, _: Any=Depends(admin_guard)): item=body.model_dump()|{"id":str(uuid.uuid4())}; await db.festivals.insert_one(item); return clean(item)
@api.post("/admin/daily-darshan")
async def add_darshan(body: DarshanIn, _: Any=Depends(admin_guard)): item=body.model_dump()|{"id":str(uuid.uuid4())}; await db.daily_darshan.insert_one(item); return clean(item)
app.include_router(api)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO)