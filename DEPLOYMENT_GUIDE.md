# 🚀 Deployment Guide: Render (Backend) + Vercel (Frontend)

## 📋 Prerequisites

- [GitHub](https://github.com) account
- [Render](https://render.com) account (free tier)
- [Vercel](https://vercel.com) account (free tier)
- [OpenAI API Key](https://platform.openai.com/api-keys)

## 🔧 Backend Deployment on Render

### Step 1: Prepare Your Repository
1. Push your code to GitHub
2. Ensure all files are committed and pushed

### Step 2: Deploy on Render
1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**

   **Basic Settings:**
   - **Name**: `tekrowe-blog-automation-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

   **Environment Variables:**
   ```
   PYTHON_VERSION=3.10.0
   DATABASE_URL=sqlite:///blog_automation.db
   OPENAI_API_KEY=your_openai_api_key_here
   ENVIRONMENT=production
   SECRET_KEY=your_secret_key_here
   ```

5. **Click "Create Web Service"**
6. **Wait for deployment to complete**
7. **Copy your service URL** (e.g., `https://your-app.onrender.com`)

### Step 3: Update Frontend Configuration
1. **Update `vercel.json`:**
   - Replace `your-backend-domain.onrender.com` with your actual Render URL
   - Example: `https://tekrowe-blog-backend.onrender.com`

2. **Update `backend/app/core/production_config.py`:**
   - Replace `your-frontend-domain.vercel.app` with your Vercel domain

## 🌐 Frontend Deployment on Vercel

### Step 1: Deploy on Vercel
1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**

   **Build Settings:**
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

   **Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-domain.onrender.com
   ```

5. **Click "Deploy"**
6. **Wait for deployment to complete**
7. **Copy your Vercel domain** (e.g., `https://your-app.vercel.app`)

### Step 2: Update Backend CORS
1. **Go back to Render Dashboard**
2. **Update environment variable:**
   ```
   FRONTEND_URL=https://your-vercel-domain.vercel.app
   ```

## 🔄 Update Configuration Files

### 1. Update `vercel.json`
```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-actual-render-url.onrender.com/api/$1"
    }
  ],
  "env": {
    "VITE_API_URL": "https://your-actual-render-url.onrender.com"
  }
}
```

### 2. Update `backend/app/core/production_config.py`
```python
CORS_ORIGINS = [
    "https://your-actual-vercel-domain.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
]
```

## 🧪 Test Your Deployment

### Backend Health Check
- Visit: `https://your-backend.onrender.com/health`
- Should return: `{"status": "healthy", "service": "AI Blog Automation API"}`

### Frontend
- Visit your Vercel domain
- Try creating a blog
- Check if it connects to your backend

## 📊 Free Tier Limits

### Render (Backend)
- **Monthly Usage**: 750 hours
- **Sleep Mode**: After 15 minutes of inactivity
- **Cold Start**: ~30 seconds after sleep

### Vercel (Frontend)
- **Bandwidth**: 100GB/month
- **Build Time**: 100 minutes/month
- **Serverless Functions**: 100GB-hours/month

## 🚨 Important Notes

1. **Database**: SQLite files are ephemeral on Render - data will be lost on restarts
2. **API Keys**: Never commit API keys to Git
3. **CORS**: Ensure frontend domain is in backend CORS origins
4. **Environment Variables**: Set all required env vars in Render dashboard
5. **Sleep Mode**: First request after inactivity will be slow

## 🔧 Troubleshooting

### Backend Issues
- Check Render logs for errors
- Verify environment variables are set
- Ensure requirements.txt is in the correct location

### Frontend Issues
- Check Vercel build logs
- Verify API URL is correct
- Check browser console for CORS errors

### Connection Issues
- Verify CORS origins match exactly
- Check if backend is awake (not in sleep mode)
- Test backend health endpoint directly

## 🎉 Success!

Once deployed, your blog automation system will be accessible:
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-backend.onrender.com`
- **API Docs**: `https://your-backend.onrender.com/docs`

Happy deploying! 🚀
