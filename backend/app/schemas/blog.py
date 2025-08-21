from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.blog import BlogStatus

class BlogBase(BaseModel):
    title: Optional[str] = None

class BlogCreate(BlogBase):
    pass

class BlogUpdate(BlogBase):
    status: Optional[BlogStatus] = None
    selected_topic: Optional[str] = None
    content_plan: Optional[str] = None
    blog_draft: Optional[str] = None
    blog_edited: Optional[str] = None
    blog_seo: Optional[str] = None
    error_message: Optional[str] = None

class BlogResponse(BlogBase):
    id: int
    status: BlogStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    generated_topics: Optional[str] = None
    selected_topic: Optional[str] = None
    content_plan: Optional[str] = None
    blog_draft: Optional[str] = None
    blog_edited: Optional[str] = None
    blog_seo: Optional[str] = None
    error_message: Optional[str] = None
    last_activity: Optional[datetime] = None
    process_started_at: Optional[datetime] = None
    step_completion_status: Optional[str] = None
    retry_count: Optional[int] = None
    is_paused: Optional[bool] = None
    is_pipeline_active: Optional[bool] = None

    class Config:
        from_attributes = True

class BlogProgress(BaseModel):
    blog_id: int
    status: BlogStatus
    message: str
    progress_percentage: int
