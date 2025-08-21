from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import blog_router
from app.core.config import settings

app = FastAPI(
    title="AI Blog Automation API",
    description="AI-powered blog creation system with multiple specialized agents",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(blog_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "AI Blog Automation API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
