from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class BlogStatus(str, enum.Enum):
    PENDING = "pending"
    TOPIC_GENERATION = "topic_generation"
    CONTENT_PLANNING = "content_planning"
    WRITING = "writing"
    EDITING = "editing"
    SEO_OPTIMIZATION = "seo_optimization"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"  # New status for manually paused blogs
    
    def __str__(self):
        return self.value
    
    def __repr__(self):
        return self.value

class Blog(Base):
    __tablename__ = "blogs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=True)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Content fields
    generated_topics = Column(Text, nullable=True)  # JSON string of generated topics
    selected_topic = Column(Text, nullable=True)
    content_plan = Column(Text, nullable=True)
    blog_draft = Column(Text, nullable=True)
    blog_edited = Column(Text, nullable=True)
    blog_seo = Column(Text, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    
    # Enhanced process tracking for better resume functionality
    last_activity = Column(DateTime(timezone=True), nullable=True)  # When the last step was completed
    process_started_at = Column(DateTime(timezone=True), nullable=True)  # When the pipeline started
    step_completion_status = Column(Text, nullable=True)  # JSON string tracking which steps are completed
    retry_count = Column(Integer, default=0)  # Number of times pipeline has been resumed
    is_paused = Column(Boolean, default=False)  # Whether the process is manually paused
    is_pipeline_active = Column(Boolean, default=False)  # Whether the pipeline is currently running
    
    def __repr__(self):
        return f"<Blog(id={self.id}, title='{self.title}', status='{self.status}')>"
