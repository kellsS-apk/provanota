# ProvaNota Backend

FastAPI backend for ProvaNota platform.

## Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run development server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## Deploy to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Set root directory: `backend`
5. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Add environment variables from `.env.example`
7. Deploy!

## Seed Database

```bash
python seed_data.py
```