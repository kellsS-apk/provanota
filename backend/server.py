from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import hashlib
import re

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

# CORS origins: comma-separated list
def _parse_origins(raw: str):
    origins = []
    for o in (raw or '').split(','):
        o = o.strip()
        if o:
            origins.append(o)
    return origins

CORS_ORIGINS = _parse_origins(os.environ.get('CORS_ORIGINS', 'http://localhost:3000'))

# Safety: require a JWT secret in production
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is required. Set it in your environment.")

# ===== ENUMS AND CONSTANTS =====

EDUCATION_LEVELS = ["escola", "vestibular", "faculdade"]
DIFFICULTIES = ["easy", "medium", "hard"]
AREAS_ENEM = ["Linguagens", "Humanas", "Natureza", "Matemática"]

VALID_SUBJECTS = [
    "Matemática", "Português", "Literatura", "Inglês", "Espanhol",
    "História", "Geografia", "Filosofia", "Sociologia",
    "Física", "Química", "Biologia",
    "Cálculo", "Álgebra Linear", "Estatística", "Programação",
    "Direito Constitucional", "Administração", "Contabilidade"
]

TOPICS_BY_SUBJECT = {
    "Matemática": ["Álgebra", "Geometria", "Trigonometria", "Funções", "Probabilidade", "Estatística", "Aritmética"],
    "Português": ["Gramática", "Interpretação", "Redação", "Ortografia", "Sintaxe", "Semântica"],
    "Literatura": ["Romantismo", "Realismo", "Modernismo", "Barroco", "Arcadismo", "Contemporânea"],
    "Inglês": ["Grammar", "Reading", "Vocabulary", "Interpretation"],
    "Espanhol": ["Gramática", "Lectura", "Vocabulario", "Interpretación"],
    "História": ["Brasil Colônia", "Brasil Império", "Brasil República", "História Antiga", "Idade Média", "Era Moderna", "Contemporânea"],
    "Geografia": ["Cartografia", "Climatologia", "Geopolítica", "Urbanização", "Meio Ambiente", "Globalização"],
    "Filosofia": ["Ética", "Epistemologia", "Metafísica", "Filosofia Política", "Lógica"],
    "Sociologia": ["Clássicos", "Cultura", "Trabalho", "Desigualdade", "Movimentos Sociais"],
    "Física": ["Mecânica", "Termodinâmica", "Óptica", "Eletricidade", "Ondas", "Física Moderna"],
    "Química": ["Química Orgânica", "Química Inorgânica", "Físico-Química", "Estequiometria"],
    "Biologia": ["Citologia", "Genética", "Ecologia", "Evolução", "Fisiologia", "Botânica", "Zoologia"],
    "Cálculo": ["Limites", "Derivadas", "Integrais", "Séries"],
    "Álgebra Linear": ["Matrizes", "Vetores", "Sistemas Lineares", "Transformações"],
    "Estatística": ["Descritiva", "Inferencial", "Probabilidade", "Regressão"],
    "Programação": ["Algoritmos", "Estruturas de Dados", "POO", "Web"],
    "Direito Constitucional": ["Princípios", "Direitos Fundamentais", "Organização do Estado"],
    "Administração": ["Gestão", "Marketing", "Finanças", "RH"],
    "Contabilidade": ["Balanço", "DRE", "Custos", "Tributária"]
}

def normalize_text(text: str) -> str:
    """Normalize text for comparison and hashing"""
    if not text:
        return ""
    # Remove extra whitespace, lowercase, strip
    return re.sub(r'\s+', ' ', text.strip().lower())

def calculate_question_hash(statement: str, alternatives: List[dict], source_exam: str, year: Optional[int]) -> str:
    """Calculate unique hash for question to prevent duplicates"""
    alt_text = ''.join(sorted([f"{a['letter']}:{a['text']}" for a in alternatives]))
    raw = f"{normalize_text(statement)}|{normalize_text(alt_text)}|{normalize_text(source_exam)}|{year or ''}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def normalize_subject(subject: str) -> str:
    """Normalize subject name with proper capitalization"""
    if not subject:
        return subject
    subject = subject.strip()
    # Check if it matches any valid subject (case-insensitive)
    for valid in VALID_SUBJECTS:
        if subject.lower() == valid.lower():
            return valid
    return subject.title()

# Create the main app
app = FastAPI()

@app.get("/")
def root():
    return {"message": "API ProvaNota funcionando 🚀"}

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===== MODELS =====

class UserRegister(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=2, max_length=80)

class UserLogin(BaseModel):
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
    areas: List[str]
    education_level: Optional[str] = "vestibular"

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
    education_level: str = "vestibular"

class Alternative(BaseModel):
    letter: str
    text: str

class QuestionCreate(BaseModel):
    exam_id: str
    statement: str
    image_url: Optional[str] = None
    alternatives: List[Alternative]
    correct_answer: str
    tags: List[str]
    difficulty: str
    area: str

class QuestionCreateV2(BaseModel):
    """Extended question model for V2"""
    exam_id: Optional[str] = None
    statement: str
    image_url: Optional[str] = None
    alternatives: List[Alternative]
    correct_answer: Literal["A", "B", "C", "D", "E"]
    tags: List[str] = []
    difficulty: Literal["easy", "medium", "hard"]
    area: Optional[str] = None
    subject: str
    topic: str
    education_level: Literal["escola", "vestibular", "faculdade"] = "vestibular"
    source_exam: str
    year: Optional[int] = None

class QuestionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    exam_id: Optional[str] = None
    statement: str
    image_url: Optional[str] = None
    alternatives: List[Alternative]
    correct_answer: str
    tags: List[str]
    difficulty: str
    area: Optional[str] = None
    order: int = 0
    subject: Optional[str] = None
    topic: Optional[str] = None
    education_level: str = "vestibular"
    source_exam: Optional[str] = None
    year: Optional[int] = None

class QuestionResponseStudent(BaseModel):
    """Question without correct_answer for students"""
    model_config = ConfigDict(extra="ignore")
    id: str
    exam_id: Optional[str] = None
    statement: str
    image_url: Optional[str] = None
    alternatives: List[Alternative]
    tags: List[str]
    difficulty: str
    area: Optional[str] = None
    order: int = 0
    subject: Optional[str] = None
    topic: Optional[str] = None
    education_level: str = "vestibular"
    source_exam: Optional[str] = None
    year: Optional[int] = None

# Simulation Models
class SimulationGenerateRequest(BaseModel):
    subjects: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    education_level: Optional[str] = None
    difficulty: Optional[str] = None
    sources: Optional[List[str]] = None
    year_range: Optional[List[int]] = None  # [min_year, max_year]
    limit: int = Field(default=10, ge=1, le=100)
    type: Literal["custom", "mixed"] = "custom"

class SimulationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: str
    criteria: Dict[str, Any]
    question_ids: List[str]
    question_count: int
    created_by: str
    created_at: str

# Attempt Models
class AttemptCreate(BaseModel):
    exam_id: Optional[str] = None

class AttemptCreateSimulation(BaseModel):
    pass

class AnswerSubmit(BaseModel):
    question_id: str
    selected_answer: str

class AttemptResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    exam_id: Optional[str] = None
    simulation_id: Optional[str] = None
    exam_title: Optional[str] = None
    mode: str = "official"
    start_time: str
    end_time: Optional[str] = None
    status: str
    answers: Dict[str, str] = {}
    score: Optional[Dict[str, Any]] = None
    duration_seconds: Optional[int] = None


class AttemptReviewItem(BaseModel):
    question_id: str
    statement: str
    image_url: Optional[str] = None
    alternatives: List[Alternative]
    correct_answer: str
    selected_answer: Optional[str] = None
    is_correct: bool
    tags: List[str] = []
    difficulty: str = "medium"
    area: str = "string"
    subject: str = "string"
    topic: str = "string"
    education_level: str = "vestibular"
    source_exam: str = "string"
    year: int = 0
    explanation: Optional[str] = None


class AttemptReviewResponse(BaseModel):
    attempt_id: str
    exam_id: str
    score: float
    correct_count: int
    total_questions: int
    questions: List[AttemptReviewItem]


# Import Model
class QuestionImport(BaseModel):
    statement: str
    image_url: Optional[str] = None
    alternatives: List[Alternative]
    correct_answer: Literal["A", "B", "C", "D", "E"]
    tags: List[str] = []
    difficulty: Literal["easy", "medium", "hard"]
    area: Optional[str] = None
    subject: str
    topic: str
    education_level: Literal["escola", "vestibular", "faculdade"] = "vestibular"
    source_exam: str
    year: Optional[int] = None
    exam_id: Optional[str] = None

class ImportQuestionsRequest(BaseModel):
    questions: List[QuestionImport]

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
    existing = await db.users.find_one({'email': user_data.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    
    user_id = str(uuid.uuid4())
    # SECURITY: Always create as student, check whitelist for admin
    role = 'admin' if user_data.email.lower() in ADMIN_EMAILS else 'student'
    
    user_doc = {
        'id': user_id,
        'email': user_data.email,
        'password_hash': hash_password(user_data.password),
        'name': user_data.name,
        'role': role,
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
        'education_level': exam_data.education_level or 'vestibular',
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
    
    # OPTIMIZED: Use aggregation with $lookup to avoid N+1 queries
    pipeline = [
        {'$lookup': {
            'from': 'questions',
            'localField': 'id',
            'foreignField': 'exam_id',
            'as': 'questions_list'
        }},
        {'$addFields': {
            'question_count': {'$size': '$questions_list'},
            'education_level': {'$ifNull': ['$education_level', 'vestibular']}
        }},
        {'$project': {'questions_list': 0, '_id': 0}},
        {'$sort': {'created_at': -1}}
    ]
    
    exams = await db.exams.aggregate(pipeline).to_list(200)
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
    if 'education_level' not in exam:
        exam['education_level'] = 'vestibular'
    
    return ExamResponse(**exam)

@api_router.put("/admin/exams/{exam_id}", response_model=ExamResponse)
async def update_exam(exam_id: str, exam_data: ExamCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    update_data = exam_data.model_dump()
    result = await db.exams.update_one(
        {'id': exam_id},
        {'$set': update_data}
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
        'order': count + 1,
        'subject': question_data.area,
        'topic': '',
        'education_level': 'vestibular',
        'source_exam': '',
        'year': None,
        'question_hash': calculate_question_hash(
            question_data.statement,
            [alt.model_dump() for alt in question_data.alternatives],
            '',
            None
        ),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.questions.insert_one(question_doc)
    return QuestionResponse(**question_doc)

@api_router.get("/admin/exams/{exam_id}/questions", response_model=List[QuestionResponse])
async def get_admin_questions(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    # OPTIMIZED: Reasonable limit for exam questions (most exams have <200 questions)
    questions = await db.questions.find(
        {'exam_id': exam_id}, 
        {'_id': 0}
    ).sort('order', 1).to_list(500)
    return [QuestionResponse(**q) for q in questions]

@api_router.put("/admin/questions/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: str, question_data: QuestionCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    existing = await db.questions.find_one({'id': question_id}, {'_id': 0})
    if not existing:
        raise HTTPException(status_code=404, detail='Question not found')
    
    update_data = question_data.model_dump()
    update_data['alternatives'] = [alt.model_dump() for alt in question_data.alternatives]
    update_data['order'] = existing.get('order', 0)
    
    await db.questions.update_one(
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

# ===== ADMIN IMPORT QUESTIONS =====

@api_router.post("/admin/import/questions")
async def import_questions(import_data: ImportQuestionsRequest, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    inserted = 0
    skipped_duplicates = 0
    errors = []
    
    for idx, q in enumerate(import_data.questions):
        # Normalize subject
        subject = normalize_subject(q.subject)
        
        # Calculate hash
        q_hash = calculate_question_hash(
            q.statement,
            [alt.model_dump() for alt in q.alternatives],
            q.source_exam,
            q.year
        )
        
        # Check for duplicate
        existing = await db.questions.find_one({'question_hash': q_hash})
        if existing:
            skipped_duplicates += 1
            continue
        
        question_id = str(uuid.uuid4())
        question_doc = {
            'id': question_id,
            'exam_id': q.exam_id,
            'statement': q.statement,
            'image_url': q.image_url,
            'alternatives': [alt.model_dump() for alt in q.alternatives],
            'correct_answer': q.correct_answer,
            'tags': q.tags,
            'difficulty': q.difficulty,
            'area': q.area,
            'subject': subject,
            'topic': q.topic.strip() if q.topic else '',
            'education_level': q.education_level,
            'source_exam': q.source_exam.strip() if q.source_exam else '',
            'year': q.year,
            'question_hash': q_hash,
            'order': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        try:
            await db.questions.insert_one(question_doc)
            inserted += 1
        except Exception as e:
            errors.append(f"Question {idx}: {str(e)}")
    
    return {
        'inserted': inserted,
        'skipped_duplicates': skipped_duplicates,
        'errors': errors if errors else None
    }

# ===== STUDENT EXAM ROUTES =====

@api_router.get("/exams", response_model=List[ExamResponse])
async def get_exams(current_user: dict = Depends(get_current_user)):
    # OPTIMIZED: Use aggregation with $lookup to avoid N+1 queries
    pipeline = [
        {'$match': {'published': True}},
        {'$lookup': {
            'from': 'questions',
            'localField': 'id',
            'foreignField': 'exam_id',
            'as': 'questions_list'
        }},
        {'$addFields': {
            'question_count': {'$size': '$questions_list'},
            'education_level': {'$ifNull': ['$education_level', 'vestibular']}
        }},
        {'$project': {'questions_list': 0, '_id': 0}},
        {'$sort': {'year': -1}}
    ]
    
    exams = await db.exams.aggregate(pipeline).to_list(100)
    return [ExamResponse(**exam) for exam in exams]

@api_router.get("/exams/{exam_id}", response_model=ExamResponse)
async def get_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    exam = await db.exams.find_one({'id': exam_id, 'published': True}, {'_id': 0})
    if not exam:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    count = await db.questions.count_documents({'exam_id': exam_id})
    exam['question_count'] = count
    if 'education_level' not in exam:
        exam['education_level'] = 'vestibular'
    
    return ExamResponse(**exam)

@api_router.get("/exams/{exam_id}/questions", response_model=List[QuestionResponseStudent])
async def get_exam_questions(exam_id: str, current_user: dict = Depends(get_current_user)):
    exam = await db.exams.find_one({'id': exam_id, 'published': True}, {'_id': 0})
    if not exam:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    # OPTIMIZED: Reasonable limit for exam questions
    questions = await db.questions.find(
        {'exam_id': exam_id}, 
        {'_id': 0, 'correct_answer': 0, 'question_hash': 0}
    ).sort('order', 1).to_list(500)
    return [QuestionResponseStudent(**q) for q in questions]

# ===== SIMULATION ROUTES =====

@api_router.post("/simulations/generate", response_model=SimulationResponse)
async def generate_simulation(criteria: SimulationGenerateRequest, current_user: dict = Depends(get_current_user)):
    """Generate a custom simulation based on criteria"""
    
    # Build match pipeline
    match_conditions = []
    
    if criteria.subjects:
        # Validate subjects for public endpoints
        normalized_subjects = [normalize_subject(s) for s in criteria.subjects]
        for s in normalized_subjects:
            if s not in VALID_SUBJECTS:
                raise HTTPException(status_code=400, detail=f'Invalid subject: {s}')
        match_conditions.append({'subject': {'$in': normalized_subjects}})
    
    if criteria.topics:
        match_conditions.append({'topic': {'$in': criteria.topics}})
    
    if criteria.education_level:
        if criteria.education_level not in EDUCATION_LEVELS:
            raise HTTPException(status_code=400, detail=f'Invalid education_level: {criteria.education_level}')
        match_conditions.append({'education_level': criteria.education_level})
    
    if criteria.difficulty:
        if criteria.difficulty not in DIFFICULTIES:
            raise HTTPException(status_code=400, detail=f'Invalid difficulty: {criteria.difficulty}')
        match_conditions.append({'difficulty': criteria.difficulty})
    
    if criteria.sources:
        match_conditions.append({'source_exam': {'$in': criteria.sources}})
    
    if criteria.year_range and len(criteria.year_range) == 2:
        match_conditions.append({
            'year': {'$gte': criteria.year_range[0], '$lte': criteria.year_range[1]}
        })
    
    # Build aggregation pipeline
    pipeline = []
    
    if match_conditions:
        pipeline.append({'$match': {'$and': match_conditions}})
    
    # Use $sample for random selection - efficient MongoDB aggregation
    pipeline.append({'$sample': {'size': criteria.limit}})
    pipeline.append({'$project': {'_id': 0, 'id': 1}})
    
    # Execute aggregation
    cursor = db.questions.aggregate(pipeline)
    results = await cursor.to_list(criteria.limit)
    
    question_ids = [r['id'] for r in results]
    
    if len(question_ids) < 1:
        raise HTTPException(
            status_code=400, 
            detail='Não há questões suficientes com os filtros selecionados'
        )
    
    # VALIDATION: Verify all question_ids actually exist (defensive check)
    existing_count = await db.questions.count_documents({'id': {'$in': question_ids}})
    if existing_count != len(question_ids):
        logger.warning(f"Question ID mismatch: expected {len(question_ids)}, found {existing_count}")
        # Re-fetch valid IDs only
        valid_questions = await db.questions.find(
            {'id': {'$in': question_ids}}, 
            {'_id': 0, 'id': 1}
        ).to_list(len(question_ids))
        question_ids = [q['id'] for q in valid_questions]
    
    # Create simulation
    simulation_id = str(uuid.uuid4())
    simulation_doc = {
        'id': simulation_id,
        'type': criteria.type,
        'criteria': criteria.model_dump(),
        'question_ids': question_ids,
        'created_by': current_user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.simulations.insert_one(simulation_doc)
    
    return SimulationResponse(
        **simulation_doc,
        question_count=len(question_ids)
    )

@api_router.get("/simulations/my", response_model=List[SimulationResponse])
async def get_my_simulations(current_user: dict = Depends(get_current_user)):
    """List user's simulations"""
    simulations = await db.simulations.find(
        {'created_by': current_user['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    return [SimulationResponse(**s, question_count=len(s.get('question_ids', []))) for s in simulations]

@api_router.get("/simulations/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(simulation_id: str, current_user: dict = Depends(get_current_user)):
    """Get simulation details"""
    simulation = await db.simulations.find_one({'id': simulation_id}, {'_id': 0})
    
    if not simulation:
        raise HTTPException(status_code=404, detail='Simulation not found')
    
    if simulation['created_by'] != current_user['id']:
        raise HTTPException(status_code=403, detail='Access denied')
    
    return SimulationResponse(
        **simulation,
        question_count=len(simulation.get('question_ids', []))
    )

@api_router.get("/simulations/{simulation_id}/questions", response_model=List[QuestionResponseStudent])
async def get_simulation_questions(simulation_id: str, current_user: dict = Depends(get_current_user)):
    """Get simulation questions (without correct answers)"""
    simulation = await db.simulations.find_one({'id': simulation_id}, {'_id': 0})
    
    if not simulation:
        raise HTTPException(status_code=404, detail='Simulation not found')
    
    if simulation['created_by'] != current_user['id']:
        raise HTTPException(status_code=403, detail='Access denied')
    
    question_ids = simulation.get('question_ids', [])
    
    if not question_ids:
        return []
    
    # Fetch questions without correct_answer
    questions = await db.questions.find(
        {'id': {'$in': question_ids}},
        {'_id': 0, 'correct_answer': 0, 'question_hash': 0}
    ).to_list(len(question_ids))
    
    # Maintain order
    id_to_question = {q['id']: q for q in questions}
    ordered_questions = []
    for idx, qid in enumerate(question_ids):
        if qid in id_to_question:
            q = id_to_question[qid]
            q['order'] = idx + 1
            ordered_questions.append(q)
    
    return [QuestionResponseStudent(**q) for q in ordered_questions]

@api_router.post("/simulations/{simulation_id}/attempt", response_model=AttemptResponse)
async def create_simulation_attempt(simulation_id: str, current_user: dict = Depends(get_current_user)):
    """Create an attempt for a simulation"""
    simulation = await db.simulations.find_one({'id': simulation_id}, {'_id': 0})
    
    if not simulation:
        raise HTTPException(status_code=404, detail='Simulation not found')
    
    if simulation['created_by'] != current_user['id']:
        raise HTTPException(status_code=403, detail='Access denied')
    
    attempt_id = str(uuid.uuid4())
    question_count = len(simulation.get('question_ids', []))
    # 1 minute per question as default duration
    duration_seconds = question_count * 60
    
    attempt_doc = {
        'id': attempt_id,
        'user_id': current_user['id'],
        'exam_id': None,
        'simulation_id': simulation_id,
        'exam_title': f"Simulado Personalizado ({question_count} questões)",
        'mode': 'generated',
        'start_time': datetime.now(timezone.utc).isoformat(),
        'end_time': None,
        'status': 'in_progress',
        'answers': {},
        'score': None,
        'duration_seconds': duration_seconds
    }
    
    await db.attempts.insert_one(attempt_doc)
    return AttemptResponse(**attempt_doc)

# ===== ATTEMPT ROUTES =====

@api_router.post("/attempts", response_model=AttemptResponse)
async def create_attempt(attempt_data: AttemptCreate, current_user: dict = Depends(get_current_user)):
    if not attempt_data.exam_id:
        raise HTTPException(status_code=400, detail='exam_id is required')
    
    exam = await db.exams.find_one({'id': attempt_data.exam_id, 'published': True}, {'_id': 0})
    if not exam:
        raise HTTPException(status_code=404, detail='Exam not found')
    
    attempt_id = str(uuid.uuid4())
    duration_seconds = exam.get('duration_minutes', 60) * 60
    
    attempt_doc = {
        'id': attempt_id,
        'user_id': current_user['id'],
        'exam_id': attempt_data.exam_id,
        'simulation_id': None,
        'exam_title': exam['title'],
        'mode': 'official',
        'start_time': datetime.now(timezone.utc).isoformat(),
        'end_time': None,
        'status': 'in_progress',
        'answers': {},
        'score': None,
        'duration_seconds': duration_seconds
    }
    
    await db.attempts.insert_one(attempt_doc)
    return AttemptResponse(**attempt_doc)

@api_router.get("/attempts/{attempt_id}", response_model=AttemptResponse)
async def get_attempt(attempt_id: str, current_user: dict = Depends(get_current_user)):
    attempt = await db.attempts.find_one({'id': attempt_id, 'user_id': current_user['id']}, {'_id': 0})
    if not attempt:
        raise HTTPException(status_code=404, detail='Attempt not found')
    
    return AttemptResponse(**attempt)



@api_router.get("/attempts/{attempt_id}/review", response_model=AttemptReviewResponse)
async def get_attempt_review(attempt_id: str, current_user=Depends(get_current_user)):
    attempt_doc = await db.attempts.find_one({'id': attempt_id, 'user_id': current_user['id']})
    if not attempt_doc:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Attempt may be from an exam OR a personalized simulation
    exam_id = attempt_doc.get("exam_id")
    simulation_id = attempt_doc.get("simulation_id")
    user_answers = attempt_doc.get("user_answers") or {}

    question_ids: List[str] = []

    if exam_id:
        exam = await db.exams.find_one({'id': exam_id})
        if exam:
            question_ids = exam.get("question_ids") or []
        else:
            # fallback to answers keys
            question_ids = list(user_answers.keys())
    elif simulation_id:
        simulation = await db.simulations.find_one({'id': simulation_id, 'user_id': current_user['id']})
        if simulation:
            question_ids = simulation.get("question_ids") or []
        else:
            # fallback to answers keys
            question_ids = list(user_answers.keys())
    else:
        question_ids = list(user_answers.keys())

    if not question_ids:
        raise HTTPException(status_code=404, detail="Questions not found for this attempt")

    q_docs = await db.questions.find({'id': {'$in': question_ids}}).to_list(length=len(question_ids))
    q_by_id = {q['id']: q for q in q_docs}

    review_items: List[AttemptReviewItem] = []
    correct_count = 0

    # Preserve original order (exam/simulation order)
    for qid in question_ids:
        qdoc = q_by_id.get(qid)
        if not qdoc:
            continue

        selected = user_answers.get(qid)
        correct_answer = qdoc.get("correct_answer")
        is_correct = bool(selected) and selected == correct_answer
        if is_correct:
            correct_count += 1

        # Normalize alternatives to Alternative model
        alternatives = []
        for alt in (qdoc.get("alternatives") or []):
            if isinstance(alt, dict):
                alternatives.append(Alternative(letter=alt.get("letter"), text=alt.get("text")))
            else:
                # already Alternative
                alternatives.append(alt)

        review_items.append(AttemptReviewItem(
            question_id=qid,
            statement=qdoc.get("statement") or "",
            image_url=qdoc.get("image_url"),
            alternatives=alternatives,
            correct_answer=correct_answer,
            selected_answer=selected,
            is_correct=is_correct,
            tags=qdoc.get("tags") or [],
            difficulty=qdoc.get("difficulty") or "medium",
            area=qdoc.get("area") or "string",
            subject=qdoc.get("subject") or "string",
            topic=qdoc.get("topic") or "string",
            education_level=qdoc.get("education_level") or "vestibular",
            source_exam=qdoc.get("source_exam") or "string",
            year=qdoc.get("year") or 0,
            explanation=qdoc.get("explanation")
        ))

    total_questions = len(review_items)
    score = (correct_count / total_questions) * 100 if total_questions else 0

    return AttemptReviewResponse(
        attempt_id=attempt_id,
        exam_id=exam_id or simulation_id or "",
        total_questions=total_questions,
        correct_count=correct_count,
        score=score,
        questions=review_items
    )



@api_router.post("/attempts/{attempt_id}/answer")
async def save_answer(attempt_id: str, answer_data: AnswerSubmit, current_user: dict = Depends(get_current_user)):
    attempt = await db.attempts.find_one({'id': attempt_id, 'user_id': current_user['id']}, {'_id': 0})
    if not attempt:
        raise HTTPException(status_code=404, detail='Attempt not found')
    
    if attempt['status'] != 'in_progress':
        raise HTTPException(status_code=400, detail='Attempt already completed')
    
    # VALIDATION: Ensure selected_answer is valid (A-E)
    if answer_data.selected_answer not in ['A', 'B', 'C', 'D', 'E']:
        raise HTTPException(status_code=400, detail='Invalid answer. Must be A, B, C, D, or E')
    
    # VALIDATION: Verify question_id belongs to this attempt's exam/simulation
    if attempt.get('exam_id'):
        question = await db.questions.find_one(
            {'id': answer_data.question_id, 'exam_id': attempt['exam_id']},
            {'_id': 0, 'id': 1}
        )
    elif attempt.get('simulation_id'):
        simulation = await db.simulations.find_one({'id': attempt['simulation_id']}, {'_id': 0, 'question_ids': 1})
        if simulation and answer_data.question_id in simulation.get('question_ids', []):
            question = {'id': answer_data.question_id}
        else:
            question = None
    else:
        question = None
    
    if not question:
        raise HTTPException(status_code=400, detail='Invalid question_id for this attempt')
    
    await db.attempts.update_one(
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
    
    # Get questions based on exam_id or simulation_id
    if attempt.get('exam_id'):
        questions = await db.questions.find({'exam_id': attempt['exam_id']}, {'_id': 0}).to_list(500)
    elif attempt.get('simulation_id'):
        simulation = await db.simulations.find_one({'id': attempt['simulation_id']}, {'_id': 0})
        if not simulation:
            raise HTTPException(status_code=404, detail='Simulation not found')
        question_ids = simulation.get('question_ids', [])
        questions = await db.questions.find({'id': {'$in': question_ids}}, {'_id': 0}).to_list(len(question_ids))
    else:
        raise HTTPException(status_code=400, detail='Invalid attempt: no exam or simulation')
    
    # Calculate score
    total_correct = 0
    area_scores = {}
    subject_scores = {}
    
    for question in questions:
        area = question.get('area') or question.get('subject') or 'Geral'
        subject = question.get('subject') or area
        
        if area not in area_scores:
            area_scores[area] = {'correct': 0, 'total': 0}
        if subject not in subject_scores:
            subject_scores[subject] = {'correct': 0, 'total': 0}
        
        area_scores[area]['total'] += 1
        subject_scores[subject]['total'] += 1
        
        selected = attempt['answers'].get(question['id'])
        if selected == question['correct_answer']:
            total_correct += 1
            area_scores[area]['correct'] += 1
            subject_scores[subject]['correct'] += 1
    
    # Calculate percentages
    for area in area_scores:
        area_scores[area]['percentage'] = round(
            (area_scores[area]['correct'] / area_scores[area]['total']) * 100, 2
        ) if area_scores[area]['total'] > 0 else 0
    
    for subject in subject_scores:
        subject_scores[subject]['percentage'] = round(
            (subject_scores[subject]['correct'] / subject_scores[subject]['total']) * 100, 2
        ) if subject_scores[subject]['total'] > 0 else 0
    
    score_data = {
        'total_correct': total_correct,
        'total_questions': len(questions),
        'percentage': round((total_correct / len(questions)) * 100, 2) if len(questions) > 0 else 0,
        'by_area': area_scores,
        'by_subject': subject_scores
    }
    
    await db.attempts.update_one(
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
async def get_user_attempts(
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
    skip: int = 0
):
    # OPTIMIZED: Added pagination with reasonable defaults
    attempts = await db.attempts.find(
        {'user_id': current_user['id']}, 
        {'_id': 0}
    ).sort('start_time', -1).skip(skip).limit(min(limit, 100)).to_list(min(limit, 100))
    return [AttemptResponse(**attempt) for attempt in attempts]

# ===== METADATA ROUTES =====

@api_router.get("/metadata/subjects")
async def get_subjects():
    """Get list of valid subjects"""
    return {"subjects": VALID_SUBJECTS}

@api_router.get("/metadata/topics/{subject}")
async def get_topics(subject: str):
    """Get topics for a subject"""
    normalized = normalize_subject(subject)
    topics = TOPICS_BY_SUBJECT.get(normalized, [])
    return {"subject": normalized, "topics": topics}

@api_router.get("/metadata/filters")
async def get_filter_options():
    """Get available filter options from existing questions"""
    # Get unique values from questions collection
    subjects = await db.questions.distinct('subject')
    sources = await db.questions.distinct('source_exam')
    education_levels = await db.questions.distinct('education_level')
    
    # Get year range
    pipeline = [
        {'$match': {'year': {'$ne': None}}},
        {'$group': {'_id': None, 'min_year': {'$min': '$year'}, 'max_year': {'$max': '$year'}}}
    ]
    year_result = await db.questions.aggregate(pipeline).to_list(1)
    year_range = year_result[0] if year_result else {'min_year': 2010, 'max_year': 2024}
    
    # Get question count
    total_questions = await db.questions.count_documents({})
    
    return {
        'subjects': [s for s in subjects if s],
        'sources': [s for s in sources if s],
        'education_levels': [e for e in education_levels if e] or EDUCATION_LEVELS,
        'difficulties': DIFFICULTIES,
        'year_range': [year_range.get('min_year', 2010), year_range.get('max_year', 2024)],
        'total_questions': total_questions,
        'valid_subjects': VALID_SUBJECTS
    }

@api_router.get("/metadata/question-count")
async def get_question_count(
    subjects: Optional[str] = None,
    education_level: Optional[str] = None,
    difficulty: Optional[str] = None,
    sources: Optional[str] = None
):
    """Get count of questions matching filters"""
    match_conditions = []
    
    if subjects:
        subject_list = [normalize_subject(s.strip()) for s in subjects.split(',')]
        match_conditions.append({'subject': {'$in': subject_list}})
    
    if education_level:
        match_conditions.append({'education_level': education_level})
    
    if difficulty:
        match_conditions.append({'difficulty': difficulty})
    
    if sources:
        source_list = [s.strip() for s in sources.split(',')]
        match_conditions.append({'source_exam': {'$in': source_list}})
    
    query = {'$and': match_conditions} if match_conditions else {}
    count = await db.questions.count_documents(query)
    
    return {'count': count}

# ===== USER ROUTES =====

@api_router.put("/users/subscription")
async def update_subscription(current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {'id': current_user['id']},
        {'$set': {'subscription_status': 'premium'}}
    )
    return {'message': 'Subscription updated to premium'}

# ===== STATS ROUTES =====

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics for user"""
    user_id = current_user['id']
    
    # Get completed attempts
    completed_attempts = await db.attempts.find(
        {'user_id': user_id, 'status': 'completed'},
        {'_id': 0}
    ).sort('start_time', -1).to_list(100)
    
    # Get in-progress attempts
    in_progress = await db.attempts.find_one(
        {'user_id': user_id, 'status': 'in_progress'},
        {'_id': 0}
    )
    
    # Calculate stats
    total_completed = len(completed_attempts)
    avg_score = 0
    if total_completed > 0:
        scores = [a.get('score', {}).get('percentage', 0) for a in completed_attempts]
        avg_score = round(sum(scores) / len(scores), 1)
    
    # Last attempt info
    last_attempt = completed_attempts[0] if completed_attempts else None
    
    # Get simulations count
    simulations_count = await db.simulations.count_documents({'created_by': user_id})
    
    return {
        'total_completed': total_completed,
        'average_score': avg_score,
        'simulations_created': simulations_count,
        'last_attempt': last_attempt,
        'in_progress': in_progress
    }

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
    """Create indexes on startup"""
    try:
        # User indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        
        # Exam indexes
        await db.exams.create_index("id", unique=True)
        await db.exams.create_index([("published", 1), ("year", -1)])
        
        # Question indexes - OPTIMIZED for scalability
        await db.questions.create_index("id", unique=True)
        await db.questions.create_index("question_hash", unique=True, sparse=True)
        await db.questions.create_index("exam_id")
        await db.questions.create_index("year")  # Added for year_range queries
        await db.questions.create_index("subject")  # Added for distinct() optimization
        await db.questions.create_index("source_exam")  # Added for distinct() optimization
        await db.questions.create_index("education_level")  # Added for distinct() optimization
        await db.questions.create_index("difficulty")  # Added for filtering
        await db.questions.create_index([("subject", 1), ("education_level", 1)])
        await db.questions.create_index([("subject", 1), ("difficulty", 1)])  # Common filter combo
        await db.questions.create_index([("exam_id", 1), ("order", 1)])
        
        # Simulation indexes
        await db.simulations.create_index("id", unique=True)
        await db.simulations.create_index("created_by")
        await db.simulations.create_index([("created_by", 1), ("created_at", -1)])  # For listing user's simulations
        
        # Attempt indexes
        await db.attempts.create_index("id", unique=True)
        await db.attempts.create_index("user_id")
        await db.attempts.create_index("exam_id")
        await db.attempts.create_index("simulation_id")
        await db.attempts.create_index([("user_id", 1), ("status", 1)])  # For in-progress queries
        await db.attempts.create_index([("user_id", 1), ("start_time", -1)])
        
        logger.info("MongoDB indexes created successfully.")
    except Exception as e:
        logger.exception(f"Failed to create MongoDB indexes: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
