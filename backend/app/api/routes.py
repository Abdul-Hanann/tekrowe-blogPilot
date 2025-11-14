from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.blog import BlogCreate, BlogResponse, BlogProgress
from app.services.blog_service import BlogService
from app.services.ai_pipeline_service import AIPipelineService
from typing import List

blog_router = APIRouter()
blog_service = BlogService()
ai_pipeline = AIPipelineService()

@blog_router.post("/blogs/create", response_model=BlogResponse)
async def create_blog(blog: BlogCreate, background_tasks: BackgroundTasks):
    """Create a new blog and start the AI pipeline"""
    try:
        # Create blog record
        blog_record = blog_service.create_blog(blog)
        
        # Start AI pipeline in background
        background_tasks.add_task(ai_pipeline.run_pipeline, blog_record.id)
        
        return blog_record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.get("/blogs", response_model=List[BlogResponse])
async def list_blogs():
    """Get all blogs"""
    try:
        return blog_service.get_all_blogs()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.get("/blogs/{blog_id}", response_model=BlogResponse)
async def get_blog(blog_id: int):
    """Get a specific blog by ID"""
    try:
        blog = blog_service.get_blog(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        return blog
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: int):
    """Delete a blog"""
    try:
        success = blog_service.delete_blog(blog_id)
        if not success:
            raise HTTPException(status_code=404, detail="Blog not found")
        return {"message": "Blog deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.get("/blogs/{blog_id}/progress")
async def get_blog_progress(blog_id: int):
    """Get the current progress of a blog creation"""
    try:
        blog = blog_service.get_blog(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        progress = ai_pipeline.get_progress(blog)
        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.post("/blogs/{blog_id}/topics")
async def generate_topics(blog_id: int):
    """Generate topics for a specific blog"""
    try:
        blog = blog_service.get_blog(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        # Generate topics and store them in the pipeline cache for this blog
        topics = ai_pipeline.generate_topics_for_blog(blog_id)
        return {"topics": topics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.post("/blogs/{blog_id}/select-topic")
async def select_topic(blog_id: int, topic_selection: dict, background_tasks: BackgroundTasks):
    """Select a topic for the blog"""
    try:
        blog = blog_service.get_blog(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        topic_num = topic_selection.get("topic_selection")
        if topic_num is None:
            raise HTTPException(status_code=400, detail="topic_selection is required")
        
        success = ai_pipeline.select_topic(blog_id, topic_num, background_tasks)
        if success:
            return {"message": "Topic selected successfully"}
        else:
            raise HTTPException(status_code=400, detail="Invalid topic selection")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.put("/blogs/{blog_id}/update-content")
async def update_blog_content(blog_id: int, content_update: dict):
    """Update the SEO optimized blog content"""
    try:
        blog = blog_service.get_blog(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        # Update the blog content
        success = blog_service.update_blog(blog_id, {
            'blog_seo': content_update.get('content')
        })
        
        if success:
            return {"message": "Blog content updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to update blog content")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.post("/blogs/{blog_id}/resume")
async def resume_blog_pipeline(blog_id: int, background_tasks: BackgroundTasks):
    """Resume the blog generation pipeline from where it left off"""
    try:
        blog = blog_service.get_blog(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        # Check if blog can be resumed
        if blog.status == 'completed':
            raise HTTPException(status_code=400, detail="Blog is already completed")
        
        # Attempt to resume the pipeline
        success = ai_pipeline.resume_pipeline(blog_id, background_tasks)
        
        if success:
            return {"message": "Blog pipeline resumed successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to resume blog pipeline")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.post("/blogs/{blog_id}/pause")
async def pause_blog_pipeline(blog_id: int):
    """Pause a running blog generation pipeline"""
    try:
        blog = blog_service.get_blog(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        # Check if pipeline can be paused
        if blog.status == 'completed':
            raise HTTPException(status_code=400, detail="Blog is already completed")
        
        if blog.status in ['pending', 'topic_generation']:
            raise HTTPException(status_code=400, detail="Cannot pause pipeline at this stage")
        
        # Attempt to pause the pipeline
        success = ai_pipeline.pause_pipeline(blog_id)
        
        if success:
            return {"message": "Blog pipeline paused successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to pause blog pipeline")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.get("/blogs/{blog_id}/resume-status")
async def get_blog_resume_status(blog_id: int):
    """Get the resume status and required action for a blog"""
    try:
        blog = blog_service.get_blog(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        # Get resume status from AI pipeline
        resume_status = ai_pipeline.can_resume_blog(blog_id)
        return resume_status
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.get("/blogs/{blog_id}/process-status")
async def get_blog_process_status(blog_id: int):
    """Get detailed process status including step completion and pipeline state"""
    try:
        blog = blog_service.get_blog(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        
        # Get step completion status
        step_status = {}
        if blog.step_completion_status:
            import json
            step_status = json.loads(blog.step_completion_status)
        
        # Check if pipeline is active
        is_pipeline_active = ai_pipeline.is_pipeline_active(blog_id)
        
        return {
            "blog_id": blog_id,
            "status": blog.status,
            "is_pipeline_active": is_pipeline_active,
            "step_completion": step_status,
            "retry_count": blog.retry_count or 0,
            "is_paused": blog.is_paused or False,
            "last_activity": blog.last_activity,
            "process_started_at": blog.process_started_at,
            "can_resume": ai_pipeline.can_resume_blog(blog_id)
        }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@blog_router.post("/blogs/cleanup")
async def cleanup_abandoned_blogs():
    """Clean up blogs that have no topics generated - keep only records with topics and beyond"""
    try:
        cleanup_result = ai_pipeline.cleanup_abandoned_blogs()
        return cleanup_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
