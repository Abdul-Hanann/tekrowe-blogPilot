import asyncio
import json
from datetime import datetime
from app.services.blog_service import BlogService
from app.agents.topic_generator import generate_trending_topics, parse_topics_from_text, select_topic_by_number
from app.agents.content_planner import generate_content_plan
from app.agents.writer_agent import generate_blog_draft
from app.agents.editor_agent import polish_blog
from app.agents.seo_optimizer_agent import optimise_markdown
from app.models.blog import BlogStatus
from app.schemas.blog import BlogProgress
from typing import List, Dict, Any
import time

class AIPipelineService:
    def __init__(self):
        self.blog_service = BlogService()
        self.topics_cache = {}
        self.active_pipelines = {}  # Track active pipeline tasks

    async def run_pipeline(self, blog_id: int):
        """Run the complete AI pipeline for a blog"""
        try:
            # Mark pipeline as started
            self.blog_service.update_blog(blog_id, {
                'process_started_at': datetime.now(),
                'last_activity': datetime.now(),
                'step_completion_status': json.dumps({
                    'topic_generation': False,
                    'content_planning': False,
                    'writing': False,
                    'editing': False,
                    'seo_optimization': False
                })
            })
            
            # Don't generate topics automatically - wait for user to generate them via frontend
            await self._update_status(blog_id, 'pending', "Blog created successfully! Generate topics to continue.")
            
            # Wait for user to generate topics and select one
            # The pipeline will continue after topic selection
            
        except Exception as e:
            await self._update_status(blog_id, 'failed', f"Pipeline failed: {str(e)}")
            print(f"Pipeline failed for blog {blog_id}: {str(e)}")
            
            # Clean up active pipeline tracking
            if blog_id in self.active_pipelines:
                del self.active_pipelines[blog_id]
            
            # Update database to reflect pipeline is no longer active
            self.blog_service.update_blog(blog_id, {
                'is_pipeline_active': False,
                'last_activity': datetime.now()
            })
            
            raise

    def generate_topics(self) -> List[Dict[str, Any]]:
        """Generate topics for a blog (legacy method)"""
        print(f"generate_topics called - generating new topics")
        topics_text = generate_trending_topics()
        topics = parse_topics_from_text(topics_text)
        print(f"generate_topics returning {len(topics)} topics")
        return topics

    def generate_topics_for_blog(self, blog_id: int) -> List[Dict[str, Any]]:
        """Generate topics for a specific blog and cache them"""
        print(f"generate_topics_for_blog called for blog {blog_id}")
        
        # Generate new topics
        topics_text = generate_trending_topics()
        topics = parse_topics_from_text(topics_text)
        
        # Cache the topics for this specific blog
        self.topics_cache[blog_id] = topics
        
        # Update step completion status
        step_status = self._get_step_completion_status(blog_id)
        step_status['topic_generation'] = True
        
        # Save topics to database
        try:
            topics_json = json.dumps(topics)
            self.blog_service.update_blog(blog_id, {
                'generated_topics': topics_json,
                'status': 'topic_generation',
                'step_completion_status': json.dumps(step_status),
                'last_activity': datetime.now()
            })
            print(f"Saved {len(topics)} topics to database for blog {blog_id}")
        except Exception as e:
            print(f"Error saving topics to database: {str(e)}")
        
        print(f"Generated and cached {len(topics)} topics for blog {blog_id}")
        return topics

    def select_topic(self, blog_id: int, topic_selection: int) -> bool:
        """Select a topic and continue the pipeline"""
        try:
            # Get the blog
            blog = self.blog_service.get_blog(blog_id)
            if not blog:
                return False

            # Get topics from cache or generate new ones
            if blog_id not in self.topics_cache:
                print(f"ERROR: No cached topics found for blog {blog_id}")
                print(f"This should not happen - topics should be generated first via /topics endpoint")
                return False
            else:
                print(f"Using cached topics for blog {blog_id}")
                topics = self.topics_cache[blog_id]
                print(f"Retrieved {len(topics)} cached topics")

            # Debug: Print topics and selection
            print(f"Available topics count: {len(topics)}")
            for i, topic in enumerate(topics):
                print(f"  Topic {i+1}: {topic['title']} (number: {topic['number']})")
            print(f"Topic selection received: {topic_selection}")
            print(f"Topic selection type: {type(topic_selection)}")

            # Select the topic
            selected_topic = select_topic_by_number(topics, topic_selection)
            if not selected_topic:
                print(f"Failed to select topic {topic_selection}")
                return False

            print(f"Selected topic: {selected_topic['title']}")
            print(f"Selected topic details: {selected_topic['details'][:100]}...")

            # Update blog with selected topic and title
            self.blog_service.update_blog(blog_id, {
                'title': selected_topic['title'],
                'selected_topic': f"{selected_topic['title']}\n{selected_topic['details']}",
                'status': 'content_planning',
                'last_activity': datetime.now()
            })

            # Continue pipeline in background
            asyncio.create_task(self._continue_pipeline(blog_id, selected_topic))
            
            return True

        except Exception as e:
            print(f"Error selecting topic: {e}")
            return False

    async def _continue_pipeline(self, blog_id: int, selected_topic: Dict[str, Any]):
        """Continue the AI pipeline after topic selection with enhanced resume functionality"""
        try:
            # Track this pipeline task
            self.active_pipelines[blog_id] = asyncio.current_task()
            
            # Update database to reflect pipeline is now active
            self.blog_service.update_blog(blog_id, {
                'is_paused': False,
                'is_pipeline_active': True,
                'last_activity': datetime.now()
            })
            
            # Get current blog to check what's already been generated
            blog = self.blog_service.get_blog(blog_id)
            if not blog:
                raise Exception("Blog not found")

            # Step 2: Content Planning (skip if already exists)
            if not blog.content_plan:
                await self._update_status(blog_id, 'content_planning', "Creating content plan...")
                content_plan = generate_content_plan(selected_topic['details'])
                self.blog_service.update_blog(blog_id, {
                    'content_plan': content_plan,
                    'status': 'writing',
                    'last_activity': datetime.now()
                })
                self._update_step_completion(blog_id, 'content_planning', True)
                print(f"Generated content plan for blog {blog_id}")
            else:
                print(f"Content plan already exists for blog {blog_id}, skipping...")
                await self._update_status(blog_id, 'writing', "Content plan exists, continuing with writing...")
                self._update_step_completion(blog_id, 'content_planning', True)

            # Step 3: Writing (skip if already exists)
            if not blog.blog_draft:
                await self._update_status(blog_id, 'writing', "Writing blog content...")
                content_plan = blog.content_plan or content_plan
                blog_draft = generate_blog_draft(content_plan)
                self.blog_service.update_blog(blog_id, {
                    'blog_draft': blog_draft,
                    'status': 'editing',
                    'last_activity': datetime.now()
                })
                self._update_step_completion(blog_id, 'writing', True)
                print(f"Generated blog draft for blog {blog_id}")
            else:
                print(f"Blog draft already exists for blog {blog_id}, skipping...")
                await self._update_status(blog_id, 'editing', "Blog draft exists, continuing with editing...")
                self._update_step_completion(blog_id, 'writing', True)

            # Step 4: Editing (skip if already exists)
            if not blog.blog_edited:
                await self._update_status(blog_id, 'editing', "Editing and refining content...")
                blog_draft_content = blog.blog_draft or blog_draft
                edited_blog = polish_blog(blog_draft_content)
                self.blog_service.update_blog(blog_id, {
                    'blog_edited': edited_blog,
                    'status': 'seo_optimization',
                    'last_activity': datetime.now()
                })
                self._update_step_completion(blog_id, 'editing', True)
                print(f"Generated edited blog for blog {blog_id}")
            else:
                print(f"Edited blog already exists for blog {blog_id}, skipping...")
                await self._update_status(blog_id, 'seo_optimization', "Edited blog exists, continuing with SEO optimization...")
                self._update_step_completion(blog_id, 'editing', True)

            # Step 5: SEO Optimization (skip if already exists)
            if not blog.blog_seo:
                await self._update_status(blog_id, 'seo_optimization', "Optimizing for SEO...")
                edited_content = blog.blog_edited or edited_blog
                seo_blog = optimise_markdown(edited_content)
                self.blog_service.update_blog(blog_id, {
                    'blog_seo': seo_blog,
                    'status': 'completed',
                    'last_activity': datetime.now()
                })
                self._update_step_completion(blog_id, 'seo_optimization', True)
                print(f"Generated SEO optimized blog for blog {blog_id}")
            else:
                print(f"SEO optimized blog already exists for blog {blog_id}, skipping...")

            # Pipeline completed
            await self._update_status(blog_id, 'completed', "Blog creation completed!")
            print(f"Pipeline completed successfully for blog {blog_id}")
            
            # Clean up active pipeline tracking
            if blog_id in self.active_pipelines:
                del self.active_pipelines[blog_id]
            
            # Update database to reflect pipeline is no longer active
            self.blog_service.update_blog(blog_id, {
                'is_paused': False,
                'is_pipeline_active': False,
                'last_activity': datetime.now()
            })

        except Exception as e:
            await self._update_status(blog_id, 'failed', f"Pipeline failed: {str(e)}")
            print(f"Pipeline failed for blog {blog_id}: {str(e)}")
            
            # Clean up active pipeline tracking
            if blog_id in self.active_pipelines:
                del self.active_pipelines[blog_id]
            
            raise

    def _update_step_completion(self, blog_id: int, step: str, completed: bool):
        """Update the completion status of a specific step"""
        try:
            blog = self.blog_service.get_blog(blog_id)
            if blog and blog.step_completion_status:
                step_status = json.loads(blog.step_completion_status)
                step_status[step] = completed
                self.blog_service.update_blog(blog_id, {
                    'step_completion_status': json.dumps(step_status)
                })
        except Exception as e:
            print(f"Error updating step completion status: {e}")

    def _get_step_completion_status(self, blog_id: int) -> Dict[str, bool]:
        """Get the current step completion status for a blog"""
        try:
            blog = self.blog_service.get_blog(blog_id)
            if blog and blog.step_completion_status:
                return json.loads(blog.step_completion_status)
        except Exception as e:
            print(f"Error getting step completion status: {e}")
        
        # Return default status if none exists
        return {
            'topic_generation': False,
            'content_planning': False,
            'writing': False,
            'editing': False,
            'seo_optimization': False
        }

    def is_pipeline_active(self, blog_id: int) -> bool:
        """Check if a pipeline is currently running for a blog"""
        # Check database status first (primary source of truth)
        try:
            blog = self.blog_service.get_blog(blog_id)
            if blog:
                # If blog is completed, pipeline is definitely not active
                if blog.status == 'completed':
                    return False
                # Use the database field as the primary source of truth
                if blog.is_pipeline_active is not None:
                    return blog.is_pipeline_active
        except Exception as e:
            print(f"Error checking blog status for pipeline activity: {e}")
        
        # Fallback to in-memory tracking
        return blog_id in self.active_pipelines

    def pause_pipeline(self, blog_id: int) -> bool:
        """Pause a running pipeline"""
        try:
            if blog_id in self.active_pipelines:
                # Cancel the running task
                task = self.active_pipelines[blog_id]
                if not task.done():
                    task.cancel()
                
                # Remove from active pipelines
                del self.active_pipelines[blog_id]
                
                # Update blog status
                self.blog_service.update_blog(blog_id, {
                    'status': 'paused',
                    'is_paused': True,
                    'is_pipeline_active': False,
                    'last_activity': datetime.now()
                })
                return True
            return False
        except Exception as e:
            print(f"Error pausing pipeline: {e}")
            return False

    async def _update_status(self, blog_id: int, status: BlogStatus, message: str):
        """Update blog status with minimal delay for better performance"""
        update_data = {
            'status': status,
            'last_activity': datetime.now()
        }
        
        # If status is completed, ensure pipeline is marked as inactive
        if status == 'completed':
            update_data['is_pipeline_active'] = False
        
        self.blog_service.update_blog(blog_id, update_data)
        # Reduced delay from 2 seconds to 0.5 seconds for better responsiveness
        await asyncio.sleep(0.5)  # Minimal delay for realistic progress

    def get_progress(self, blog: Any) -> BlogProgress:
        """Get the current progress of a blog with enhanced step tracking"""
        try:
            # Get step completion status
            step_status = {}
            if blog.step_completion_status:
                step_status = json.loads(blog.step_completion_status)
            
            # Calculate progress based on completed steps
            total_steps = 5  # topic_generation, content_planning, writing, editing, seo_optimization
            completed_steps = sum(step_status.values())
            progress_percentage = round((completed_steps / total_steps) * 100)
            
            return BlogProgress(
                blog_id=blog.id,
                status=blog.status,
                message=self._get_status_message(blog.status),
                progress_percentage=progress_percentage
            )
        except Exception as e:
            print(f"Error calculating progress: {e}")
            # Fallback to old method
            status_order = [
                'pending',
                'topic_generation',
                'content_planning',
                'writing',
                'editing',
                'seo_optimization',
                'completed'
            ]
            current_index = status_order.index(blog.status)
            progress_percentage = round((current_index / (len(status_order) - 1)) * 100)
            
            return BlogProgress(
                blog_id=blog.id,
                status=blog.status,
                message=self._get_status_message(blog.status),
                progress_percentage=progress_percentage
            )

    def resume_pipeline(self, blog_id: int) -> bool:
        """Resume the pipeline from where it left off for any incomplete blog"""
        try:
            print(f"Attempting to resume pipeline for blog {blog_id}")
            
            # Get the blog
            blog = self.blog_service.get_blog(blog_id)
            if not blog:
                print(f"Blog {blog_id} not found")
                return False

            # Check if pipeline is already running
            if self.is_pipeline_active(blog_id):
                print(f"Pipeline is already running for blog {blog_id}")
                return False

            # Check current status and resume accordingly
            if blog.status == 'pending':
                print(f"Blog {blog_id} is pending - user needs to generate topics first")
                return False
                
            elif blog.status == 'topic_generation':
                print(f"Blog {blog_id} needs topics generated - user should generate topics first")
                return False
                
            elif blog.status == 'failed' or blog.status == 'paused':
                print(f"Resuming {'failed' if blog.status == 'failed' else 'paused'} pipeline for blog {blog_id}")
                
                # Check if blog has a selected topic
                if not blog.selected_topic:
                    print(f"Blog {blog_id} has no selected topic, cannot resume")
                    return False
                
                # Parse the selected topic to get details
                topic_lines = blog.selected_topic.split('\n')
                topic_title = topic_lines[0] if topic_lines else "Unknown Topic"
                topic_details = '\n'.join(topic_lines[1:]) if len(topic_lines) > 1 else ""
                
                selected_topic = {
                    'title': topic_title,
                    'details': topic_details
                }
                
                # Update retry count and reset paused status
                self.blog_service.update_blog(blog_id, {
                    'retry_count': blog.retry_count + 1,
                    'is_paused': False,
                    'is_pipeline_active': True,
                    'last_activity': datetime.now()
                })
                
                # Continue pipeline from where it left off
                asyncio.create_task(self._continue_pipeline(blog_id, selected_topic))
                return True
                
            elif blog.status in ['content_planning', 'writing', 'editing', 'seo_optimization']:
                print(f"Blog {blog_id} is in progress, continuing pipeline")
                
                # Check if blog has a selected topic
                if not blog.selected_topic:
                    print(f"Blog {blog_id} has no selected topic, cannot resume")
                    return False
                
                # Parse the selected topic to get details
                topic_lines = blog.selected_topic.split('\n')
                topic_title = topic_lines[0] if topic_lines else "Unknown Topic"
                topic_details = '\n'.join(topic_lines[1:]) if len(topic_lines) > 1 else ""
                
                selected_topic = {
                    'title': topic_title,
                    'details': topic_details
                }
                
                # Update pipeline status and continue
                self.blog_service.update_blog(blog_id, {
                    'is_pipeline_active': True,
                    'last_activity': datetime.now()
                })
                
                # Continue pipeline from where it left off
                asyncio.create_task(self._continue_pipeline(blog_id, selected_topic))
                return True
                
            else:
                print(f"Blog {blog_id} status '{blog.status}' does not require resuming")
                return False
                
        except Exception as e:
            print(f"Error resuming pipeline for blog {blog_id}: {str(e)}")
            return False

    def can_resume_blog(self, blog_id: int) -> dict:
        """Check if a blog can be resumed and what action is needed"""
        try:
            blog = self.blog_service.get_blog(blog_id)
            if not blog:
                return {"can_resume": False, "reason": "Blog not found", "action_needed": None}
            
            if blog.status == 'completed':
                return {"can_resume": False, "reason": "Blog already completed", "action_needed": None}
            
            if blog.status == 'pending':
                return {
                    "can_resume": False, 
                    "reason": "Topics not generated yet", 
                    "action_needed": "generate_topics"
                }
            
            if blog.status == 'topic_generation':
                return {
                    "can_resume": False, 
                    "reason": "Topics being generated", 
                    "action_needed": "wait_for_topics"
                }
            
            # Check if pipeline is already running
            if self.is_pipeline_active(blog_id):
                return {
                    "can_resume": False,
                    "reason": "Pipeline is already running",
                    "action_needed": "wait_for_completion"
                }
            
            if blog.status == 'failed' and not blog.selected_topic:
                return {
                    "can_resume": False, 
                    "reason": "No topic selected", 
                    "action_needed": "select_topic"
                }
            
            if blog.status in ['content_planning', 'writing', 'editing', 'seo_optimization']:
                if not blog.selected_topic:
                    return {
                        "can_resume": False, 
                        "reason": "No topic selected", 
                        "action_needed": "select_topic"
                    }
                return {
                    "can_resume": True, 
                    "reason": "Can resume pipeline", 
                    "action_needed": "resume_pipeline"
                }
            
            if blog.status == 'failed' and blog.selected_topic:
                return {
                    "can_resume": True, 
                    "reason": "Can resume failed pipeline", 
                    "action_needed": "resume_pipeline"
                }
            
            if blog.status == 'paused':
                return {
                    "can_resume": True,
                    "reason": "Pipeline was paused",
                    "action_needed": "resume_pipeline"
                }
            
            return {"can_resume": False, "reason": "Unknown status", "action_needed": None}
            
        except Exception as e:
            return {"can_resume": False, "reason": f"Error: {str(e)}", "action_needed": None}

    def cleanup_abandoned_blogs(self) -> dict:
        """Clean up blogs that have no topics and are abandoned"""
        try:
            print("Starting cleanup of abandoned blogs...")
            
            # Get all blogs
            all_blogs = self.blog_service.get_all_blogs()
            cleaned_count = 0
            preserved_count = 0
            
            for blog in all_blogs:
                # Only delete blogs that are truly abandoned:
                # - pending status AND no generated topics AND no selected topic
                # - OR failed status with no generated topics and no selected topic
                should_delete = (
                    (blog.status == 'pending' and not blog.generated_topics and not blog.selected_topic) or
                    (blog.status == 'failed' and not blog.generated_topics and not blog.selected_topic)
                )
                
                if should_delete:
                    print(f"Deleting abandoned blog {blog.id} (status: {blog.status}, no topics)")
                    self.blog_service.delete_blog(blog.id)
                    cleaned_count += 1
                else:
                    print(f"Preserving blog {blog.id} (status: {blog.status}, has topics or content)")
                    preserved_count += 1
            
            print(f"Cleanup completed: {cleaned_count} abandoned blogs deleted, {preserved_count} preserved")
            return {
                "cleaned_count": cleaned_count,
                "preserved_count": preserved_count,
                "message": f"Cleaned up {cleaned_count} abandoned blogs"
            }
            
        except Exception as e:
            print(f"Error during cleanup: {str(e)}")
            return {
                "cleaned_count": 0,
                "preserved_count": 0,
                "error": str(e)
            }

    def _get_status_message(self, status: str) -> str:
        """Get a user-friendly message for the current status"""
        messages = {
            'pending': 'Initializing blog creation...',
            'topic_generation': 'Generating trending topics...',
            'content_planning': 'Creating detailed content plan...',
            'writing': 'Writing blog content...',
            'editing': 'Editing and refining content...',
            'seo_optimization': 'Optimizing for SEO...',
            'completed': 'Blog creation completed!',
            'failed': 'Blog creation failed',
            'paused': 'Pipeline was paused'
        }
        return messages.get(status, 'Processing...')
