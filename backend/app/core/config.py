from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "AI Blog Automation"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Database - reads from DATABASE_URL env var, falls back to SQLite for local dev
    # In production (Render), DATABASE_URL will be set to PostgreSQL connection string
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./blog_automation.db")
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
