import React from 'react';
import { AlertCircle, Clock, Zap } from 'lucide-react';

interface TimeoutErrorProps {
  message?: string;
  onRetry?: () => void;
}

export default function TimeoutError({ message, onRetry }: TimeoutErrorProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
      <div className="flex">
        <Clock className="h-5 w-5 text-yellow-400" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Free Tier Timeout Detected
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-2">
              {message || "The request took longer than expected. This is common with free tier services."}
            </p>
            
            <div className="bg-yellow-100 rounded-md p-3 mt-3">
              <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Why This Happens:
              </h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• <strong>Cold starts:</strong> Free tier services sleep after 15 minutes</li>
                <li>• <strong>Limited resources:</strong> Shared CPU and 512MB RAM</li>
                <li>• <strong>Auto-sleep:</strong> Services pause to save resources</li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-md p-3 mt-3">
              <h4 className="font-medium text-blue-800 mb-2">Solutions:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>Wait a moment</strong> and try again (cold start delay)</li>
                <li>• <strong>Upgrade to paid tiers</strong> for dedicated resources</li>
                <li>• <strong>Use during peak hours</strong> when services are more active</li>
              </ul>
            </div>

            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <Clock className="h-4 w-4 mr-2" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
