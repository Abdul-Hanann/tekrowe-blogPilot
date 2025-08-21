from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from app.models.blog import Blog, Base
from app.schemas.blog import BlogCreate, BlogUpdate
from app.core.config import settings
from typing import List, Optional
from contextlib import contextmanager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup with connection pooling and optimizations
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,  # Maximum number of connections
    max_overflow=30,  # Additional connections when pool is full
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,  # Recycle connections every hour
    echo=False,  # Set to True for SQL debugging
    # SQLite specific optimizations
    connect_args={
        "timeout": 30,  # Connection timeout
        "check_same_thread": False,  # Allow multi-threading
    } if "sqlite" in settings.DATABASE_URL else {}
)

# Create tables with optimizations
Base.metadata.create_all(bind=engine)

# Session factory with optimized settings
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent lazy loading issues
)

class BlogService:
    """Optimized blog service with proper session management and caching"""
    
    def __init__(self):
        # Don't create session in constructor - use context manager instead
        pass
    
    @contextmanager
    def get_db_session(self):
        """Context manager for database sessions with automatic cleanup"""
        session = SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            session.close()
    
    def create_blog(self, blog: BlogCreate) -> Blog:
        """Create a new blog with optimized database operations"""
        with self.get_db_session() as session:
            db_blog = Blog(title=blog.title)
            session.add(db_blog)
            session.flush()  # Get ID without committing
            session.refresh(db_blog)
            return db_blog
    
    def get_blog(self, blog_id: int) -> Optional[Blog]:
        """Get a blog by ID with optimized query"""
        with self.get_db_session() as session:
            # Use get() for primary key lookups (faster than filter)
            return session.get(Blog, blog_id)
    
    def get_all_blogs(self) -> List[Blog]:
        """Get all blogs with optimized ordering and pagination"""
        with self.get_db_session() as session:
            # Use limit for large datasets
            return session.query(Blog).order_by(Blog.created_at.desc()).limit(100).all()
    
    def update_blog(self, blog_id: int, update_data: dict) -> Optional[Blog]:
        """Update a blog with optimized bulk update"""
        with self.get_db_session() as session:
            # Use direct SQL update for better performance
            update_fields = []
            params = {}
            
            for field, value in update_data.items():
                if hasattr(Blog, field):
                    update_fields.append(f"{field} = :{field}")
                    params[field] = value
            
            if not update_fields:
                return None
            
            # Add updated_at timestamp
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            
            # Execute optimized update
            stmt = text(f"""
                UPDATE blogs 
                SET {', '.join(update_fields)}
                WHERE id = :blog_id
            """)
            
            params['blog_id'] = blog_id
            result = session.execute(stmt, params)
            
            if result.rowcount > 0:
                # Fetch updated blog
                return session.get(Blog, blog_id)
            return None
    
    def delete_blog(self, blog_id: int) -> bool:
        """Delete a blog with optimized operation"""
        with self.get_db_session() as session:
            # Use get() for primary key lookups
            db_blog = session.get(Blog, blog_id)
            if not db_blog:
                return False
            
            session.delete(db_blog)
            return True
    
    def get_blogs_by_status(self, status: str, limit: int = 50) -> List[Blog]:
        """Get blogs by status with pagination"""
        with self.get_db_session() as session:
            return session.query(Blog).filter(
                Blog.status == status
            ).order_by(Blog.created_at.desc()).limit(limit).all()
    
    def get_recent_blogs(self, limit: int = 10) -> List[Blog]:
        """Get recent blogs with optimized query"""
        with self.get_db_session() as session:
            return session.query(Blog).order_by(
                Blog.created_at.desc()
            ).limit(limit).all()
    
    def search_blogs(self, search_term: str, limit: int = 20) -> List[Blog]:
        """Search blogs with optimized text search"""
        with self.get_db_session() as session:
            search_pattern = f"%{search_term}%"
            return session.query(Blog).filter(
                Blog.title.contains(search_pattern) |
                Blog.content_plan.contains(search_pattern) |
                Blog.blog_draft.contains(search_pattern)
            ).order_by(Blog.created_at.desc()).limit(limit).all()
    
    def get_blog_count(self) -> int:
        """Get total blog count with optimized query"""
        with self.get_db_session() as session:
            return session.query(Blog).count()
    
    def get_blogs_with_pipeline_status(self, limit: int = 50) -> List[dict]:
        """Get blogs with pipeline status for dashboard"""
        with self.get_db_session() as session:
            # Optimized query with only needed fields
            blogs = session.query(
                Blog.id,
                Blog.title,
                Blog.status,
                Blog.created_at,
                Blog.updated_at,
                Blog.last_activity,
                Blog.retry_count,
                Blog.is_paused
            ).order_by(Blog.created_at.desc()).limit(limit).all()
            
            # Convert to dictionaries for JSON serialization
            return [
                {
                    'id': blog.id,
                    'title': blog.title,
                    'status': blog.status,
                    'created_at': blog.created_at.isoformat() if blog.created_at else None,
                    'updated_at': blog.updated_at.isoformat() if blog.updated_at else None,
                    'last_activity': blog.last_activity.isoformat() if blog.last_activity else None,
                    'retry_count': blog.retry_count or 0,
                    'is_paused': blog.is_paused or False
                }
                for blog in blogs
            ]
    
    def cleanup_old_blogs(self, days_old: int = 30) -> int:
        """Clean up old completed blogs"""
        with self.get_db_session() as session:
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days_old)
            
            # Delete old completed blogs
            result = session.query(Blog).filter(
                Blog.status == 'completed',
                Blog.created_at < cutoff_date
            ).delete()
            
            return result
    
    def optimize_database(self):
        """Run database optimization commands"""
        with self.get_db_session() as session:
            if "sqlite" in settings.DATABASE_URL:
                # SQLite specific optimizations
                session.execute(text("PRAGMA optimize"))
                session.execute(text("PRAGMA wal_checkpoint(TRUNCATE)"))
                session.execute(text("VACUUM"))
            else:
                # PostgreSQL/MySQL optimizations
                session.execute(text("VACUUM ANALYZE"))
    
    def __del__(self):
        """Cleanup - no longer needed with context manager"""
        pass
