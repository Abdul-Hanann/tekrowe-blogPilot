import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { BookOpen, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createBlog, generateTopics, selectTopic } from '../services/api';
import { BlogCreate, Topic } from '../types/blog';

interface FormData {
  title?: string;
}

export default function BlogCreator() {
  const navigate = useNavigate();
  const [blogId, setBlogId] = useState<number | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  // Create blog mutation
  const createBlogMutation = useMutation({
    mutationFn: createBlog,
    onSuccess: (data) => {
      setBlogId(data.id);
      // Automatically generate topics after blog creation
      handleGenerateTopics(data.id);
    },
    onError: (error) => {
      console.error('Failed to create blog:', error);
    },
  });

  // Generate topics mutation
  const generateTopicsMutation = useMutation({
    mutationFn: generateTopics,
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
    mutationFn: ({ blogId, topicSelection }: { blogId: number; topicSelection: number }) =>
      selectTopic(blogId, topicSelection),
    onSuccess: () => {
      // Navigate to blog viewer to see progress
      navigate(`/blog/${blogId}`);
    },
    onError: (error) => {
      console.error('Failed to select topic:', error);
    },
  });

  const handleGenerateTopics = async (id: number) => {
    setIsGeneratingTopics(true);
    generateTopicsMutation.mutate(id);
  };

  const handleTopicSelection = (topic: Topic) => {
    setSelectedTopic(topic);
  };

  const handleConfirmTopic = () => {
    if (blogId && selectedTopic) {
      selectTopicMutation.mutate({
        blogId,
        topicSelection: selectedTopic.number,
      });
    }
  };

  const onSubmit = (data: FormData) => {
    createBlogMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Blog</h1>
        <p className="mt-2 text-gray-600">
          Use AI to automatically generate a high-quality technical blog post.
        </p>
      </div>

             {/* Step 1: Blog Creation */}
       {!blogId && (
         <div className="bg-white shadow rounded-lg p-6 mb-6">
           <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Create Blog</h2>
           <div className="text-center py-8">
             <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
             <p className="text-gray-600">Ready to create a new AI-generated blog</p>
             <p className="text-sm text-gray-500 mt-2">The blog title will be set from the selected topic</p>
             <button
               onClick={() => onSubmit({})}
               disabled={createBlogMutation.isPending}
               className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
             >
               {createBlogMutation.isPending ? (
                 <>
                   <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                   Creating...
                 </>
               ) : (
                 'Create Blog'
               )}
             </button>
           </div>
         </div>
       )}

      {/* Step 2: Topic Generation */}
      {blogId && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Generate Topics</h2>
          
          {isGeneratingTopics ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-600 mb-4" />
              <p className="text-gray-600">Generating trending topics...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few minutes</p>
            </div>
          ) : topics.length > 0 ? (
            <div className="space-y-4">
              <p className="text-gray-600">Select a topic for your blog:</p>
              
              {topics.map((topic) => (
                <div
                  key={topic.number}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTopic?.number === topic.number
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTopicSelection(topic)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{topic.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Category: {topic.category}
                      </p>
                      <div className="mt-2 text-sm text-gray-700">
                        {topic.details.map((detail, index) => (
                          <p key={index} className="mb-1">{detail}</p>
                        ))}
                      </div>
                    </div>
                    {selectedTopic?.number === topic.number && (
                      <CheckCircle className="h-5 w-5 text-blue-600 ml-2" />
                    )}
                  </div>
                </div>
              ))}

              {selectedTopic && (
                <div className="mt-6">
                  <button
                    onClick={handleConfirmTopic}
                    disabled={selectTopicMutation.isPending}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {selectTopicMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Topic & Start AI Pipeline'
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">Ready to generate topics</p>
              <button
                onClick={() => handleGenerateTopics(blogId)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Generate Topics
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {(createBlogMutation.error || generateTopicsMutation.error || selectTopicMutation.error) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                {createBlogMutation.error?.message ||
                 generateTopicsMutation.error?.message ||
                 selectTopicMutation.error?.message ||
                 'An unexpected error occurred'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
