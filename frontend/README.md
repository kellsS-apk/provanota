# ProvaNota Frontend

React frontend for ProvaNota platform.

## Local Development

```bash
# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Edit .env with backend URL

# Start development server
yarn start
```

## Build for Production

```bash
yarn build
```

## Deploy to Vercel

### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Using Vercel Dashboard

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Configure:
   - Root Directory: `frontend`
   - Framework: Create React App
   - Build Command: `yarn build`
   - Output Directory: `build`
6. Add Environment Variable:
   ```
   REACT_APP_BACKEND_URL=https://your-backend.onrender.com
   ```
7. Deploy!

## Environment Variables

- `REACT_APP_BACKEND_URL` - Backend API URL