# ProvaNota - Project Structure

## Root Directory
```
provanota/
├── backend/              # FastAPI backend application
├── frontend/             # React frontend application
├── README.md             # Main project documentation
├── DEPLOYMENT.md         # Deployment guide for free hosting
├── CHECKLIST.md          # Deployment checklist
├── PROJECT_STRUCTURE.md  # This file
├── setup.sh              # Quick setup script (Linux/Mac)
├── setup.bat             # Quick setup script (Windows)
└── .gitignore            # Git ignore rules
```

## Backend Structure
```
backend/
├── server.py             # FastAPI application with all routes
├── seed_data.py          # Database seeding script
├── requirements.txt      # Python dependencies
├── render.yaml           # Render deployment config
├── .env.example          # Environment variables template
├── .gitignore            # Backend-specific git ignore
└── README.md             # Backend-specific documentation
```

### Backend Key Files

**server.py**
- FastAPI application setup
- MongoDB connection with Motor (async)
- JWT authentication system
- All API routes:
  - Auth: /api/auth/*
  - Exams: /api/exams/*
  - Attempts: /api/attempts/*
  - Admin: /api/admin/*
  - User: /api/users/*
- CORS middleware
- Pydantic models for validation

**seed_data.py**
- Creates test admin and student users
- Seeds sample ENEM 2023 exam with 5 questions
- Uses bcrypt for password hashing

**requirements.txt**
```
fastapi==0.110.1
uvicorn==0.25.0
motor==3.3.1          # Async MongoDB driver
pydantic>=2.6.4
python-dotenv>=1.0.1
bcrypt==4.1.3
pyjwt>=2.10.1
python-multipart>=0.0.9
```

## Frontend Structure
```
frontend/
├── public/                    # Static assets
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── pages/                 # Page components
│   │   ├── Login.js           # Authentication page
│   │   ├── Dashboard.js       # Student dashboard
│   │   ├── ExamDetail.js      # Exam details before starting
│   │   ├── Simulation.js      # Timed exam simulation
│   │   ├── Results.js         # Results with area breakdown
│   │   ├── Profile.js         # User profile & premium upgrade
│   │   ├── AdminDashboard.js  # Admin exam list
│   │   ├── ExamForm.js        # Create/edit exam
│   │   └── QuestionManager.js # Manage questions
│   ├── components/            # Reusable components
│   │   ├── ui/                # Shadcn/UI components
│   │   ├── Header.js          # App header with navigation
│   │   └── AdPlaceholder.js   # Ad placeholder component
│   ├── api.js                 # Axios API client
│   ├── AuthContext.js         # Authentication context
│   ├── App.js                 # Main app with routing
│   ├── App.css                # Component-specific styles
│   ├── index.js               # React entry point
│   └── index.css              # Global styles with Tailwind
├── package.json               # Node.js dependencies
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.js          # PostCSS configuration
├── craco.config.js            # Create React App config
├── vercel.json                # Vercel deployment config
├── .env.example               # Environment variables template
├── .gitignore                 # Frontend-specific git ignore
└── README.md                  # Frontend-specific documentation
```

### Frontend Key Files

**api.js**
- Axios configuration
- API endpoint functions
- JWT token interceptor

**AuthContext.js**
- React Context for authentication
- User state management
- Login/logout functions

**App.js**
- React Router setup
- Protected routes
- Public routes
- Role-based access control

**Pages Overview**
- Login: Email/password auth, register
- Dashboard: Stats, exam list, history
- ExamDetail: Exam info before starting
- Simulation: Timer, questions, navigation, autosave
- Results: Score breakdown by area
- Profile: User info, premium upgrade
- AdminDashboard: Manage exams
- ExamForm: Create/edit exam
- QuestionManager: Add/edit/delete questions

## Database Schema

### users
```javascript
{
  id: string (UUID),
  email: string,
  password_hash: string,
  name: string,
  role: string ('admin' | 'student'),
  subscription_status: string ('free' | 'premium'),
  preferred_exam: string | null,
  created_at: ISOString
}
```

### exams
```javascript
{
  id: string (UUID),
  title: string,
  year: number,
  banca: string,
  duration_minutes: number,
  instructions: string,
  areas: string[],
  published: boolean,
  created_by: string (user_id),
  created_at: ISOString
}
```

### questions
```javascript
{
  id: string (UUID),
  exam_id: string,
  statement: string,
  image_url: string | null,
  alternatives: [
    { letter: string, text: string }
  ],
  correct_answer: string ('A'-'E'),
  tags: string[],
  difficulty: string ('easy'|'medium'|'hard'),
  area: string,
  order: number
}
```

### attempts
```javascript
{
  id: string (UUID),
  user_id: string,
  exam_id: string,
  exam_title: string,
  start_time: ISOString,
  end_time: ISOString | null,
  status: string ('in_progress'|'completed'),
  answers: { [question_id]: selected_answer },
  score: {
    total_correct: number,
    total_questions: number,
    percentage: number,
    by_area: {
      [area_name]: {
        correct: number,
        total: number,
        percentage: number
      }
    }
  } | null
}
```

## API Routes

### Public
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Protected (All Users)
- `GET /api/auth/me` - Get current user
- `GET /api/exams` - List published exams
- `GET /api/exams/:id` - Get exam details
- `GET /api/exams/:id/questions` - Get questions (no answers)
- `POST /api/attempts` - Start simulation
- `GET /api/attempts/:id` - Get attempt
- `POST /api/attempts/:id/answer` - Save answer
- `POST /api/attempts/:id/submit` - Submit simulation
- `GET /api/attempts` - Get user's attempts
- `PUT /api/users/subscription` - Upgrade to premium

### Admin Only
- `GET /api/admin/exams` - List all exams
- `POST /api/admin/exams` - Create exam
- `GET /api/admin/exams/:id` - Get exam
- `PUT /api/admin/exams/:id` - Update exam
- `DELETE /api/admin/exams/:id` - Delete exam
- `POST /api/admin/exams/:id/publish` - Publish exam
- `POST /api/admin/exams/:id/unpublish` - Unpublish exam
- `GET /api/admin/exams/:id/questions` - Get all questions
- `POST /api/admin/questions` - Create question
- `PUT /api/admin/questions/:id` - Update question
- `DELETE /api/admin/questions/:id` - Delete question

## Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=provanota_db
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=your-secret-key
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Motor** - Async MongoDB driver
- **Pydantic** - Data validation
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Uvicorn** - ASGI server

### Frontend
- **React 19** - UI library
- **React Router v7** - Routing
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Sonner** - Toast notifications

### Database
- **MongoDB** - NoSQL database
- **MongoDB Atlas** - Cloud hosting (free tier)

### Hosting (Free Tier)
- **Render** - Backend API
- **Vercel** - Frontend
- **MongoDB Atlas** - Database

## Development Workflow

1. **Local Setup**
   ```bash
   ./setup.sh  # or setup.bat on Windows
   ```

2. **Start Backend**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn server:app --reload
   ```

3. **Start Frontend**
   ```bash
   cd frontend
   yarn start
   ```

4. **Seed Database**
   ```bash
   cd backend
   python seed_data.py
   ```

## Deployment Workflow

1. **Setup MongoDB Atlas**
   - Create free cluster
   - Get connection string

2. **Deploy Backend to Render**
   - Connect GitHub
   - Set environment variables
   - Deploy

3. **Seed Production Database**
   ```bash
   export MONGO_URL="mongodb+srv://..."
   python seed_data.py
   ```

4. **Deploy Frontend to Vercel**
   - Connect GitHub
   - Set REACT_APP_BACKEND_URL
   - Deploy

5. **Update CORS**
   - Add Vercel URL to Render CORS_ORIGINS

## Testing

### Manual Testing
- Auth flow (register, login, logout)
- Student flow (browse, simulate, results)
- Admin flow (create exam, add questions)
- Premium upgrade flow

### API Testing
```bash
# Test health
curl https://your-api.onrender.com/api/

# Test login
curl -X POST https://your-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"estudante@provanota.com","password":"estudante123"}'
```

## Monitoring

### Render
- Check logs in dashboard
- Monitor response times
- Watch for cold starts

### Vercel
- Check deployment logs
- Monitor build times
- View analytics (optional)

### MongoDB Atlas
- Check storage usage
- Monitor query performance
- Set up alerts

## Troubleshooting

See README.md "Troubleshooting" section for common issues and solutions.

## Future Enhancements

Phase 2 (planned):
- AI essay grading with ENEM rubric
- PDF/JSON exam import
- Advanced analytics
- Question bank search
- Gamification (badges, leaderboard)
- Stripe integration for real payments
- Email notifications
- Mobile app (React Native)

## License

MIT
