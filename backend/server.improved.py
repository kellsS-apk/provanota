from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Admin bootstrap: comma-separated list of emails that should be admins on registration
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()}

# CORS origins: comma-separated list (recommended: your Vercel domains + localhost for dev)
def _parse_origins(raw: str):
    return [o.strip() for o in (raw or '').split(',') if o.strip()]

CORS_ORIGINS = _parse_origins(os.environ.get('CORS_ORIGINS', 'http://localhost:3000'))

# Safety: require a JWT secret in production
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is required. Set it in your environment (Render).")

# Create the main app
app = FastAPI()
@app.get("/")
def root():
    return {"message": "API ProvaNota funcionando 🚀"}
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===== MODELS =====

class UserRegister(BaseModel):
    # Ignore extra fields sent by the client (e.g., a malicious 'role')
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt effective limit ~72 bytes
    name: str = Field(min_length=2, max_length=80)

class UserLogin(BaseModel):
(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    subscription_status: str
    preferred_exam: Optional[str] = None

class ExamCreate(BaseModel):
    title: str
    year: int
    banca: str
    duration_minutes: int
    instructions: str
    areas: List[str]  # ['Linguagens', 'Humanas', 'Natureza', 'Matemática']

class ExamResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    year: int
    banca: str
    duration_minutes: int
    instructions: str
    areas: List[str]
    published: bool
    created_by: str
    created_at: str
    question_count: int = 0

class Alternative(BaseModel):
    letter: str  # A, B, C, D, E
    text: str

class QuestionCreate(BaseModel):
    exam_id: str
    statement: str
    image_url: Optional[str] = None
    alternatives: List[Alternative]
    correct_answer: str  # A, B, C, D, or E
    tags: List[str]
    difficulty: str  # 'easy', 'medium', 'hard'
    area: str  # Linguagens, Humanas, Natureza, Matemática

class QuestionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    exam_id: str
    statement: str
    image_url: Optional[str] = None
    alternatives: List[Alternative]
    correct_answer: str
    tags: List[str]
    difficulty: str
    area: str
    order: int

class QuestionResponseStudent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    exam_id: str
    statement: str
    image_url: Optional[str] = None
    alternatives: List[Alternative]
    tags: List[str]
    difficulty: str
    area: str
    order: int

class AttemptCreate(BaseModel):
    exam_id: str

class AnswerSubmit(BaseModel):
    question_id: str
    selected_answer: str  # A, B, C, D, E

class AttemptResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    exam_id: str
    exam_title: str
    start_time: str
    end_time: Optional[str] = None
    status: str  # 'in_progress' or 'completed'
    answers: Dict[str, str] = {}  # question_id -> selected_answer
    score: Optional[Dict[str, Any]] = None

class AttemptSubmit(BaseModel):
    pass  # No body needed, just trigger submission

# ===== AUTH HELPERS =====

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail='Invalid token')
        
        user = await db.users.find_one({'id': user_id}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')

# ===== AUTH ROUTES =====

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'email': user_data.email,
        'password_hash': hash_password(user_data.password),
        'name': user_data.name,
        'role': ('admin' if user_data.email.lower() in ADMIN_EMAILS else 'student'),
        'subscription_status': 'free',
        'preferred_exam': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id)
    return {'token': token, 'user': UserResponse(**user_doc)}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    token = create_jwt_token(user['id'])
    return {'token': token, 'user': UserResponse(**user)}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ===== ADMIN EXAM ROUTES =====

@api_router.post("/admin/exams", response_model=ExamResponse)
async def create_exam(exam_data: ExamCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    exam_id = str(uuid.uuid4())
    exam_doc = {
        'id': exam_id,
        'title': exam_data.title,
        'year': exam_data.year,
        'banca': exam_data.banca,
        'duration_minutes': exam_data.duration_minutes,
        'instructions': exam_data.instructions,
        'areas': exam_data.areas,
        'published': False,
        'created_by': current_user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.exams.insert_one(exam_doc)
    return ExamResponse(**exam_doc, question_count=0)

@api_router.get("/admin/exams", response_model=List[ExamResponse])
async def get_admin_exams(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    exams = await db.exams.find({}, {'_id': 0}).to_list(1000)
    
    # Get question counts
    for exam in exams:
        count = await db.questions.count_documents({'exam_id': exam['id']})
        exam['question_count'] = count
    
    return [ExamResponse(**exam) for exam in exams]

@api_router.get("/admin/exams/{exam_id}", response_model=ExamResponse)
async def get_admin_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    exam = await db.exams.find_one({'id': exam_id}, {'_id': 0})
    if not exam:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    count = await db.questions.count_documents({'exam_id': exam_id})
    exam['question_count'] = count
    
    return ExamResponse(**exam)

@api_router.put("/admin/exams/{exam_id}", response_model=ExamResponse)
async def update_exam(exam_id: str, exam_data: ExamCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    result = await db.exams.update_one(
        {'id': exam_id},
        {'$set': exam_data.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    exam = await db.exams.find_one({'id': exam_id}, {'_id': 0})
    count = await db.questions.count_documents({'exam_id': exam_id})
    exam['question_count'] = count
    
    return ExamResponse(**exam)

@api_router.delete("/admin/exams/{exam_id}")
async def delete_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    # Delete all questions first
    await db.questions.delete_many({'exam_id': exam_id})
    
    result = await db.exams.delete_one({'id': exam_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    return {'message': 'Exam deleted successfully'}

@api_router.post("/admin/exams/{exam_id}/publish")
async def publish_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    result = await db.exams.update_one(
        {'id': exam_id},
        {'$set': {'published': True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    return {'message': 'Exam published successfully'}

@api_router.post("/admin/exams/{exam_id}/unpublish")
async def unpublish_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    result = await db.exams.update_one(
        {'id': exam_id},
        {'$set': {'published': False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    return {'message': 'Exam unpublished successfully'}

# ===== ADMIN QUESTION ROUTES =====

@api_router.post("/admin/questions", response_model=QuestionResponse)
async def create_question(question_data: QuestionCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    # Get current question count for ordering
    count = await db.questions.count_documents({'exam_id': question_data.exam_id})
    
    question_id = str(uuid.uuid4())
    question_doc = {
        'id': question_id,
        'exam_id': question_data.exam_id,
        'statement': question_data.statement,
        'image_url': question_data.image_url,
        'alternatives': [alt.model_dump() for alt in question_data.alternatives],
        'correct_answer': question_data.correct_answer,
        'tags': question_data.tags,
        'difficulty': question_data.difficulty,
        'area': question_data.area,
        'order': count + 1
    }
    
    await db.questions.insert_one(question_doc)
    return QuestionResponse(**question_doc)

@api_router.get("/admin/exams/{exam_id}/questions", response_model=List[QuestionResponse])
async def get_admin_questions(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    questions = await db.questions.find({'exam_id': exam_id}, {'_id': 0}).sort('order', 1).to_list(1000)
    return [QuestionResponse(**q) for q in questions]

@api_router.put("/admin/questions/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: str, question_data: QuestionCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    # Get existing order
    existing = await db.questions.find_one({'id': question_id}, {'_id': 0})
    if not existing:
        raise HTTPException(status_code=404, detail='Question not found')
    
    update_data = question_data.model_dump()
    update_data['alternatives'] = [alt.model_dump() for alt in question_data.alternatives]
    update_data['order'] = existing['order']
    
    result = await db.questions.update_one(
        {'id': question_id},
        {'$set': update_data}
    )
    
    question = await db.questions.find_one({'id': question_id}, {'_id': 0})
    return QuestionResponse(**question)

@api_router.delete("/admin/questions/{question_id}")
async def delete_question(question_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    result = await db.questions.delete_one({'id': question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Question not found')
    
    return {'message': 'Question deleted successfully'}

# ===== STUDENT EXAM ROUTES =====

@api_router.get("/exams", response_model=List[ExamResponse])
async def get_exams(current_user: dict = Depends(get_current_user)):
    exams = await db.exams.find({'published': True}, {'_id': 0}).to_list(1000)
    
    # Get question counts
    for exam in exams:
        count = await db.questions.count_documents({'exam_id': exam['id']})
        exam['question_count'] = count
    
    return [ExamResponse(**exam) for exam in exams]

@api_router.get("/exams/{exam_id}", response_model=ExamResponse)
async def get_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    exam = await db.exams.find_one({'id': exam_id, 'published': True}, {'_id': 0})
    if not exam:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    count = await db.questions.count_documents({'exam_id': exam_id})
    exam['question_count'] = count
    
    return ExamResponse(**exam)

@api_router.get("/exams/{exam_id}/questions", response_model=List[QuestionResponseStudent])
async def get_exam_questions(exam_id: str, current_user: dict = Depends(get_current_user)):
    # Check if exam is published
    exam = await db.exams.find_one({'id': exam_id, 'published': True}, {'_id': 0})
    if not exam:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    questions = await db.questions.find({'exam_id': exam_id}, {'_id': 0, 'correct_answer': 0}).sort('order', 1).to_list(1000)
    return [QuestionResponseStudent(**q) for q in questions]

# ===== ATTEMPT ROUTES =====

@api_router.post("/attempts", response_model=AttemptResponse)
async def create_attempt(attempt_data: AttemptCreate, current_user: dict = Depends(get_current_user)):
    # Check if exam exists and is published
    exam = await db.exams.find_one({'id': attempt_data.exam_id, 'published': True}, {'_id': 0})
    if not exam:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    attempt_id = str(uuid.uuid4())
    attempt_doc = {
        'id': attempt_id,
        'user_id': current_user['id'],
        'exam_id': attempt_data.exam_id,
        'exam_title': exam['title'],
        'start_time': datetime.now(timezone.utc).isoformat(),
        'end_time': None,
        'status': 'in_progress',
        'answers': {},
        'score': None
    }
    
    await db.attempts.insert_one(attempt_doc)
    return AttemptResponse(**attempt_doc)

@api_router.get("/attempts/{attempt_id}", response_model=AttemptResponse)
async def get_attempt(attempt_id: str, current_user: dict = Depends(get_current_user)):
    attempt = await db.attempts.find_one({'id': attempt_id, 'user_id': current_user['id']}, {'_id': 0})
    if not attempt:
        raise HTTPException(status_code=404, detail='Attempt not found')
    
    return AttemptResponse(**attempt)

@api_router.post("/attempts/{attempt_id}/answer")
async def save_answer(attempt_id: str, answer_data: AnswerSubmit, current_user: dict = Depends(get_current_user)):
    attempt = await db.attempts.find_one({'id': attempt_id, 'user_id': current_user['id']}, {'_id': 0})
    if not attempt:
        raise HTTPException(status_code=404, detail='Attempt not found')
    
    if attempt['status'] != 'in_progress':
        raise HTTPException(status_code=400, detail='Attempt already completed')
    
    # Update answer
    result = await db.attempts.update_one(
        {'id': attempt_id},
        {'$set': {f'answers.{answer_data.question_id}': answer_data.selected_answer}}
    )
    
    return {'message': 'Answer saved'}

@api_router.post("/attempts/{attempt_id}/submit", response_model=AttemptResponse)
async def submit_attempt(attempt_id: str, current_user: dict = Depends(get_current_user)):
    attempt = await db.attempts.find_one({'id': attempt_id, 'user_id': current_user['id']}, {'_id': 0})
    if not attempt:
        raise HTTPException(status_code=404, detail='Attempt not found')
    
    if attempt['status'] != 'in_progress':
        raise HTTPException(status_code=400, detail='Attempt already completed')
    
    # Get all questions with correct answers
    questions = await db.questions.find({'exam_id': attempt['exam_id']}, {'_id': 0}).to_list(1000)
    
    # Calculate score
    total_correct = 0
    area_scores = {}
    
    for question in questions:
        area = question['area']
        if area not in area_scores:
            area_scores[area] = {'correct': 0, 'total': 0}
        
        area_scores[area]['total'] += 1
        
        # Check if answered correctly
        selected = attempt['answers'].get(question['id'])
        if selected == question['correct_answer']:
            total_correct += 1
            area_scores[area]['correct'] += 1
    
    # Calculate percentages
    for area in area_scores:
        area_scores[area]['percentage'] = round(
            (area_scores[area]['correct'] / area_scores[area]['total']) * 100, 2
        ) if area_scores[area]['total'] > 0 else 0
    
    score_data = {
        'total_correct': total_correct,
        'total_questions': len(questions),
        'percentage': round((total_correct / len(questions)) * 100, 2) if len(questions) > 0 else 0,
        'by_area': area_scores
    }
    
    # Update attempt
    result = await db.attempts.update_one(
        {'id': attempt_id},
        {'$set': {
            'status': 'completed',
            'end_time': datetime.now(timezone.utc).isoformat(),
            'score': score_data
        }}
    )
    
    attempt = await db.attempts.find_one({'id': attempt_id}, {'_id': 0})
    return AttemptResponse(**attempt)

@api_router.get("/attempts", response_model=List[AttemptResponse])
async def get_user_attempts(current_user: dict = Depends(get_current_user)):
    attempts = await db.attempts.find({'user_id': current_user['id']}, {'_id': 0}).sort('start_time', -1).to_list(1000)
    return [AttemptResponse(**attempt) for attempt in attempts]

# ===== USER ROUTES =====

@api_router.put("/users/subscription")
async def update_subscription(current_user: dict = Depends(get_current_user)):
    # This is a mockup - in production would integrate with payment gateway
    result = await db.users.update_one(
        {'id': current_user['id']},
        {'$set': {'subscription_status': 'premium'}}
    )
    
    return {'message': 'Subscription updated to premium'}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    # Indexes improve performance and prevent duplicates/race conditions.
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.exams.create_index("id", unique=True)
        await db.exams.create_index([("published", 1), ("year", -1)])
        await db.questions.create_index([("exam_id", 1), ("order", 1)])
        await db.attempts.create_index([("user_id", 1), ("start_time", -1)])
        logger.info("Mongo indexes ensured.")
    except Exception:
        logger.exception("Failed to ensure Mongo indexes")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
