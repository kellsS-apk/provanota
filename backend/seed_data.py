"""
Seed script for ProvaNota - Creates sample data
Run: python seed_data.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
from datetime import datetime, timezone

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "provanota_db"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🌱 Seeding ProvaNota database...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.exams.delete_many({})
    await db.questions.delete_many({})
    await db.attempts.delete_many({})
    print("✓ Cleared existing data")
    
    # Create users
    admin_id = str(uuid.uuid4())
    student_id = str(uuid.uuid4())
    
    users = [
        {
            'id': admin_id,
            'email': 'admin@provanota.com',
            'password_hash': hash_password('admin123'),
            'name': 'Administrador',
            'role': 'admin',
            'subscription_status': 'premium',
            'preferred_exam': None,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': student_id,
            'email': 'estudante@provanota.com',
            'password_hash': hash_password('estudante123'),
            'name': 'Maria Silva',
            'role': 'student',
            'subscription_status': 'free',
            'preferred_exam': 'ENEM',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.users.insert_many(users)
    print("✓ Created users:")
    print("  - admin@provanota.com / admin123 (Admin)")
    print("  - estudante@provanota.com / estudante123 (Student - Free)")
    
    # Create sample exam
    exam_id = str(uuid.uuid4())
    exam = {
        'id': exam_id,
        'title': 'ENEM 2023 - Simulado Completo',
        'year': 2023,
        'banca': 'INEP',
        'duration_minutes': 180,
        'instructions': 'Leia atentamente cada questão antes de responder. Marque apenas uma alternativa por questão. Este simulado contém questões de todas as áreas do conhecimento.',
        'areas': ['Linguagens', 'Humanas', 'Natureza', 'Matemática'],
        'published': True,
        'created_by': admin_id,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.exams.insert_one(exam)
    print(f"✓ Created exam: {exam['title']}")
    
    # Create sample questions
    questions = [
        {
            'id': str(uuid.uuid4()),
            'exam_id': exam_id,
            'statement': 'Qual das alternativas apresenta corretamente um exemplo de linguagem formal?',
            'image_url': None,
            'alternatives': [
                {'letter': 'A', 'text': 'Oi, tudo bem? Vamos no cinema hoje?'},
                {'letter': 'B', 'text': 'Prezados senhores, venho por meio desta solicitar informações.'},
                {'letter': 'C', 'text': 'E aí mano, bora ali?'},
                {'letter': 'D', 'text': 'Fica tranquilo que eu resolvo isso.'},
                {'letter': 'E', 'text': 'Tá tudo certo, pode deixar.'}
            ],
            'correct_answer': 'B',
            'tags': ['Linguagem formal', 'Português'],
            'difficulty': 'easy',
            'area': 'Linguagens',
            'order': 1
        },
        {
            'id': str(uuid.uuid4()),
            'exam_id': exam_id,
            'statement': 'A Revolução Francesa (1789-1799) foi um dos eventos mais importantes da história moderna. Qual dos seguintes NÃO foi um dos seus principais lemas?',
            'image_url': None,
            'alternatives': [
                {'letter': 'A', 'text': 'Liberdade'},
                {'letter': 'B', 'text': 'Igualdade'},
                {'letter': 'C', 'text': 'Fraternidade'},
                {'letter': 'D', 'text': 'Prosperidade'},
                {'letter': 'E', 'text': 'Nenhuma das anteriores'}
            ],
            'correct_answer': 'D',
            'tags': ['História', 'Revolução Francesa'],
            'difficulty': 'medium',
            'area': 'Humanas',
            'order': 2
        },
        {
            'id': str(uuid.uuid4()),
            'exam_id': exam_id,
            'statement': 'No processo de fotossíntese, as plantas convertem luz solar em energia química. Qual é o principal pigmento responsável por captar a luz solar?',
            'image_url': None,
            'alternatives': [
                {'letter': 'A', 'text': 'Melanina'},
                {'letter': 'B', 'text': 'Hemoglobina'},
                {'letter': 'C', 'text': 'Clorofila'},
                {'letter': 'D', 'text': 'Caroteno'},
                {'letter': 'E', 'text': 'Xantofila'}
            ],
            'correct_answer': 'C',
            'tags': ['Biologia', 'Fotossíntese'],
            'difficulty': 'easy',
            'area': 'Natureza',
            'order': 3
        },
        {
            'id': str(uuid.uuid4()),
            'exam_id': exam_id,
            'statement': 'Um triângulo tem lados medindo 3cm, 4cm e 5cm. Este triângulo é:',
            'image_url': None,
            'alternatives': [
                {'letter': 'A', 'text': 'Equilátero'},
                {'letter': 'B', 'text': 'Isósceles'},
                {'letter': 'C', 'text': 'Retângulo'},
                {'letter': 'D', 'text': 'Obtusângulo'},
                {'letter': 'E', 'text': 'Escaleno agudo'}
            ],
            'correct_answer': 'C',
            'tags': ['Geometria', 'Triângulos'],
            'difficulty': 'medium',
            'area': 'Matemática',
            'order': 4
        },
        {
            'id': str(uuid.uuid4()),
            'exam_id': exam_id,
            'statement': 'Qual figura de linguagem está presente na frase: "Aquele homem é um leão"?',
            'image_url': None,
            'alternatives': [
                {'letter': 'A', 'text': 'Metáfora'},
                {'letter': 'B', 'text': 'Metonímia'},
                {'letter': 'C', 'text': 'Hipérbole'},
                {'letter': 'D', 'text': 'Eufemismo'},
                {'letter': 'E', 'text': 'Ironia'}
            ],
            'correct_answer': 'A',
            'tags': ['Figuras de linguagem', 'Literatura'],
            'difficulty': 'easy',
            'area': 'Linguagens',
            'order': 5
        }
    ]
    
    await db.questions.insert_many(questions)
    print(f"✓ Created {len(questions)} sample questions")
    
    print("\n✅ Database seeded successfully!")
    print("\n📝 Test Credentials:")
    print("=" * 50)
    print("Admin:")
    print("  Email: admin@provanota.com")
    print("  Password: admin123")
    print("\nStudent (Free):")
    print("  Email: estudante@provanota.com")
    print("  Password: estudante123")
    print("=" * 50)
    
    client.close()

if __name__ == '__main__':
    asyncio.run(seed_database())
