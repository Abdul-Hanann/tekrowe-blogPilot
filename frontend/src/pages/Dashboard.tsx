import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Eye, Trash2, Clock, CheckCircle, AlertCircle, BookOpen, RefreshCw, Loader2 } from 'lucide-react';
import { getBlogs, deleteBlog, resumeBlogPipeline, getBlogResumeStatus, cleanupAbandonedBlogs } from '../services/api';
import { Blog } from '../types/blog';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [resumingBlogId, setResumingBlogId] = useState<number | null>(null);
  const { data: blogs, isLoading, refetch } = useQuery({
    queryKey: ['blogs'],
    queryFn: getBlogs,
  });

  // Resume pipeline mutation
  const resumeMutation = useMutation({
    mutationFn: resumeBlogPipeline,
    onSuccess: () => {
      refetch();
    },
  });

  // Auto-cleanup blogs with no topics when dashboard loads (only once per session)
  useEffect(() => {
    const autoCleanup = async () => {
      try {
        // Only cleanup if we have blogs and some might have no topics
        if (blogs && blogs.length > 0) {
          const noTopicsCount = blogs.filter(blog => 
            !blog.generated_topics || !blog.generated_topics.trim()
          ).length;
          
          if (noTopicsCount > 0) {
            console.log(`Found ${noTopicsCount} blogs with no topics generated, running cleanup...`);
            await cleanupAbandonedBlogs();
          }
        }
      } catch (error) {
        console.error('Auto-cleanup failed:', error);
      }
    };
    autoCleanup();
  }, [blogs]);

  const handleResume = async (blogId: number) => {
    try {
      setResumingBlogId(blogId);
      await resumeMutation.mutateAsync(blogId);
    } catch (error) {
      console.error('Failed to resume blog:', error);
      alert('Failed to resume blog. Please check the blog details for more information.');
    } finally {
      setResumingBlogId(null);
    }
  };



  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this blog?')) {
      try {
        await deleteBlog(id);
        refetch();
      } catch (error) {
        console.error('Failed to delete blog:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Blogs</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your AI-generated blog posts and track their creation progress.
          </p>
        </div>
                 <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
           <Link
             to="/create"
             className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
           >
             <Plus className="h-4 w-4 mr-2" />
             Create New Blog
           </Link>
         </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {blogs?.map((blog) => (
                    <tr key={blog.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {blog.title || 'Untitled'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(blog.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(blog.status)}`}>
                            {blog.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(blog.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {blog.updated_at ? new Date(blog.updated_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                                                     {/* Action Buttons for Incomplete Blogs */}
                           {blog.status === 'pending' && (
                             <Link
                               to={`/blog/${blog.id}`}
                               className="text-blue-600 hover:text-blue-900"
                               title="Generate topics for this blog"
                             >
                               <Plus className="h-4 w-4" />
                             </Link>
                           )}
                           
                           {blog.status === 'topic_generation' && (
                             <div className="text-gray-400 cursor-not-allowed" title="Topics being generated">
                               <Clock className="h-4 w-4" />
                             </div>
                           )}
                           
                                                       {/* Resume button - only show for failed blogs or when pipeline is not running */}
                            {(blog.status === 'failed' || 
                              (['content_planning', 'writing', 'editing', 'seo_optimization'].includes(blog.status) && resumingBlogId !== blog.id)) && (
                              <>
                                {resumingBlogId === blog.id ? (
                                  <div className="text-gray-400 cursor-not-allowed" title="Resuming pipeline">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleResume(blog.id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Resume blog generation"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            )}
                            
                            {/* Show running indicator for active pipelines */}
                            {(blog.status === 'content_planning' || blog.status === 'writing' || blog.status === 'editing' || blog.status === 'seo_optimization') && (
                              <div className="text-blue-600" title="Pipeline is running">
                                <Clock className="h-4 w-4" />
                              </div>
                            )}
                          
                          {/* View Button */}
                          <Link
                            to={`/blog/${blog.id}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="View blog details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(blog.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete blog"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {(!blogs || blogs.length === 0) && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No blogs</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first AI-generated blog post.
          </p>
          <div className="mt-6">
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Blog
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
