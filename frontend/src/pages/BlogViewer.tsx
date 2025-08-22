import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlog, getBlogProgress, resumeBlogPipeline, pauseBlogPipeline, generateTopics, selectTopic, getBlogProcessStatus } from '../services/api';
import { Blog, BlogStatus } from '../types/blog';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Save,
  X,
  RefreshCw,
  Pause,
  Play,
  Info
} from 'lucide-react';

// Dynamic import for jsPDF to avoid SSR issues
let jsPDF: any = null;
if (typeof window !== 'undefined') {
  import('jspdf').then(module => {
    jsPDF = module.default;
  });
}

export default function BlogViewer() {
  const { id } = useParams<{ id: string }>();
  const blogId = parseInt(id!);
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    selected_topic: false,
    content_plan: false,
    blog_draft: false,
    blog_edited: false,
    blog_seo: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  
  // Enhanced process tracking state
  const [processStatus, setProcessStatus] = useState<{
    is_pipeline_active: boolean;
    step_completion: Record<string, boolean>;
    retry_count: number;
    is_paused: boolean;
    last_activity: string | null;
    process_started_at: string | null;
  } | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const startEditing = (content: string) => {
    setIsEditing(true);
    setOriginalContent(content);
    setEditedContent(content);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedContent('');
    setOriginalContent('');
  };

  const saveEditing = async () => {
    try {
      // Call the API to update the blog content
      await updateBlogMutation.mutateAsync(editedContent);
      
      // Exit edit mode
      setIsEditing(false);
      setEditedContent('');
      setOriginalContent('');
    } catch (error) {
      console.error('Error saving blog:', error);
      alert('Error saving blog. Please try again.');
    }
  };

  const downloadAsMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertMarkdownToHTML = (markdown: string) => {
    return markdown
      // Handle section titles first
      .replace(/<section_title>(.*?)<\/section_title>/g, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">$1</h2>')
      .replace(/<subsection_title>(.*?)<\/subsection_title>/g, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-3">$1</h3>')
      
      // Handle headers (must come before numbered lists)
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-6">$1</h1>')
      
      // Handle numbered lists with bold text (like "1. **Machine Learning Algorithms**")
      .replace(/^(\d+)\.\s*\*\*(.*?)\*\*:\s*(.*)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1. $2</h3><p class="mb-4 leading-relaxed text-gray-700">$3</p>')
      
      // Handle numbered lists without bold text
      .replace(/^(\d+)\.\s*(.*)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1. $2</h3>')
      
      // Handle special title patterns (for topic generation)
      .replace(/^\*\*Title:\*\*\s*["""](.*?)["""]/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-6">$1</h1>')
      .replace(/^\*\*Title:\*\*\s*(.*)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-6">$1</h1>')
      .replace(/^\*\*Summary:\*\*\s*(.*)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Summary</h2><p class="mb-4 leading-relaxed text-gray-700">$1</p>')
      .replace(/^\*\*Suggested Angle:\*\*\s*(.*)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Suggested Angle</h2><p class="mb-4 leading-relaxed text-gray-700">$1</p>')
      .replace(/^\*\*Intended Audience:\*\*\s*(.*)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Intended Audience</h2><p class="mb-4 leading-relaxed text-gray-700">$1</p>')
      
      // Handle inline formatting
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>')
      
      // Handle bullet lists
      .replace(/^-\s*(.*)/gim, '<li class="mb-2 text-gray-700">$1</li>')
      .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc pl-6 mb-4">$1</ul>')
      
      // Handle paragraphs and line breaks - more intelligent approach
      .replace(/\n\n+/g, '</p><p class="mb-4 leading-relaxed text-gray-700">')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p class="mb-4 leading-relaxed text-gray-700">')
      .replace(/$/, '</p>')
      
      // Clean up any empty paragraphs
      .replace(/<p class="mb-4 leading-relaxed text-gray-700"><\/p>/g, '')
      .replace(/<p class="mb-4 leading-relaxed text-gray-700"><br><\/p>/g, '');
  };

  const downloadAsDocx = async (content: string, filename: string) => {
    try {
      // Convert markdown to HTML first
      const htmlContent = convertMarkdownToHTML(content);

      // Create a simple HTML document
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${filename}</title>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading as DOCX:', error);
      alert('Error downloading document. Please try again.');
    }
  };

  const downloadAsPDF = async (content: string, filename: string) => {
    try {
      if (!jsPDF) {
        alert('PDF generation is loading. Please try again in a moment.');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;

      // Convert markdown to plain text for PDF
      const plainText = content
        .replace(/^### (.*$)/gim, '$1')
        .replace(/^## (.*$)/gim, '$1')
        .replace(/^# (.*$)/gim, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1');

      // Split content into lines
      const lines = plainText.split('\n');
      let y = 20;

      doc.setFontSize(16);
      doc.text(filename, margin, y);
      y += 20;

      doc.setFontSize(12);
      for (const line of lines) {
        if (line.trim()) {
          if (y > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            y = 20;
          }
          
          const words = line.split(' ');
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine + word + ' ';
            const testWidth = doc.getTextWidth(testLine);
            
            if (testWidth > maxWidth) {
              doc.text(currentLine, margin, y);
              y += 7;
              currentLine = word + ' ';
            } else {
              currentLine = testLine;
            }
          }
          
          if (currentLine.trim()) {
            doc.text(currentLine, margin, y);
            y += 7;
          }
        } else {
          y += 5;
        }
      }

      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error downloading as PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const { data: blog, isLoading: blogLoading } = useQuery({
    queryKey: ['blog', blogId],
    queryFn: () => getBlog(blogId),
    refetchInterval: (data) => {
      // Refetch every 5 seconds if blog is not completed
      return data?.status === 'completed' ? false : 5000;
    },
  });

  // Load existing topics if they exist in the database
  React.useEffect(() => {
    if (blog && blog.generated_topics && (blog.status === 'pending' || blog.status === 'topic_generation')) {
      try {
        const parsedTopics = JSON.parse(blog.generated_topics);
        setTopics(parsedTopics);
      } catch (error) {
        // Silently handle parsing errors
      }
    }
    
    // Manage pipeline running state based on blog status
    if (blog) {
      if (blog.status === 'completed' || blog.status === 'failed') {
        setIsPipelineRunning(false);
      } else if (['content_planning', 'writing', 'editing', 'seo_optimization'].includes(blog.status)) {
        // Pipeline is actively running, hide resume button
        setIsPipelineRunning(true);
      }
    }
  }, [blog]);

  const { data: progress } = useQuery({
    queryKey: ['blog-progress', blogId],
    queryFn: () => getBlogProgress(blogId),
    enabled: !!blog && blog.status !== 'completed',
    refetchInterval: 5000,
  });

  // Enhanced process status query with optimized polling
  const { data: detailedProcessStatus } = useQuery({
    queryKey: ['blog-process-status', blogId],
    queryFn: () => getBlogProcessStatus(blogId),
    enabled: !!blog && blog.status !== 'completed',
    refetchInterval: (data) => {
      // Optimize polling based on blog status
      if (!data) return 5000; // Initial load
      
      if (data.is_pipeline_active) {
        return 2000; // Active pipeline: poll every 2 seconds
      } else if (data.status === 'failed' || data.status === 'paused') {
        return 10000; // Failed/paused: poll every 10 seconds
      } else {
        return 5000; // Other states: poll every 5 seconds
      }
    },
  });

  // Update process status when detailed status changes
  useEffect(() => {
    if (detailedProcessStatus) {
      setProcessStatus({
        is_pipeline_active: detailedProcessStatus.is_pipeline_active,
        step_completion: detailedProcessStatus.step_completion,
        retry_count: detailedProcessStatus.retry_count,
        is_paused: detailedProcessStatus.is_paused,
        last_activity: detailedProcessStatus.last_activity,
        process_started_at: detailedProcessStatus.process_started_at,
      });
      
      // Update pipeline running state
      setIsPipelineRunning(detailedProcessStatus.is_pipeline_active);
    }
  }, [detailedProcessStatus]);

  // Update blog content mutation
  const updateBlogMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/blogs/${blogId}/update-content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        throw new Error('Failed to update blog content');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the blog data
      queryClient.invalidateQueries({ queryKey: ['blog', blogId] });
    },
  });

  // Resume blog pipeline mutation
  const resumePipelineMutation = useMutation({
    mutationFn: async () => {
      return resumeBlogPipeline(blogId);
    },
    onSuccess: () => {
      // Invalidate and refetch the blog data
      queryClient.invalidateQueries({ queryKey: ['blog', blogId] });
      queryClient.invalidateQueries({ queryKey: ['blog-progress', blogId] });
      queryClient.invalidateQueries({ queryKey: ['blog-process-status', blogId] });
      // Keep pipeline running state true since the pipeline is now active
    },
    onError: () => {
      // Reset pipeline running state if resume fails
      setIsPipelineRunning(false);
    },
  });

  // Pause blog pipeline mutation
  const pausePipelineMutation = useMutation({
    mutationFn: async () => {
      return pauseBlogPipeline(blogId);
    },
    onSuccess: () => {
      // Invalidate and refetch the blog data
      queryClient.invalidateQueries({ queryKey: ['blog', blogId] });
      queryClient.invalidateQueries({ queryKey: ['blog-progress', blogId] });
      queryClient.invalidateQueries({ queryKey: ['blog-process-status', blogId] });
      setIsPipelineRunning(false);
    },
    onError: () => {
      console.error('Failed to pause pipeline');
    },
  });

  // Generate topics mutation
  const generateTopicsMutation = useMutation({
    mutationFn: () => generateTopics(blogId),
    onSuccess: (data) => {
      setTopics(data.topics);
      setIsGeneratingTopics(false);
    },
    onError: (error) => {
      console.error('Failed to generate topics:', error);
      setIsGeneratingTopics(false);
    },
  });

  // Select topic mutation
  const selectTopicMutation = useMutation({
    mutationFn: (topicSelection: number) => selectTopic(blogId, topicSelection),
    onSuccess: () => {
      // Invalidate and refetch the blog data
      queryClient.invalidateQueries({ queryKey: ['blog', blogId] });
      queryClient.invalidateQueries({ queryKey: ['blog-progress', blogId] });
      setTopics([]);
      setSelectedTopic(null);
    },
    onError: (error) => {
      console.error('Failed to select topic:', error);
    },
  });

  const getStatusIcon = (status: BlogStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: BlogStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getProgressPercentage = (status: BlogStatus) => {
    const statusOrder = [
      'pending',
      'topic_generation',
      'content_planning',
      'writing',
      'editing',
      'seo_optimization',
      'completed'
    ];
    const currentIndex = statusOrder.indexOf(status);
    return Math.round((currentIndex / (statusOrder.length - 1)) * 100);
  };

  const getStatusMessage = (status: BlogStatus) => {
    switch (status) {
      case 'pending':
        return 'Initializing blog creation...';
      case 'topic_generation':
        return 'Generating trending topics...';
      case 'content_planning':
        return 'Creating detailed content plan...';
      case 'writing':
        return 'Writing blog content...';
      case 'editing':
        return 'Editing and refining content...';
      case 'seo_optimization':
        return 'Optimizing for SEO...';
      case 'completed':
        return 'Blog creation completed!';
      case 'failed':
        return 'Blog creation failed';
      case 'paused':
        return 'Pipeline was paused';
      default:
        return 'Processing...';
    }
  };

  // Helper function to render step completion status
  const renderStepCompletionStatus = () => {
    if (!processStatus?.step_completion) return null;
    
    const steps = [
      { key: 'topic_generation', label: 'Topic Generation', icon: FileText },
      { key: 'content_planning', label: 'Content Planning', icon: FileText },
      { key: 'writing', label: 'Writing', icon: FileText },
      { key: 'editing', label: 'Editing', icon: Edit3 },
      { key: 'seo_optimization', label: 'SEO Optimization', icon: CheckCircle }
    ];
    
    return (
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Step Progress:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {steps.map((step) => {
            const isCompleted = processStatus.step_completion[step.key];
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className={`flex items-center p-2 rounded-lg text-xs ${
                  isCompleted
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                <Icon className={`h-3 w-3 mr-1 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="truncate">{step.label}</span>
                {isCompleted && <CheckCircle className="h-3 w-3 ml-1 text-green-600" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (blogLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Blog not found</h3>
        <p className="text-gray-500">The blog you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {blog.title || 'Untitled Blog'}
        </h1>
        <div className="mt-2 flex items-center space-x-4">
          <div className="flex items-center">
            {getStatusIcon(blog.status)}
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(blog.status)}`}>
              {blog.status.replace('_', ' ')}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            Created: {new Date(blog.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Progress Section - Always Visible */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Blog Status & Progress</h2>
        <div className="space-y-4">
          {/* Status and Progress Bar */}
          <div className="flex justify-between text-sm text-gray-600">
            <span>{getStatusMessage(blog.status)}</span>
            <span>{getProgressPercentage(blog.status)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercentage(blog.status)}%` }}
            ></div>
          </div>
          
          {/* Enhanced Step Completion Display */}
          {renderStepCompletionStatus()}
          
          {/* Process Information - Show for all blogs */}
          {processStatus && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Pipeline Status: </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    processStatus.is_pipeline_active 
                      ? 'bg-green-100 text-green-800' 
                      : processStatus.is_paused
                      ? 'bg-yellow-100 text-yellow-800'
                      : blog.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {processStatus.is_pipeline_active ? 'Running' : 
                     processStatus.is_paused ? 'Paused' : 
                     blog.status === 'completed' ? 'Completed' : 'Stopped'}
                  </span>
                </div>
                {processStatus.retry_count > 0 && (
                  <div>
                    <span className="font-medium">Resume Count: </span>
                    <span className="text-blue-600">{processStatus.retry_count}</span>
                  </div>
                )}
                {processStatus.last_activity && (
                  <div>
                    <span className="font-medium">Last Activity: </span>
                    <span>{new Date(processStatus.last_activity).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Completion Information for Completed Blogs */}
          {blog.status === 'completed' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-sm font-medium text-green-800">Blog Generation Completed Successfully!</h3>
                </div>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your AI-generated blog is ready. You can now:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• <strong>Edit</strong> the content using the edit button</li>
                    <li>• <strong>Download</strong> in multiple formats (MD, PDF, HTML)</li>
                    <li>• <strong>Share</strong> or publish the content</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons for Incomplete Blogs */}
          {blog.status !== 'completed' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {blog.status === 'failed' ? (
                    <p>Blog generation failed. You can resume from where it left off.</p>
                  ) : blog.status === 'paused' ? (
                    <p>Pipeline was paused. You can resume when ready.</p>
                  ) : blog.status === 'pending' ? (
                    <p>Blog is pending. Generate topics to continue.</p>
                  ) : blog.status === 'topic_generation' ? (
                    <p>Topics are ready! Select one to continue the blog generation.</p>
                  ) : (
                    <p>Blog generation is in progress. You can pause or resume as needed.</p>
                  )}
                </div>
                
                {/* Show different buttons based on status */}
                {blog.status === 'pending' && (
                  <button
                    onClick={() => {
                      setIsGeneratingTopics(true);
                      generateTopicsMutation.mutate();
                    }}
                    disabled={generateTopicsMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {generateTopicsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Topics
                      </>
                    )}
                  </button>
                )}
                
                {blog.status === 'topic_generation' && (
                  <div className="flex items-center space-x-3">
                    {topics.length === 0 ? (
                      <button
                        onClick={() => {
                          // Load existing topics from the blog
                          if (blog.generated_topics) {
                            try {
                              const parsedTopics = JSON.parse(blog.generated_topics);
                              setTopics(parsedTopics);
                            } catch (error) {
                              console.error('Error parsing generated topics:', error);
                            }
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Load Topics
                      </button>
                    ) : (
                      <div className="text-sm text-green-600">
                        ✓ {topics.length} topics ready for selection
                      </div>
                    )}
                  </div>
                )}
                
                {/* Pause button - only show for running pipelines */}
                {processStatus?.is_pipeline_active && blog.status !== 'pending' && blog.status !== 'topic_generation' && (
                  <button
                    onClick={() => pausePipelineMutation.mutate()}
                    disabled={pausePipelineMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    {pausePipelineMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Pausing...
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Pipeline
                      </>
                    )}
                  </button>
                )}
                
                {/* Resume button - show for failed, paused, or stopped pipelines */}
                {(blog.status === 'failed' || 
                  blog.status === 'paused' || 
                  (['content_planning', 'writing', 'editing', 'seo_optimization'].includes(blog.status) && !processStatus?.is_pipeline_active)) && (
                  <>
                    {resumePipelineMutation.isPending ? (
                      <div className="text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                        Resuming pipeline...
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsPipelineRunning(true);
                          resumePipelineMutation.mutate();
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Resume Pipeline
                      </button>
                    )}
                  </>
                )}
                
                {/* Show running indicator when pipeline is active */}
                {processStatus?.is_pipeline_active && (
                  <div className="text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                    Pipeline is running...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Topic Selection for Blogs with Topics */}
      {((blog.status === 'pending' || blog.status === 'topic_generation') && topics.length > 0) && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Topic</h2>
          <div className="space-y-4">
            <p className="text-gray-600">Choose a topic for your blog:</p>
            
            {topics.map((topic) => (
              <div
                key={topic.number}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedTopic?.number === topic.number
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTopic(topic)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">{topic.title}</h3>
                    <p className="text-sm text-gray-600">{topic.summary}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Audience:</strong> {topic.audience}
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Topic {topic.number}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {selectedTopic && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p>Selected: <strong>{selectedTopic.title}</strong></p>
                  </div>
                  <button
                    onClick={() => selectTopicMutation.mutate(selectedTopic.number)}
                    disabled={selectTopicMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {selectTopicMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Selecting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Selection
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Selected Topic */}
         {blog.selected_topic && (
           <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
             <div className="flex items-center justify-between mb-4">
               <button
                 onClick={() => toggleSection('selected_topic')}
                 className="flex items-center"
               >
                 <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                   <FileText className="h-5 w-5 mr-2" />
                   Selected Topic
                 </h2>
                 {expandedSections.selected_topic ? (
                   <ChevronDown className="h-5 w-5 text-gray-500 ml-2" />
                 ) : (
                   <ChevronRight className="h-5 w-5 text-gray-500 ml-2" />
                 )}
               </button>
             </div>
                           {expandedSections.selected_topic && (
                <div className="mt-4 prose prose-sm max-w-none">
                  <div 
                    className="prose prose-sm max-w-none border rounded-lg p-6 bg-white"
                    dangerouslySetInnerHTML={{ 
                      __html: convertMarkdownToHTML(blog.selected_topic)
                    }}
                  />
                </div>
              )}
           </div>
         )}

                  {/* Content Plan */}
         {blog.content_plan && (
           <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
             <div className="flex items-center justify-between mb-4">
               <button
                 onClick={() => toggleSection('content_plan')}
                 className="flex items-center"
               >
                 <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                   <FileText className="h-5 w-5 mr-2" />
                   Content Plan
                 </h2>
                 {expandedSections.content_plan ? (
                   <ChevronDown className="h-5 w-5 text-gray-500 ml-2" />
                 ) : (
                   <ChevronRight className="h-5 w-5 text-gray-500 ml-2" />
                 )}
               </button>
             </div>
                           {expandedSections.content_plan && (
                <div className="mt-4 prose prose-sm max-w-none">
                  <div 
                    className="prose prose-sm max-w-none border rounded-lg p-6 bg-white"
                    dangerouslySetInnerHTML={{ 
                      __html: convertMarkdownToHTML(blog.content_plan)
                    }}
                  />
                </div>
              )}
           </div>
         )}

         {/* Blog Draft */}
         {blog.blog_draft && (
           <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
             <div className="flex items-center justify-between mb-4">
               <button
                 onClick={() => toggleSection('blog_draft')}
                 className="flex items-center"
               >
                 <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                   <FileText className="h-5 w-5 mr-2" />
                   Blog Draft
                 </h2>
                 {expandedSections.blog_draft ? (
                   <ChevronDown className="h-5 w-5 text-gray-500 ml-2" />
                 ) : (
                   <ChevronRight className="h-5 w-5 text-gray-500 ml-2" />
                 )}
               </button>
             </div>
                           {expandedSections.blog_draft && (
                <div className="mt-4 prose prose-sm max-w-none">
                  <div 
                    className="prose prose-sm max-w-none border rounded-lg p-6 bg-white"
                    dangerouslySetInnerHTML={{ 
                      __html: convertMarkdownToHTML(blog.blog_draft)
                    }}
                  />
                </div>
              )}
           </div>
         )}

         {/* Edited Blog */}
         {blog.blog_edited && (
           <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
             <div className="flex items-center justify-between mb-4">
               <button
                 onClick={() => toggleSection('blog_edited')}
                 className="flex items-center"
               >
                 <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                   <FileText className="h-5 w-5 mr-2" />
                   Edited Blog
                 </h2>
                 {expandedSections.blog_edited ? (
                   <ChevronDown className="h-5 w-5 text-gray-500 ml-2" />
                 ) : (
                   <ChevronRight className="h-5 w-5 text-gray-500 ml-2" />
                 )}
               </button>
             </div>
                           {expandedSections.blog_edited && (
                <div className="mt-4 prose prose-sm max-w-none">
                  <div 
                    className="prose prose-sm max-w-none border rounded-lg p-6 bg-white"
                    dangerouslySetInnerHTML={{ 
                      __html: convertMarkdownToHTML(blog.blog_edited)
                    }}
                  />
                </div>
              )}
           </div>
         )}

         {/* SEO Optimized Blog */}
         {blog.blog_seo && (
           <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
             <div className="flex items-center justify-between mb-4">
               <button
                 onClick={() => toggleSection('blog_seo')}
                 className="flex items-center"
               >
                 <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                   <FileText className="h-5 w-5 mr-2" />
                   Final SEO Optimized Blog
                 </h2>
                 {expandedSections.blog_seo ? (
                   <ChevronDown className="h-5 w-5 text-gray-500 ml-2" />
                 ) : (
                   <ChevronRight className="h-5 w-5 text-gray-500 ml-2" />
                 )}
               </button>
               
               {/* Action Buttons */}
               <div className="flex items-center space-x-2">
                 {blog.status === 'completed' && (
                   <>
                     {!isEditing ? (
                       <button
                         onClick={() => startEditing(blog.blog_seo)}
                         className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                       >
                         <Edit3 className="h-4 w-4 mr-1" />
                         Edit
                       </button>
                     ) : (
                       <>
                         <button
                           onClick={saveEditing}
                           disabled={updateBlogMutation.isPending}
                           className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                         >
                           {updateBlogMutation.isPending ? (
                             <>
                               <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                               Saving...
                             </>
                           ) : (
                             <>
                               <Save className="h-4 w-4 mr-1" />
                               Save
                             </>
                           )}
                         </button>
                         <button
                           onClick={cancelEditing}
                           className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                         >
                           <X className="h-4 w-4 mr-1" />
                           Cancel
                         </button>
                       </>
                     )}
                     
                     <button 
                       onClick={() => downloadAsMarkdown(blog.blog_seo, blog.title || 'blog')}
                       className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                     >
                       <Download className="h-4 w-4 mr-1" />
                       MD
                     </button>
                     <button 
                       onClick={() => downloadAsPDF(blog.blog_seo, blog.title || 'blog')}
                       className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                     >
                       <Download className="h-4 w-4 mr-1" />
                       PDF
                     </button>
                     <button 
                       onClick={() => downloadAsDocx(blog.blog_seo, blog.title || 'blog')}
                       className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                     >
                       <Download className="h-4 w-4 mr-1" />
                       HTML
                     </button>
                   </>
                 )}
               </div>
             </div>
             
                           {expandedSections.blog_seo && (
                <div className="mt-4">
                  {/* HTML Preview - Only show when not editing */}
                  {!isEditing && (
                    <div className="mb-6">
                      <h3 className="text-md font-medium text-gray-900 mb-3">HTML Preview</h3>
                      <div 
                        className="prose prose-sm max-w-none border rounded-lg p-6 bg-white"
                        dangerouslySetInnerHTML={{ 
                          __html: convertMarkdownToHTML(blog.blog_seo)
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Edit Mode Textarea */}
                  {isEditing && (
                    <div className="mb-6">
                      <h3 className="text-md font-medium text-gray-900 mb-3">Edit Content</h3>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Edit your blog content here in markdown format..."
                      />
                    </div>
                  )}
                </div>
              )}
           </div>
         )}

        {/* Error Message */}
        {blog.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 lg:col-span-2">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {blog.error_message}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
