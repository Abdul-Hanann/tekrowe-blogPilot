# 🔧 Environment Variables Setup Guide

## 📋 Overview

This guide explains how to set up environment variables for both development and production environments.

## 🏠 Local Development Setup

### Step 1: Create Environment Files

#### Frontend Environment File
Create `frontend/.env` with:
```bash
VITE_API_URL=http://localhost:8000
```

#### Backend Environment File  
Create `.env` in the root directory with:
```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=sqlite:///./blog_automation.db

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173

# Security
SECRET_KEY=your-secret-key-here-change-in-production

# Environment
ENVIRONMENT=development
```

### Step 2: How Frontend Picks Up Backend URL

The frontend gets the backend URL through multiple mechanisms:

#### 1. **Environment Variable** (Primary)
```typescript
// In frontend/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

#### 2. **Vite Configuration** (Development Proxy)
```typescript
// In frontend/vite.config.ts
proxy: {
  '/api': {
    target: env.VITE_API_URL || 'http://localhost:8000',
    changeOrigin: true,
  },
}
```

#### 3. **Build Time Definition**
```typescript
// In frontend/vite.config.ts
define: {
  'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
}
```

## 🌐 Production Deployment

### Render (Backend)
Set these environment variables in Render dashboard:

```bash
OPENAI_API_KEY=your_actual_openai_api_key
FRONTEND_URL=https://your-vercel-domain.vercel.app
DATABASE_URL=sqlite:///blog_automation.db
SECRET_KEY=your-secure-secret-key-change-this
ENVIRONMENT=production
```

### Vercel (Frontend)
Set this environment variable in Vercel dashboard:

```bash
VITE_API_URL=https://your-render-backend.onrender.com
```

## 🔄 How It Works

### Development Flow:
1. **Frontend starts** → Reads `frontend/.env` → Gets `VITE_API_URL=http://localhost:8000`
2. **API calls made** → Uses `http://localhost:8000/api/...`
3. **Vite proxy** → Routes `/api/*` to backend server
4. **Backend receives** → Processes request → Returns response

### Production Flow:
1. **Vercel build** → Reads `VITE_API_URL` from environment → Builds with production URL
2. **Frontend deployed** → Makes direct calls to `https://your-backend.onrender.com/api/...`
3. **Render backend** → Allows requests from `FRONTEND_URL` via CORS
4. **Response returned** → Directly to frontend (no proxy)

## 🛠️ Creating Environment Files

### For Windows (PowerShell):
```powershell
# Frontend
cd frontend
echo "VITE_API_URL=http://localhost:8000" > .env

# Backend (root directory)
cd ..
echo "OPENAI_API_KEY=your_key_here" > .env
echo "FRONTEND_URL=http://localhost:5173" >> .env
echo "SECRET_KEY=your_secret_key" >> .env
```

### For Linux/Mac:
```bash
# Frontend
cd frontend
echo "VITE_API_URL=http://localhost:8000" > .env

# Backend (root directory)
cd ..
echo "OPENAI_API_KEY=your_key_here" > .env
echo "FRONTEND_URL=http://localhost:5173" >> .env
echo "SECRET_KEY=your_secret_key" >> .env
```

## 🔍 Troubleshooting

### Frontend Can't Connect to Backend

1. **Check environment variable:**
   ```bash
   # In browser console, you should see:
   🔗 API Base URL: http://localhost:8000
   ```

2. **Check .env file exists:**
   ```bash
   ls frontend/.env  # Should exist
   cat frontend/.env # Should show VITE_API_URL=http://localhost:8000
   ```

3. **Check backend is running:**
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status":"healthy"}
   ```

### CORS Errors in Production

1. **Check Render environment variables:**
   - `FRONTEND_URL` should match your exact Vercel domain
   - Include `https://` prefix

2. **Check Vercel environment variables:**
   - `VITE_API_URL` should match your exact Render domain
   - Include `https://` prefix

### Environment Variables Not Loading

1. **Restart development servers** after changing .env files
2. **Check file names** (`.env` not `env` or `.env.local`)
3. **Check file location** (frontend/.env for frontend vars)
4. **Check variable names** start with `VITE_` for frontend

## 📝 Quick Reference

| Environment | Frontend URL Source | Backend CORS Allow |
|-------------|-------------------|-------------------|
| Development | `frontend/.env` → `VITE_API_URL` | `.env` → `FRONTEND_URL` |
| Production | Vercel Environment Variables | Render Environment Variables |

## ✅ Verification Commands

```bash
# Check if environment files exist
ls .env                    # Backend env
ls frontend/.env          # Frontend env

# Check if variables are loaded (during development)
# In browser console, you should see API URL logged

# Test backend directly
curl http://localhost:8000/health

# Test frontend connection
# Open http://localhost:5173 and check browser network tab
```
