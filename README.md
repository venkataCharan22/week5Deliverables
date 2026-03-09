# BizBuddy AI

[![Presentation](https://img.shields.io/badge/View%20Presentation-Live%20Demo-22c55e?style=for-the-badge)](https://venkatacharan22.github.io/bizbuddy-presentation/)

AI-powered inventory and business management app for small shopkeepers. Mobile-first PWA with OCR, AI chat, and smart analytics.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS (PWA)
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Google OAuth)
- **AI:** Gemini 1.5 Flash, Google Cloud Vision API
- **Realtime:** Supabase Realtime (live inventory updates)

## Project Structure
```
bizbuddy-ai/
├── frontend/          React + Vite + Tailwind + PWA
├── backend/           FastAPI + Python
├── supabase/          SQL schema & migrations
└── docker-compose.yml Local development
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase project (free tier works)
- Google Cloud project with Vision API and Gemini API enabled

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Go to **Authentication > Providers** and enable Google OAuth
4. Copy your project URL and anon key from **Settings > API**

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env        # Fill in Supabase URL + anon key
npm install
npm run dev                  # Starts on http://localhost:5173
```

### 3. Backend Setup
```bash
cd backend
cp .env.example .env        # Fill in Supabase URL + service role key
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload    # Starts on http://localhost:8000
```

### Docker (both services)
```bash
docker compose up --build
```

## Environment Variables

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_API_URL` | Backend API URL (default: http://localhost:8000) |

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON (for Vision API) |
