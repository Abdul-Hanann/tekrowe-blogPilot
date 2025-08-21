export interface Blog {
  id: number;
  title: string | null;
  status: BlogStatus;
  created_at: string;
  updated_at: string | null;
  generated_topics: string | null;  // JSON string of generated topics
  selected_topic: string | null;
  content_plan: string | null;
  blog_draft: string | null;
  blog_edited: string | null;
  blog_seo: string | null;
  error_message: string | null;
  
  // Enhanced process tracking fields
  last_activity: string | null;
  process_started_at: string | null;
  step_completion_status: string | null;  // JSON string
  retry_count: number | null;
  is_paused: boolean | null;
  is_pipeline_active: boolean | null;
}

export type BlogStatus = 
  | 'pending'
  | 'topic_generation'
  | 'content_planning'
  | 'writing'
  | 'editing'
  | 'seo_optimization'
  | 'completed'
  | 'failed'
  | 'paused';

export interface BlogCreate {
  title?: string;
}

export interface BlogProgress {
  blog_id: number;
  status: BlogStatus;
  message: string;
  progress_percentage: number;
}

export interface Topic {
  number: number;
  title: string;
  category: string;
  details: string[];
}
