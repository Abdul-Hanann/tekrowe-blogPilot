import axios from 'axios';
import { Blog, BlogCreate, BlogProgress, Topic } from '../types/blog';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Blog CRUD operations
export const createBlog = async (blog: BlogCreate): Promise<Blog> => {
  const response = await api.post('/api/blogs/create', blog);
  return response.data;
};

export const getBlogs = async (): Promise<Blog[]> => {
  const response = await api.get('/api/blogs');
  return response.data;
};

export const getBlog = async (id: number): Promise<Blog> => {
  const response = await api.get(`/api/blogs/${id}`);
  return response.data;
};

export const deleteBlog = async (id: number): Promise<void> => {
  await api.delete(`/api/blogs/${id}`);
};

// Blog progress and AI operations
export const getBlogProgress = async (id: number): Promise<BlogProgress> => {
  const response = await api.get(`/api/blogs/${id}/progress`);
  return response.data;
};

export const generateTopics = async (blogId: number): Promise<{ topics: Topic[] }> => {
  const response = await api.post(`/api/blogs/${blogId}/topics`);
  return response.data;
};

export const selectTopic = async (blogId: number, topicSelection: number): Promise<{ message: string }> => {
  const response = await api.post(`/api/blogs/${blogId}/select-topic`, { topic_selection: topicSelection });
  return response.data;
};

export const resumeBlogPipeline = async (blogId: number): Promise<{ message: string }> => {
  const response = await api.post(`/api/blogs/${blogId}/resume`);
  return response.data;
};

export const pauseBlogPipeline = async (blogId: number): Promise<{ message: string }> => {
  const response = await api.post(`/api/blogs/${blogId}/pause`);
  return response.data;
};

export const getBlogResumeStatus = async (blogId: number): Promise<{
  can_resume: boolean;
  reason: string;
  action_needed: string | null;
}> => {
  const response = await api.get(`/api/blogs/${blogId}/resume-status`);
  return response.data;
};

export const getBlogProcessStatus = async (blogId: number): Promise<{
  blog_id: number;
  status: string;
  is_pipeline_active: boolean;
  step_completion: Record<string, boolean>;
  retry_count: number;
  is_paused: boolean;
  last_activity: string | null;
  process_started_at: string | null;
  can_resume: {
    can_resume: boolean;
    reason: string;
    action_needed: string | null;
  };
}> => {
  const response = await api.get(`/api/blogs/${blogId}/process-status`);
  return response.data;
};

// Cleanup blogs that have no topics generated - keeps only records with topics and beyond
export const cleanupAbandonedBlogs = async (): Promise<{
  cleaned_count: number;
  preserved_count: number;
  message: string;
}> => {
  const response = await api.post('/api/blogs/cleanup');
  return response.data;
};

export default api;
