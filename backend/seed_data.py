"""
Seed script for ProvaNota V2
Creates sample questions for testing the simulation generation feature
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone
import hashlib
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'provanota')

def normalize_text(text: str) -> str:
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text.strip().lower())

def calculate_question_hash(statement: str, alternatives: list, source_exam: str, year: int) -> str:
    alt_text = ''.join(sorted([f"{a['letter']}:{a['text']}" for a in alternatives]))
    raw = f"{normalize_text(statement)}|{normalize_text(alt_text)}|{normalize_text(source_exam)}|{year or ''}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

SEED_QUESTIONS = [
    {
        "statement": "Qual é a fórmula da área de um círculo?",
        "alternatives": [
            {"letter": "A", "text": "πr"},
            {"letter": "B", "text": "πr²"},
            {"letter": "C", "text": "2πr"},
            {"letter": "D", "text": "πd"},
            {"letter": "E", "text": "r²"}
        ],
        "correct_answer": "B",
        "tags": ["geometria", "círculo", "área"],
        "difficulty": "easy",
        "area": "Matemática",
        "subject": "Matemática",
        "topic": "Geometria",
        "education_level": "vestibular",
        "source_exam": "ENEM",
        "year": 2023
    },
    {
        "statement": "Em 'Os Lusíadas', de Camões, qual figura mitológica representa os perigos do mar desconhecido?",
        "alternatives": [
            {"letter": "A", "text": "Netuno"},
            {"letter": "B", "text": "Adamastor"},
            {"letter": "C", "text": "Vênus"},
            {"letter": "D", "text": "Marte"},
            {"letter": "E", "text": "Júpiter"}
        ],
        "correct_answer": "B",
        "tags": ["literatura", "camões", "lusíadas"],
        "difficulty": "medium",
        "area": "Linguagens",
        "subject": "Literatura",
        "topic": "Barroco",
        "education_level": "vestibular",
        "source_exam": "ENEM",
        "year": 2022
    },
    {
        "statement": "Qual é o principal gás responsável pelo efeito estufa?",
        "alternatives": [
            {"letter": "A", "text": "Oxigênio (O₂)"},
            {"letter": "B", "text": "Nitrogênio (N₂)"},
            {"letter": "C", "text": "Dióxido de carbono (CO₂)"},
            {"letter": "D", "text": "Hidrogênio (H₂)"},
            {"letter": "E", "text": "Hélio (He)"}
        ],
        "correct_answer": "C",
        "tags": ["meio ambiente", "clima", "gases"],
        "difficulty": "easy",
        "area": "Natureza",
        "subject": "Química",
        "topic": "Química Inorgânica",
        "education_level": "vestibular",
        "source_exam": "ENEM",
        "year": 2023
    },
    {
        "statement": "A Revolução Industrial iniciou-se em qual país?",
        "alternatives": [
            {"letter": "A", "text": "França"},
            {"letter": "B", "text": "Alemanha"},
            {"letter": "C", "text": "Estados Unidos"},
            {"letter": "D", "text": "Inglaterra"},
            {"letter": "E", "text": "Itália"}
        ],
        "correct_answer": "D",
        "tags": ["revolução industrial", "história moderna"],
        "difficulty": "easy",
        "area": "Humanas",
        "subject": "História",
        "topic": "Era Moderna",
        "education_level": "vestibular",
        "source_exam": "ENEM",
        "year": 2021
    },
    {
        "statement": "Na equação do segundo grau ax² + bx + c = 0, qual é a fórmula de Bhaskara para encontrar as raízes?",
        "alternatives": [
            {"letter": "A", "text": "x = -b ± √(b² - 4ac) / 2a"},
            {"letter": "B", "text": "x = b ± √(b² - 4ac) / 2a"},
            {"letter": "C", "text": "x = -b ± √(b² + 4ac) / 2a"},
            {"letter": "D", "text": "x = (-b ± √(b² - 4ac)) / 2a"},
            {"letter": "E", "text": "x = -b / 2a"}
        ],
        "correct_answer": "D",
        "tags": ["álgebra", "equação", "bhaskara"],
        "difficulty": "medium",
        "area": "Matemática",
        "subject": "Matemática",
        "topic": "Álgebra",
        "education_level": "vestibular",
        "source_exam": "FUVEST",
        "year": 2023
    },
    {
        "statement": "Qual organela celular é responsável pela produção de energia (ATP)?",
        "alternatives": [
            {"letter": "A", "text": "Ribossomo"},
            {"letter": "B", "text": "Complexo de Golgi"},
            {"letter": "C", "text": "Mitocôndria"},
            {"letter": "D", "text": "Lisossomo"},
            {"letter": "E", "text": "Retículo Endoplasmático"}
        ],
        "correct_answer": "C",
        "tags": ["citologia", "organelas", "energia"],
        "difficulty": "easy",
        "area": "Natureza",
        "subject": "Biologia",
        "topic": "Citologia",
        "education_level": "vestibular",
        "source_exam": "ENEM",
        "year": 2022
    },
    {
        "statement": "Segundo a teoria de Durkheim, o que são 'fatos sociais'?",
        "alternatives": [
            {"letter": "A", "text": "Eventos históricos relevantes"},
            {"letter": "B", "text": "Maneiras de agir, pensar e sentir exteriores ao indivíduo"},
            {"letter": "C", "text": "Relações econômicas entre classes"},
            {"letter": "D", "text": "Conflitos entre grupos sociais"},
            {"letter": "E", "text": "Leis criadas pelo Estado"}
        ],
        "correct_answer": "B",
        "tags": ["durkheim", "sociologia", "fatos sociais"],
        "difficulty": "medium",
        "area": "Humanas",
        "subject": "Sociologia",
        "topic": "Clássicos",
        "education_level": "vestibular",
        "source_exam": "ENEM",
        "year": 2023
    },
    {
        "statement": "Qual é a derivada de f(x) = x³?",
        "alternatives": [
            {"letter": "A", "text": "x²"},
            {"letter": "B", "text": "3x²"},
            {"letter": "C", "text": "3x"},
            {"letter": "D", "text": "x³/3"},
            {"letter": "E", "text": "2x³"}
        ],
        "correct_answer": "B",
        "tags": ["cálculo", "derivada"],
        "difficulty": "easy",
        "area": "Matemática",
        "subject": "Cálculo",
        "topic": "Derivadas",
        "education_level": "faculdade",
        "source_exam": "Prova Interna",
        "year": 2023
    },
    {
        "statement": "Na física, qual é a unidade de medida de força no Sistema Internacional?",
        "alternatives": [
            {"letter": "A", "text": "Joule"},
            {"letter": "B", "text": "Watt"},
            {"letter": "C", "text": "Newton"},
            {"letter": "D", "text": "Pascal"},
            {"letter": "E", "text": "Ampère"}
        ],
        "correct_answer": "C",
        "tags": ["física", "força", "unidades"],
        "difficulty": "easy",
        "area": "Natureza",
        "subject": "Física",
        "topic": "Mecânica",
        "education_level": "escola",
        "source_exam": "Simulado Interno",
        "year": 2023
    },
    {
        "statement": "Complete: 'I ____ to the store yesterday.'",
        "alternatives": [
            {"letter": "A", "text": "go"},
            {"letter": "B", "text": "goes"},
            {"letter": "C", "text": "went"},
            {"letter": "D", "text": "going"},
            {"letter": "E", "text": "gone"}
        ],
        "correct_answer": "C",
        "tags": ["inglês", "past tense", "verbo"],
        "difficulty": "easy",
        "area": "Linguagens",
        "subject": "Inglês",
        "topic": "Grammar",
        "education_level": "escola",
        "source_exam": "Simulado Interno",
        "year": 2023
    }
]

async def seed_questions():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Conectando ao MongoDB: {db_name}")
    
    inserted = 0
    skipped = 0
    
    for q in SEED_QUESTIONS:
        q_hash = calculate_question_hash(
            q['statement'],
            q['alternatives'],
            q['source_exam'],
            q['year']
        )
        
        # Check if already exists
        existing = await db.questions.find_one({'question_hash': q_hash})
        if existing:
            print(f"Questão já existe: {q['statement'][:50]}...")
            skipped += 1
            continue
        
        question_doc = {
            'id': str(uuid.uuid4()),
            'exam_id': None,
            'statement': q['statement'],
            'image_url': None,
            'alternatives': q['alternatives'],
            'correct_answer': q['correct_answer'],
            'tags': q['tags'],
            'difficulty': q['difficulty'],
            'area': q['area'],
            'subject': q['subject'],
            'topic': q['topic'],
            'education_level': q['education_level'],
            'source_exam': q['source_exam'],
            'year': q['year'],
            'question_hash': q_hash,
            'order': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.questions.insert_one(question_doc)
        print(f"Inserida: {q['statement'][:50]}...")
        inserted += 1
    
    print(f"\n=== Resultado ===")
    print(f"Inseridas: {inserted}")
    print(f"Ignoradas (duplicadas): {skipped}")
    
    # Show total count
    total = await db.questions.count_documents({})
    print(f"Total de questões no banco: {total}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_questions())
