import os
from app.core.config import settings

class ProductionConfig:
    """Production-specific configuration for Render deployment"""
    
    # Database configuration for production
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///blog_automation.db")
    
    # CORS settings for production
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    CORS_ORIGINS = [
        FRONTEND_URL,  # Production frontend URL from environment
        "http://localhost:3000",  # For local development
        "http://localhost:5173",  # For local development (Vite)
        "http://localhost:5174",  # For local development (Vite alt port)
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://127.0.0.1:5173",  # Alternative localhost (Vite)
    ]
    
    # Security settings
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE = 60
    
    # Logging
    LOG_LEVEL = "INFO"
    
    # OpenAI
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # Environment
    ENVIRONMENT = "production"
    
    # Health check endpoint
    HEALTH_CHECK_PATH = "/health"
    
    # API documentation
    API_DOCS_URL = "/docs"
    API_REDOC_URL = "/redoc"
