import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlog, getBlogProgress, resumeBlogPipeline, pauseBlogPipeline, generateTopics, selectTopic, getBlogProcessStatus, updateBlogContent } from '../services/api';
import { BlogStatus } from '../types/blog';
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
  Pause,
  Play
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

      // Create a professional HTML document with styling
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${filename}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #2c3e50;
              border-bottom: 3px solid #3498db;
              padding-bottom: 10px;
              margin-bottom: 30px;
            }
            h2 {
              color: #34495e;
              border-bottom: 2px solid #ecf0f1;
              padding-bottom: 8px;
              margin-top: 30px;
            }
            h3 {
              color: #7f8c8d;
              margin-top: 25px;
            }
            p {
              margin-bottom: 15px;
              text-align: justify;
            }
            ul, ol {
              margin-bottom: 15px;
              padding-left: 20px;
            }
            li {
              margin-bottom: 5px;
            }
            code {
              background-color: #f8f9fa;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              border: 1px solid #e9ecec;
            }
            .header-info {
              background-color: #ecf0f1;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 30px;
              text-align: center;
              color: #7f8c8d;
            }
            @media print {
              body { background-color: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header-info">
              <strong>Generated on:</strong> ${new Date().toLocaleDateString()}
            </div>
            ${htmlContent}
          </div>
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
      console.error('Error downloading as HTML:', error);
      alert('Error downloading document. Please try again.');
    }
  };

  const downloadAsWordDocx = async (content: string, filename: string) => {
    try {
      // Create a proper RTF (Rich Text Format) file that Word can open directly
      // This approach ensures compatibility and maintains formatting
      
      // Convert markdown to RTF format with better styling
      let rtfContent = content
        .replace(/^# (.*$)/gim, '\n\n\\b\\fs28\\cf2 $1\\cf1\\fs22\\b0\n') // Main headers - bold, larger, blue
        .replace(/^## (.*$)/gim, '\n\n\\b\\fs24\\cf2 $1\\cf1\\fs22\\b0\n') // Sub headers - bold, medium, blue
        .replace(/^### (.*$)/gim, '\n\n\\b\\fs20\\cf3 $1\\cf1\\b0\n') // Sub-sub headers - bold, gray
        .replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0') // Bold text
        .replace(/\*(.*?)\*/g, '\\i $1\\i0') // Italic text
        .replace(/`(.*?)`/g, '\\f1\\fs18 $1\\f0\\fs22') // Code - monospace font, smaller
        .replace(/^\d+\.\s*/gim, '\\bullet ') // Numbered lists to bullet points
        .replace(/^-\s*/gim, '\\bullet '); // Dash lists to bullet points

      // Create RTF document with enhanced formatting and colors
      const rtfDocument = `{\\rtf1\\ansi\\deff0
{\\fonttbl {\\f0 Calibri;}{\\f1 Courier New;}}
{\\colortbl ;\\red0\\green0\\blue0;\\red44\\green62\\blue80;\\red127\\green140\\blue141;\\red52\\green152\\blue219;}
\\f0\\fs28\\b\\cf2 ${filename}\\cf1\\b0\\par
\\par
\\fs18\\cf4 Generated on: ${new Date().toLocaleDateString()}\\cf1\\par
\\par
\\fs22
${rtfContent.replace(/\n/g, '\\par ')}
}`;

      // Download as RTF file
      const blob = new Blob([rtfDocument], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.rtf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading as RTF:', error);
      // Fallback to text file if RTF generation fails
      try {
        let plainText = content
          .replace(/^# (.*$)/gim, '\n\n$1\n')
          .replace(/^## (.*$)/gim, '\n\n$1\n')
          .replace(/^### (.*$)/gim, '\n\n$1\n')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/^\d+\.\s*/gim, '• ')
          .replace(/^-\s*/gim, '• ');

        const docContent = `${filename}\n\nGenerated on: ${new Date().toLocaleDateString()}\n\n${plainText}`;
        const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (fallbackError) {
        alert('Error downloading document. Please try again.');
      }
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
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 30;
      const maxWidth = pageWidth - 2 * margin;

             // Helper function to wrap text properly with better word breaking
       const wrapText = (text: string, maxWidth: number) => {
         const words = text.split(' ');
         const lines: string[] = [];
         let currentLine = '';

         for (const word of words) {
           const testLine = currentLine + word + ' ';
           const testWidth = doc.getTextWidth(testLine);
           
           if (testWidth > maxWidth && currentLine !== '') {
             // Don't break on single characters or very short words
             if (currentLine.trim().length < 3 && lines.length > 0) {
               // Move the last word to the previous line if possible
               const lastLine = lines[lines.length - 1];
               const combinedLine = lastLine + ' ' + currentLine.trim();
               if (doc.getTextWidth(combinedLine) <= maxWidth) {
                 lines[lines.length - 1] = combinedLine;
                 currentLine = word + ' ';
                 continue;
               }
             }
             lines.push(currentLine.trim());
             currentLine = word + ' ';
           } else {
             currentLine = testLine;
           }
         }
         
         if (currentLine.trim()) {
           lines.push(currentLine.trim());
         }
         
         return lines;
       };

                    // Helper function to add text with proper wrapping and justification
        const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, isBold: boolean = false) => {
          doc.setFontSize(fontSize);
          if (isBold) {
            doc.setFont(undefined, 'bold');
          } else {
            doc.setFont(undefined, 'normal');
          }
          
          const lines = wrapText(text, maxWidth);
          let currentY = y;
          
          for (const line of lines) {
            // Always left-align text to maintain consistent margins
            doc.text(line, x, currentY);
            currentY += fontSize * 0.4; // Increased line height for better readability within paragraphs/headings
          }
          
          return currentY - y + fontSize * 0.15; // Return height used
        };

             // Convert markdown to structured content for PDF
       // First, convert markdown to plain text with proper formatting
       let formattedContent = content
         .replace(/^# (.*$)/gim, '\n\n$1\n') // Main headers
         .replace(/^## (.*$)/gim, '\n\n$1\n') // Sub headers  
         .replace(/^### (.*$)/gim, '\n\n$1\n') // Sub-sub headers
         .replace(/\*\*(.*?)\*\*/g, '$1') // Bold text
         .replace(/\*(.*?)\*/g, '$1') // Italic text
         .replace(/`(.*?)`/g, '$1') // Code
         .replace(/^\d+\.\s*/gim, '• ') // Numbered lists to bullet points
         .replace(/^-\s*/gim, '• '); // Dash lists to bullet points
       
       const sections = formattedContent.split('\n\n');
       let y = margin;

                    // Add header with title - styled like HTML
        const titleLines = wrapText(filename, maxWidth);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(44, 62, 80); // Dark blue color like HTML h1
        
        // Add a border line under the title like HTML
        doc.setDrawColor(52, 152, 219); // Blue border color
        doc.setLineWidth(3);
        
        // Left-align the title to match content margins
        for (const titleLine of titleLines) {
          // Always wrap the title to ensure it fits within content margins
          const wrappedTitleLines = wrapText(titleLine, maxWidth);
          for (const wrappedLine of wrappedTitleLines) {
            doc.text(wrappedLine, margin, y);
            y += 8; // Reduced spacing between title lines
          }
        }
        
        // Draw border line under title
        y += 4;
        doc.line(margin, y, margin + maxWidth, y);
        y += 8; // Reduced spacing after title

        // Add date in styled box like HTML
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.setFillColor(236, 240, 241); // Light gray background like HTML
        doc.setDrawColor(233, 236, 239); // Border color
        
        const dateText = `Generated on: ${new Date().toLocaleDateString()}`;
        const dateWidth = doc.getTextWidth(dateText);
        const dateBoxWidth = dateWidth + 20;
        const dateBoxX = margin + (maxWidth - dateBoxWidth) / 2;
        
        // Draw background box
        doc.rect(dateBoxX, y - 5, dateBoxWidth, 15, 'F');
        doc.rect(dateBoxX, y - 5, dateBoxWidth, 15, 'D');
        
        // Center the date text in the box
        doc.text(dateText, dateBoxX + 10, y + 3);
        y += 20; // Spacing after date box

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Process each section
      for (const section of sections) {
        if (!section.trim()) continue;

        const lines = section.split('\n');
        let isHeader = false;

                 for (const line of lines) {
           if (!line.trim()) {
             y += 4;
             continue;
           }

           // Since we've already converted markdown, we can detect headers by their formatting
           // Headers are now just plain text without markdown symbols
           if (line.trim().length > 0 && !line.startsWith('•') && !line.startsWith('Generated on:')) {
             // Check if this looks like a header (longer text, could be a title)
             const trimmedLine = line.trim();
             
                           // If it's a main section title (like the first line after title)
                             if (trimmedLine.length > 30 && !trimmedLine.includes('.') && !trimmedLine.includes('•')) {
                 isHeader = true;
                 // Style like HTML h1 (no border)
                 const heightUsed = addWrappedText(trimmedLine, margin, y, maxWidth, 16, true);
                 y += heightUsed + 0.5; // Much smaller spacing after main headers
                 continue;
               } 
                             // If it's a shorter line that could be a sub-header
               else if (trimmedLine.length > 15 && trimmedLine.length <= 30 && !trimmedLine.includes('.') && !trimmedLine.includes('•')) {
                 isHeader = true;
                 // Style like HTML h2 (no border)
                 const heightUsed = addWrappedText(trimmedLine, margin, y, maxWidth, 14, true);
                 y += heightUsed + 0.3; // Much smaller spacing after sub headers
                 continue;
               }
           }

                         // Handle bullet points (already converted from markdown)
             if (line.startsWith('• ')) {
               const listText = line.substring(2);
               doc.setFontSize(11);
               doc.setFont(undefined, 'normal');
               // Ensure consistent indentation for list items
               const bulletText = `• ${listText}`;
               const bulletWidth = doc.getTextWidth(bulletText);
               if (bulletWidth > maxWidth) {
                 // If bullet text is too long, wrap it properly
                 const heightUsed = addWrappedText(listText, margin + 8, y, maxWidth - 8, 11, false);
                 y += heightUsed + 1.5; // Much smaller spacing for list items
               } else {
                 doc.text(bulletText, margin + 5, y);
                 y += 1.5; // Much smaller spacing for list items
               }
             } else {
               // Regular paragraph text
               const heightUsed = addWrappedText(line, margin, y, maxWidth, 11, false);
               y += heightUsed + 0.5; // Much smaller spacing between paragraphs
             }

          // Check if we need a new page
          if (y > pageHeight - margin - 30) {
            doc.addPage();
            y = margin;
          }

          isHeader = false;
        }

                                   // Add space between sections
          y += 1; // Much smaller spacing between sections
      }

      // Add footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
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
      } else if (['content_planning', 'drafting', 'editing', 'seo_optimization'].includes(blog.status)) {
        // Pipeline is actively running, hide resume button
        setIsPipelineRunning(true);
      }
    }
  }, [blog]);



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
      return updateBlogContent(blogId, content);
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
      'drafting',
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
      case 'drafting':
        return 'Drafting blog content...';
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
      { key: 'drafting', label: 'Drafting', icon: FileText },
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
                  (['content_planning', 'drafting', 'editing', 'seo_optimization'].includes(blog.status) && !processStatus?.is_pipeline_active)) && (
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
                         onClick={() => startEditing(blog.blog_seo || '')}
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
                        onClick={() => downloadAsMarkdown(blog.blog_seo || '', blog.title || 'blog')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        title="Download as Markdown file"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Markdown
                      </button>
                      <button 
                        onClick={() => downloadAsPDF(blog.blog_seo || '', blog.title || 'blog')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        title="Download as professional PDF"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </button>
                                             <button 
                         onClick={() => downloadAsWordDocx(blog.blog_seo || '', blog.title || 'blog')}
                         className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                         title="Download as styled Rich Text Format (.rtf) - opens directly in Word with HTML-like formatting"
                       >
                         <Download className="h-4 w-4 mr-1" />
                         Word (Styled RTF)
                       </button>
                      <button 
                        onClick={() => downloadAsDocx(blog.blog_seo || '', blog.title || 'blog')}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        title="Download as styled HTML document"
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
                          __html: convertMarkdownToHTML(blog.blog_seo || '')
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
