from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import httpx
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import hashlib
from datetime import datetime, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError
from langdetect import detect, LangDetectException
from deep_translator import GoogleTranslator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.getenv("MONGO_URL")
db_name = os.getenv("DB_NAME", "opportunity_track")

if not mongo_url:
    raise Exception("MONGO_URL is not set in environment variables")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET_KEY')
JWT_ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    education_college: Optional[str] = None
    education_degree: Optional[str] = None
    education_year: Optional[str] = None
    skills: Optional[List[str]] = None
    target_roles: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    internship_type: Optional[str] = None
    resume_url: Optional[str] = None

class InterestTrack(BaseModel):
    item_id: str
    type: str  # interested, uninterested, bookmark, unbookmark
    skills: Optional[List[str]] = []
    source: Optional[str] = ""

class BookmarkCreate(BaseModel):
    internship_id: str
    title: str
    company: str
    location: str
    url: str
    description: Optional[str] = ""
    tags: Optional[List[str]] = []
    remote: Optional[bool] = False

class ApplicationCreate(BaseModel):
    internship_id: str
    title: str
    company: str
    location: str
    url: str
    status: str = "applied"

class ApplicationUpdate(BaseModel):
    status: str

# ==================== AUTH UTILITIES ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/signup")
async def signup(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    profile_doc = {
        "user_id": user_id,
        "name": data.name,
        "email": data.email,
        "education_college": "",
        "education_degree": "",
        "education_year": "",
        "skills": [],
        "target_roles": [],
        "preferred_locations": [],
        "internship_type": "remote",
        "resume_url": ""
    }
    await db.profiles.insert_one(profile_doc)
    token = create_token(user_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "name": data.name, "email": data.email, "created_at": now}
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "name": user["name"], "email": user["email"], "created_at": user["created_at"]}
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"id": user["id"], "name": user["name"], "email": user["email"], "created_at": user["created_at"]}

# ==================== PROFILE ENDPOINTS ====================

@api_router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        return {"user_id": user["id"], "name": user["name"], "email": user["email"]}
    return profile

@api_router.put("/profile/update")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    await db.profiles.update_one({"user_id": user["id"]}, {"$set": update_data}, upsert=True)
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return profile

# ==================== COMPATIBILITY SCORING & COURSES ====================

COMMON_SKILLS = [
    "python", "javascript", "java", "c++", "c#", "react", "node.js", "angular", "vue",
    "sql", "mongodb", "postgresql", "mysql", "html", "css", "typescript", "docker",
    "kubernetes", "aws", "azure", "gcp", "git", "linux", "rest", "api", "graphql",
    "machine learning", "data analysis", "data science", "deep learning", "nlp",
    "tensorflow", "pytorch", "pandas", "numpy", "flask", "django", "fastapi",
    "spring", "figma", "ui/ux", "adobe", "photoshop", "illustrator", "excel",
    "power bi", "tableau", "sap", "salesforce", "jira", "agile", "scrum",
    "communication", "teamwork", "problem solving", "leadership", "marketing",
    "seo", "content writing", "social media", "finance", "accounting",
    "php", "ruby", "swift", "kotlin", "go", "rust", "scala", "r",
    "devops", "ci/cd", "testing", "automation", "selenium", "cypress"
]

def extract_skills_from_text(text: str) -> List[str]:
    text_lower = text.lower()
    return list(set(skill for skill in COMMON_SKILLS if skill in text_lower))

COURSE_DB = {
    "python": [
        {"platform": "Coursera", "name": "Python for Everybody Specialization", "url": "https://www.coursera.org/specializations/python"},
        {"platform": "GeeksforGeeks", "name": "Complete Python Programming", "url": "https://www.geeksforgeeks.org/python-programming-language/"},
        {"platform": "freeCodeCamp", "name": "Scientific Computing with Python", "url": "https://www.freecodecamp.org/learn/scientific-computing-with-python/"},
    ],
    "javascript": [
        {"platform": "Coursera", "name": "JavaScript for Beginners", "url": "https://www.coursera.org/learn/javascript-basics"},
        {"platform": "GeeksforGeeks", "name": "JavaScript Tutorial", "url": "https://www.geeksforgeeks.org/javascript/"},
        {"platform": "freeCodeCamp", "name": "JavaScript Algorithms & Data Structures", "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/"},
    ],
    "react": [
        {"platform": "Coursera", "name": "React Basics by Meta", "url": "https://www.coursera.org/learn/react-basics"},
        {"platform": "GeeksforGeeks", "name": "ReactJS Tutorial", "url": "https://www.geeksforgeeks.org/react/"},
        {"platform": "freeCodeCamp", "name": "Front End Libraries Certification", "url": "https://www.freecodecamp.org/learn/front-end-development-libraries/"},
    ],
    "java": [
        {"platform": "Coursera", "name": "Java Programming by Duke University", "url": "https://www.coursera.org/specializations/java-programming"},
        {"platform": "GeeksforGeeks", "name": "Java Programming Language", "url": "https://www.geeksforgeeks.org/java/"},
        {"platform": "freeCodeCamp", "name": "Java Full Course", "url": "https://www.freecodecamp.org/news/java-programming-language-basics/"},
    ],
    "sql": [
        {"platform": "Coursera", "name": "SQL for Data Science", "url": "https://www.coursera.org/learn/sql-for-data-science"},
        {"platform": "GeeksforGeeks", "name": "SQL Tutorial", "url": "https://www.geeksforgeeks.org/sql-tutorial/"},
        {"platform": "freeCodeCamp", "name": "Relational Database Certification", "url": "https://www.freecodecamp.org/learn/relational-database/"},
    ],
    "html": [
        {"platform": "Coursera", "name": "HTML, CSS, and Javascript by Johns Hopkins", "url": "https://www.coursera.org/learn/html-css-javascript-for-web-developers"},
        {"platform": "GeeksforGeeks", "name": "HTML Tutorial", "url": "https://www.geeksforgeeks.org/html-tutorial/"},
        {"platform": "freeCodeCamp", "name": "Responsive Web Design", "url": "https://www.freecodecamp.org/learn/responsive-web-design/"},
    ],
    "css": [
        {"platform": "Coursera", "name": "Introduction to CSS3", "url": "https://www.coursera.org/learn/introcss"},
        {"platform": "GeeksforGeeks", "name": "CSS Tutorial", "url": "https://www.geeksforgeeks.org/css-tutorial/"},
        {"platform": "freeCodeCamp", "name": "Responsive Web Design", "url": "https://www.freecodecamp.org/learn/responsive-web-design/"},
    ],
    "typescript": [
        {"platform": "Coursera", "name": "TypeScript Fundamentals", "url": "https://www.coursera.org/search?query=typescript"},
        {"platform": "GeeksforGeeks", "name": "TypeScript Tutorial", "url": "https://www.geeksforgeeks.org/typescript/"},
        {"platform": "freeCodeCamp", "name": "TypeScript Full Course", "url": "https://www.freecodecamp.org/news/learn-typescript-beginners-guide/"},
    ],
    "node.js": [
        {"platform": "Coursera", "name": "Server-side Development with NodeJS", "url": "https://www.coursera.org/learn/server-side-nodejs"},
        {"platform": "GeeksforGeeks", "name": "Node.js Tutorial", "url": "https://www.geeksforgeeks.org/nodejs/"},
        {"platform": "freeCodeCamp", "name": "Back End Development and APIs", "url": "https://www.freecodecamp.org/learn/back-end-development-and-apis/"},
    ],
    "data analysis": [
        {"platform": "Coursera", "name": "Google Data Analytics Certificate", "url": "https://www.coursera.org/professional-certificates/google-data-analytics"},
        {"platform": "GeeksforGeeks", "name": "Data Analysis Tutorial", "url": "https://www.geeksforgeeks.org/data-analysis-tutorial/"},
        {"platform": "freeCodeCamp", "name": "Data Analysis with Python", "url": "https://www.freecodecamp.org/learn/data-analysis-with-python/"},
    ],
    "machine learning": [
        {"platform": "Coursera", "name": "Machine Learning by Andrew Ng", "url": "https://www.coursera.org/learn/machine-learning"},
        {"platform": "GeeksforGeeks", "name": "Machine Learning Tutorial", "url": "https://www.geeksforgeeks.org/machine-learning/"},
        {"platform": "freeCodeCamp", "name": "Machine Learning with Python", "url": "https://www.freecodecamp.org/learn/machine-learning-with-python/"},
    ],
    "docker": [
        {"platform": "Coursera", "name": "Introduction to Containers", "url": "https://www.coursera.org/learn/introduction-to-containers-w-docker-kubernetes-openshift"},
        {"platform": "GeeksforGeeks", "name": "Docker Tutorial", "url": "https://www.geeksforgeeks.org/docker-tutorial/"},
        {"platform": "freeCodeCamp", "name": "Docker Full Course", "url": "https://www.freecodecamp.org/news/the-docker-handbook/"},
    ],
    "git": [
        {"platform": "Coursera", "name": "Version Control with Git", "url": "https://www.coursera.org/learn/version-control-with-git"},
        {"platform": "GeeksforGeeks", "name": "Git Tutorial", "url": "https://www.geeksforgeeks.org/git-tutorial/"},
        {"platform": "freeCodeCamp", "name": "Git and GitHub Crash Course", "url": "https://www.freecodecamp.org/news/git-and-github-for-beginners/"},
    ],
}

def get_courses_for_skill(skill: str) -> list:
    key = skill.lower().strip()
    if key in COURSE_DB:
        return COURSE_DB[key]
    return [
        {"platform": "Coursera", "name": f"Learn {skill}", "url": f"https://www.coursera.org/search?query={skill.replace(' ', '+')}"},
        {"platform": "GeeksforGeeks", "name": f"{skill} Tutorial", "url": f"https://www.geeksforgeeks.org/search/?q={skill.replace(' ', '+')}"},
        {"platform": "freeCodeCamp", "name": f"{skill} Resources", "url": f"https://www.freecodecamp.org/news/search/?query={skill.replace(' ', '+')}"},
    ]

def calculate_compatibility_score(user_skills, internship_data):

    req_skills = internship_data.get("required_skills", [])

    user_lower = [s.lower().strip() for s in user_skills]
    intern_lower = [s.lower().strip() for s in req_skills]

    matched = [s for s in intern_lower if s in user_lower]
    missing = [s for s in intern_lower if s not in user_lower]

    if intern_lower:
        skill_pct = int((len(matched) * 100) / len(intern_lower))
    else:
        skill_pct = 0

    return {
        "compatibility_score": int(skill_pct),
        "matched_skills": matched,
        "missing_skills": missing,
        "skill_match_pct": int(skill_pct)
    }



# ==================== TRANSLATION ====================

async def translate_to_english(text: str) -> str:
    if not text or len(text.strip()) < 5:
        return text
    try:
        text_hash = hashlib.md5(text[:200].encode()).hexdigest()
        cached = await db.translations.find_one({"hash": text_hash}, {"_id": 0})
        if cached:
            return cached["translated"]
        lang = detect(text[:500])
        if lang == "en":
            return text
        translated = await asyncio.to_thread(
            GoogleTranslator(source="auto", target="en").translate, text[:5000]
        )
        if translated:
            await db.translations.insert_one({"hash": text_hash, "translated": translated})
            return translated
        return text
    except Exception:
        return text

INTERN_KEYWORDS = ["intern", "internship", "trainee", "praktikum", "stage", "stagiaire"]

def is_intern_listing(job) -> bool:
    combined = f"{job.get('title', '')} {' '.join(job.get('job_types', []))} {' '.join(job.get('tags', []))}".lower()
    return any(kw in combined for kw in INTERN_KEYWORDS)

# ==================== INTERNSHIP ENDPOINTS (Multi-API) ====================

ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api"
REMOTIVE_API = "https://remotive.com/api/remote-jobs"

async def fetch_arbeitnow(page=1):
    try:
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.get(f"{ARBEITNOW_API}?page={page}")
            r.raise_for_status()
            data = r.json()
        jobs = []
        for j in data.get("data", []):
            jobs.append({
                "source": "arbeitnow",
                "internship_id": j.get("slug", str(uuid.uuid4())),
                "title": j.get("title", ""),
                "company": j.get("company_name", ""),
                "location": j.get("location", ""),
                "description": j.get("description", ""),
                "apply_url": j.get("url", ""),
                "remote": j.get("remote", False),
                "tags": j.get("tags", []),
                "job_types": j.get("job_types", []),
                "created_at": j.get("created_at", 0),
            })
        has_next = data.get("links", {}).get("next") is not None
        return jobs, has_next
    except Exception as e:
        logger.error(f"Arbeitnow fetch error: {e}")
        return [], False

async def fetch_remotive():
    try:
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.get(f"{REMOTIVE_API}?limit=50")
            r.raise_for_status()
            data = r.json()
        jobs = []
        for j in data.get("jobs", []):
            jobs.append({
                "source": "remotive",
                "internship_id": f"remotive-{j.get('id', uuid.uuid4())}",
                "title": j.get("title", ""),
                "company": j.get("company_name", ""),
                "location": j.get("candidate_required_location", "Anywhere"),
                "description": j.get("description", ""),
                "apply_url": j.get("url", ""),
                "remote": True,
                "tags": j.get("tags", []) or [],
                "job_types": [j.get("job_type", "")],
                "created_at": 0,
            })
        return jobs
    except Exception as e:
        logger.error(f"Remotive fetch error: {e}")
        return []

def deduplicate_jobs(jobs):
    seen = {}
    unique = []
    for j in jobs:
        key = f"{j['title'].lower().strip()}|{j['company'].lower().strip()}"
        if key not in seen:
            seen[key] = True
            unique.append(j)
    return unique

@api_router.get("/internships")
async def get_internships(
    page: int = 1,
    search: str = "",
    location: str = "",
    remote: Optional[str] = None,
    user=Depends(get_current_user)
):
    """
    Aggregate opportunities from ALL JS scrapers (Internshala, LinkedIn, Indeed,
    WorkIndia, PMInternship) AND Arbeitnow / Remotive APIs, then filter, score,
    translate, and return.
    """
    from services.aggregator_service import get_all_opportunities

    agg = await get_all_opportunities(page=page)
    all_jobs = agg["results"]
    has_next  = agg["has_next"]

    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    user_skills = profile.get("skills", []) if profile else []

    results = []
    translate_tasks = []

    for job in all_jobs:
        title = job.get("title", "")
        desc  = job.get("description", "")
        loc   = job.get("location", "")

        if search:
            s = search.lower()
            combined = f"{title} {desc} {' '.join(job.get('tags', []))}".lower()
            if s not in combined:
                continue
        if location:
            if location.lower() not in loc.lower():
                continue
        if remote is not None:
            is_remote = remote.lower() == "true"
            if job.get("remote", False) != is_remote:
                continue

        full_text = f"{title} {desc} {' '.join(job.get('tags', []))}"
        req_skills = extract_skills_from_text(full_text)
        clean_desc = re.sub(r'<[^>]+>', '', desc)[:500]

        job_data = {**job, "required_skills": req_skills, "description": clean_desc}
        compat = calculate_compatibility_score(user_skills, job_data)
        results.append({**job_data, **compat})

    # Translate non-English titles/descriptions
    for r in results:
        try:
            lang = detect(r["title"][:100]) if len(r["title"]) > 5 else "en"
        except LangDetectException:
            lang = "en"
        if lang != "en":
            translate_tasks.append((r, "title"))
            translate_tasks.append((r, "description"))

    if translate_tasks:
        async def do_translate(item, field):
            item[field] = await translate_to_english(item[field])
        await asyncio.gather(*(do_translate(it, f) for it, f in translate_tasks[:40]))

    results.sort(key=lambda x: x["compatibility_score"], reverse=True)

    active_sources = [k for k, v in agg["sources"].items() if v["count"] > 0]
    return {
        "internships": results,
        "page": page,
        "total": len(results),
        "has_next": has_next,
        "sources": active_sources or ["Arbeitnow", "Scrapers"],
    }

@api_router.get("/internships/search")
async def search_internships(query: str = "", page: int = 1, user=Depends(get_current_user)):
    return await get_internships(page=page, search=query, user=user)

# ==================== RECOMMENDATIONS (Course-Based) ====================

@api_router.post("/recommendations/analyze")
async def analyze_skill_gap(data: dict, user=Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    user_skills = profile.get("skills", []) if profile else []
    required_skills = data.get("required_skills", [])
    internship_data = {
        "required_skills": required_skills,
        "title": data.get("title", ""),
        "location": data.get("location", ""),
    }
    compat = calculate_compatibility_score(user_skills, internship_data)
    learning_paths = []
    for i, skill in enumerate(compat["missing_skills"]):
        courses = get_courses_for_skill(skill)
        learning_paths.append({
            "skill": skill,
            "courses": courses,
            "priority": "high" if i < 3 else "medium",
        })
    return {
        **compat,
        "learning_paths": learning_paths,
    }

@api_router.get("/recommendations")
async def get_recommendations(user=Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    user_skills = profile.get("skills", []) if profile else []
    tips = []
    if not user_skills:
        tips.append("Add your skills to improve your Compatibility Score")
    if not profile or not profile.get("target_roles"):
        tips.append("Set target roles for better role matching (30% of score)")
    if not profile or not profile.get("preferred_locations"):
        tips.append("Add preferred locations for location matching (20% of score)")
    if not profile or not profile.get("education_college"):
        tips.append("Complete your education details for a stronger profile")
    if not profile or not profile.get("resume_url"):
        tips.append("Add your resume link to stand out to recruiters")
    if not tips:
        tips.append("Your profile is complete! Keep applying to internships")
    return {"recommendations": tips, "user_skills": user_skills}

# ==================== BOOKMARKS ====================

@api_router.post("/bookmarks")
async def create_bookmark(data: BookmarkCreate, user=Depends(get_current_user)):
    existing = await db.bookmarks.find_one({"user_id": user["id"], "internship_id": data.internship_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already bookmarked")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookmarks.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/bookmarks")
async def get_bookmarks(user=Depends(get_current_user)):
    bookmarks = await db.bookmarks.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return {"bookmarks": bookmarks}

@api_router.delete("/bookmarks/{internship_id}")
async def delete_bookmark(internship_id: str, user=Depends(get_current_user)):
    result = await db.bookmarks.delete_one({"user_id": user["id"], "internship_id": internship_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"message": "Bookmark removed"}

# ==================== APPLICATIONS ====================

@api_router.post("/applications")
async def create_application(data: ApplicationCreate, user=Depends(get_current_user)):
    existing = await db.applications.find_one({"user_id": user["id"], "internship_id": data.internship_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        **data.model_dump(),
        "applied_date": datetime.now(timezone.utc).isoformat()
    }
    await db.applications.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/applications")
async def get_applications(user=Depends(get_current_user)):
    apps = await db.applications.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return {"applications": apps}

@api_router.put("/applications/{application_id}")
async def update_application(application_id: str, data: ApplicationUpdate, user=Depends(get_current_user)):
    result = await db.applications.update_one(
        {"id": application_id, "user_id": user["id"]},
        {"$set": {"status": data.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    updated = await db.applications.find_one({"id": application_id}, {"_id": 0})
    return updated

@api_router.delete("/applications/{application_id}")
async def delete_application(application_id: str, user=Depends(get_current_user)):
    result = await db.applications.delete_one({"id": application_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application removed"}

# ==================== DASHBOARD ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    total = await db.applications.count_documents({"user_id": user["id"]})
    applied = await db.applications.count_documents({"user_id": user["id"], "status": "applied"})
    interviewing = await db.applications.count_documents({"user_id": user["id"], "status": "interviewing"})
    accepted = await db.applications.count_documents({"user_id": user["id"], "status": "accepted"})
    rejected = await db.applications.count_documents({"user_id": user["id"], "status": "rejected"})
    bookmarks = await db.bookmarks.count_documents({"user_id": user["id"]})
    recent_apps = await db.applications.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("applied_date", -1).to_list(5)
    recent_bookmarks = await db.bookmarks.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(5)
    return {
        "total_applications": total,
        "applied": applied,
        "interviewing": interviewing,
        "accepted": accepted,
        "rejected": rejected,
        "bookmarks_count": bookmarks,
        "recent_applications": recent_apps,
        "recent_bookmarks": recent_bookmarks
    }

# ==================== AUTOCOMPLETE ====================

_SKILLS_DATA = [
    "Python","Java","JavaScript","TypeScript","C++","C#","Go","Rust","Swift","Kotlin","Scala","R","PHP","Ruby",
    "React","Next.js","Vue.js","Angular","HTML","CSS","Tailwind CSS","Redux",
    "Node.js","FastAPI","Django","Flask","Spring Boot","Express.js","GraphQL","REST API",
    "PostgreSQL","MySQL","MongoDB","Redis","Elasticsearch","Firebase","Supabase",
    "Machine Learning","Deep Learning","Artificial Intelligence","Computer Vision","NLP",
    "Generative AI","LLM Engineering","Prompt Engineering","TensorFlow","PyTorch","Scikit-learn",
    "Hugging Face","LangChain","RAG","MLOps","Data Analysis","Data Engineering","Data Science",
    "Pandas","NumPy","Apache Spark","Kafka","Power BI","Tableau","SQL",
    "Docker","Kubernetes","AWS","Google Cloud","Azure","Terraform","CI/CD","GitHub Actions","Linux",
    "Blockchain","Web3","Solidity","Microservices","System Design","Git","Figma","Agile","Scrum",
]

_ROLES_DATA = [
    "Software Engineer","Frontend Developer","Backend Developer","Full Stack Developer","Mobile Developer",
    "iOS Developer","Android Developer","DevOps Engineer","Platform Engineer","Site Reliability Engineer",
    "Cloud Engineer","Security Engineer","Data Analyst","Data Scientist","Data Engineer",
    "Business Analyst","Machine Learning Engineer","Artificial Intelligence Engineer","AI Research Engineer",
    "Computer Vision Engineer","NLP Engineer","MLOps Engineer","LLM Engineer","Research Scientist",
    "Solutions Architect","Blockchain Developer","Web3 Developer","Product Manager","Product Designer",
    "UX Designer","UI Designer","QA Engineer","Test Automation Engineer","Cybersecurity Analyst",
    "Technical Program Manager","Engineering Manager","Game Developer",
]

_UNIVERSITIES_DATA = [
    "IIT Bombay","IIT Delhi","IIT Madras","IIT Kanpur","IIT Kharagpur","IIT Roorkee",
    "IIT Hyderabad","IIT Guwahati","NIT Trichy","NIT Surathkal","NIT Warangal","NIT Calicut",
    "Delhi University","Jawaharlal Nehru University","University of Mumbai","Anna University","Pune University",
    "BITS Pilani","VIT University","SRM University","Manipal University","Amity University",
    "IIIT Hyderabad","IIIT Delhi","Thapar Institute","Lovely Professional University",
    "Harvard University","Massachusetts Institute of Technology","Stanford University",
    "California Institute of Technology","Carnegie Mellon University",
    "University of California Berkeley","University of California Los Angeles",
    "Georgia Institute of Technology","University of Michigan","Purdue University",
    "University of Illinois Urbana-Champaign","University of Washington","University of Texas at Austin",
    "University of Oxford","University of Cambridge","Imperial College London","University College London",
    "University of Toronto","University of British Columbia","McGill University",
    "University of Melbourne","Australian National University","University of Mumbai",
    "Veermata Jijabai Technological Institute (VJTI)","Institute of Chemical Technology (ICT Mumbai)",
  "KJ Somaiya College of Engineering", "KJ Somaiya College of Arts and Commerce","KJ Somaiya College of Science and Commerce",
  "Thadomal Shahani Engineering College","Fr. Conceicao Rodrigues College of Engineering","Sardar Patel College of Engineering","Sardar Patel Institute of Technology",
  "DJ Sanghvi College of Engineering",
    "Vidyalankar Institute of Technology",
  "Shah and Anchor Kutchhi Engineering College",
  "Rajiv Gandhi Institute of Technology",
  "Vivekanand Education Society Institute of Technology",
  "St. Francis Institute of Technology","Xavier Institute of Engineering","Don Bosco Institute of Technology Mumbai",
  "Atharva College of Engineering",
  "Lokmanya Tilak College of Engineering",
  "Pillai College of Engineering",
  "Ramrao Adik Institute of Technology",
  "Universal College of Engineering",
  "Agnel Institute of Technology and Design",
  "St. John College of Engineering and Management",
  "Thakur College of Engineering and Technology",
  "Datta Meghe College of Engineering",
  "SIES Graduate School of Technology",
  "Terna Engineering College",
  "Bharati Vidyapeeth College of Engineering Navi Mumbai",

  "St. Xavier's College Mumbai",
  "Jai Hind College",
  "Narsee Monjee College of Commerce and Economics",
  "HR College of Commerce and Economics",
  "KC College Mumbai",
  "Sydenham College of Commerce and Economics",
  "Elphinstone College Mumbai",
  "Wilson College Mumbai",
  "Ramnarain Ruia College",
  "Guru Nanak Khalsa College",
  "Bhavan's College Mumbai",
  "SIES College of Arts Science and Commerce",
  "Mithibai College",
  "Patkar College Goregaon",
  "Thakur College of Science and Commerce",
  "Tolani College of Commerce",
  "Mulund College of Commerce",
  "Rizvi College of Arts Science and Commerce",
  "St. Andrew's College Bandra",
  "KPB Hinduja College of Commerce",
  "Sathaye College",
  "Lala Lajpatrai College of Commerce and Economics",
  "RD National College",
  "Dalmia College",
  "Nagindas Khandwala College",
  "KES Shroff College",
  "VPM RZ Shah College",
  "Nirmala Memorial Foundation College",
  "Reena Mehta College",
  "Oriental College of Commerce and Management",

  "Government Law College Mumbai",
  "KC Law College",
  "Rizvi Law College",
  "New Law College Mumbai",

  "Sir JJ College of Architecture",
  "Sir JJ School of Art",

  "SNDT Women's University affiliated colleges Mumbai",
  "Sophia College for Women",
  "St. Xavier's Institute of Education",
  "Bombay Teachers Training College",

  "SIES College of Management Studies",
  "MET Institute of Management",
  "Chetana College",
  "Welingkar Institute affiliated programs",

  "Kirti College Mumbai",
  "Guru Nanak College of Education and Research",
  "Smt. MMK College",
  "SIWS College Wadala",
  "Ismail Yusuf College",
  "Bhavans Hazarimal Somani College",

  "Annasaheb Vartak College",
  "Sonubhau Baswant College",
  "Manjunath College of Commerce",

  "Chandrabhan Sharma College",
  "Model College Dombivli",
  "Pendharkar College Dombivli",

  "Bunts Sangha College",
  "KPB Hinduja College",

  "Royal College Mira Road","Vartak College Vasai",
  "Sathaye College Mumbai","Karmaveer Bhaurao Patil College",
  "Bharatiya Vidya Bhavan College","Nirmala Niketan College","Tolani Maritime Institute affiliated Mumbai University programs",
]

_LOCATIONS_DATA = [
    "Mumbai, India","Delhi, India","Bangalore, India","Hyderabad, India","Chennai, India",
    "Pune, India","Kolkata, India","Noida, India","Gurgaon, India","Ahmedabad, India",
    "San Francisco, CA","New York, NY","Seattle, WA","Austin, TX","Boston, MA",
    "Los Angeles, CA","Chicago, IL","Denver, CO","Palo Alto, CA","Mountain View, CA",
    "London, UK","Manchester, UK","Berlin, Germany","Munich, Germany","Singapore",
    "Dubai, UAE","Amsterdam, Netherlands","Toronto, Canada","Vancouver, Canada",
    "Remote","Remote (India)","Remote (US)","Remote (Worldwide)",
]

def _filter_items(data: list, q: str, limit: int = 15) -> list:
    q = q.strip().lower()
    if not q:
        return data[:limit]
    starts = [x for x in data if x.lower().startswith(q)]
    contains = [x for x in data if q in x.lower() and not x.lower().startswith(q)]
    return (starts + contains)[:limit]

@api_router.get("/autocomplete/skills")
async def autocomplete_skills(q: str = ""):
    return {"results": _filter_items(_SKILLS_DATA, q)}

@api_router.get("/autocomplete/roles")
async def autocomplete_roles(q: str = ""):
    return {"results": _filter_items(_ROLES_DATA, q)}

@api_router.get("/autocomplete/universities")
async def autocomplete_universities(q: str = ""):
    return {"results": _filter_items(_UNIVERSITIES_DATA, q)}

@api_router.get("/autocomplete/locations")
async def autocomplete_locations(q: str = ""):
    return {"results": _filter_items(_LOCATIONS_DATA, q)}

# ==================== FEED ====================

_FEED_ITEMS = [
    {
        "id": "feed-1", "type": "hackathon", "title": "Google Summer of Code 2025",
        "company": "Google", "description": "Contribute to open source projects with mentoring from experienced developers. Stipend provided.",
        "location": "Remote", "date": "May 2025 - Aug 2025", "url": "https://summerofcode.withgoogle.com",
        "skills": ["Python", "JavaScript", "Open Source", "Git"], "source": "Google"
    },
    {
        "id": "feed-2", "type": "hackathon", "title": "MLH Global Hack Week",
        "company": "Major League Hacking", "description": "Week-long hackathon with workshops, prizes and networking opportunities for developers worldwide.",
        "location": "Remote", "date": "Mar 2025", "url": "https://ghw.mlh.io",
        "skills": ["React", "Node.js", "Python", "Machine Learning"], "source": "MLH"
    },
    {
        "id": "feed-3", "type": "program", "title": "Microsoft Imagine Cup 2025",
        "company": "Microsoft", "description": "Global technology competition for student developers. Build innovative solutions using Azure.",
        "location": "Remote", "date": "Jan 2025 - Apr 2025", "url": "https://imaginecup.microsoft.com",
        "skills": ["Azure", "AI", "Cloud", "Full Stack"], "source": "Microsoft"
    },
    {
        "id": "feed-4", "type": "internship", "title": "Amazon SDE Internship — Summer 2025",
        "company": "Amazon", "description": "Work on large-scale distributed systems. Competitive stipend and mentorship from senior engineers.",
        "location": "Bangalore, India", "date": "Jun 2025 - Aug 2025", "url": "https://amazon.jobs",
        "skills": ["Java", "AWS", "System Design", "Data Structures"], "source": "Amazon Careers"
    },
    {
        "id": "feed-5", "type": "event", "title": "PyCon India 2025",
        "company": "Python Software Society of India", "description": "India's premier Python conference with talks, workshops, sprints and networking.",
        "location": "Bangalore, India", "date": "Sep 2025", "url": "https://in.pycon.org/2025",
        "skills": ["Python", "Django", "Data Science", "Machine Learning"], "source": "PyCon India"
    },
    {
        "id": "feed-6", "type": "announcement", "title": "GitHub Copilot Free for Students",
        "company": "GitHub", "description": "GitHub Education now offers Copilot access to all verified students through the Student Developer Pack.",
        "location": "Remote", "date": "2025", "url": "https://education.github.com",
        "skills": ["Git", "AI", "Coding"], "source": "GitHub Education"
    },
    {
        "id": "feed-7", "type": "program", "title": "GirlScript Summer of Code 2025",
        "company": "GirlScript Foundation", "description": "3-month open-source program for beginners. Learn, contribute, and grow with the community.",
        "location": "Remote", "date": "Mar 2025 - May 2025", "url": "https://gssoc.girlscript.tech",
        "skills": ["Open Source", "React", "Python", "JavaScript"], "source": "GirlScript"
    },
    {
        "id": "feed-8", "type": "hackathon", "title": "Smart India Hackathon 2025",
        "company": "Government of India", "description": "Nationwide initiative to solve problems faced by government departments using technology.",
        "location": "Pan India", "date": "Aug 2025", "url": "https://sih.gov.in",
        "skills": ["AI", "IoT", "Blockchain", "Web Development"], "source": "MoE India"
    },
    {
        "id": "feed-9", "type": "article", "title": "How to Crack FAANG Interviews in 2025",
        "company": "TechCrunch", "description": "Comprehensive guide covering DSA preparation, system design, behavioral interviews and offer negotiation.",
        "location": "", "date": "Feb 2025", "url": "https://techcrunch.com",
        "skills": ["Data Structures", "Algorithms", "System Design"], "source": "TechCrunch"
    },
]

@api_router.get("/feed")
async def get_feed():
    """Return real-time aggregated feed from RSS sources (5-min cache)."""
    from services.feed_service import get_feed_items
    items = await get_feed_items()
    return {"items": items, "total": len(items)}

# ==================== INTEREST TRACKING ====================

@api_router.post("/interests/track")
async def track_interest(body: InterestTrack, creds: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_token(creds.credentials)
    await db.interests.insert_one({
        "user_id": user_id,
        "item_id": body.item_id,
        "type": body.type,
        "skills": body.skills,
        "source": body.source,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "ok"}

# ==================== RECOMMENDED LISTINGS ====================

@api_router.get("/opportunities/recommended")
async def get_recommended_opportunities(creds: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_token(creds.credentials)
    profile = await db.profiles.find_one({"user_id": user_id})
    user_skills = set(s.lower() for s in (profile.get("skills", []) if profile else []))
    user_roles = set(r.lower() for r in (profile.get("target_roles", []) if profile else []))
    user_locations = set(l.lower() for l in (profile.get("preferred_locations", []) if profile else []))

    # Gather interest history
    interest_cursor = db.interests.find({"user_id": user_id, "type": {"$in": ["interested", "bookmark"]}})
    interested_skills = set()
    async for doc in interest_cursor:
        for s in doc.get("skills", []):
            interested_skills.add(s.lower())

    all_skills = user_skills | interested_skills

    # Return scored feed items plus any from scraper cache
    scored = []
    for item in _FEED_ITEMS:
        item_skills = set(s.lower() for s in item.get("skills", []))
        skill_overlap = len(all_skills & item_skills)
        score = skill_overlap * 10
        # Boost by title/role match
        title_lower = item.get("title", "").lower()
        for role in user_roles:
            if role in title_lower:
                score += 15
        # Boost by location match
        loc = item.get("location", "").lower()
        for user_loc in user_locations:
            if user_loc in loc or loc in user_loc:
                score += 5
        scored.append({**item, "_score": score})

    scored.sort(key=lambda x: x["_score"], reverse=True)
    # Strip internal score
    results = [{k: v for k, v in item.items() if k != "_score"} for item in scored]
    return {"results": results, "total": len(results)}

# ==================== SETUP ====================

from routes.opportunities import router as opportunities_router

app.include_router(api_router)
app.include_router(opportunities_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.profiles.create_index("user_id", unique=True)
    await db.bookmarks.create_index([("user_id", 1), ("internship_id", 1)], unique=True)
    await db.applications.create_index([("user_id", 1), ("internship_id", 1)], unique=True)
    logger.info("MongoDB indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
