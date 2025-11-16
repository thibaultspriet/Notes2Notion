"use client";

import { useState } from 'react';
import { updatePageId } from '../lib/auth';

interface PageIdSetupProps {
  workspaceName: string;
  onComplete: () => void;
}

export default function PageIdSetup({ workspaceName, onComplete }: PageIdSetupProps) {
  const [pageId, setPageId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pageId.trim()) {
      setError('Please enter a Notion page ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await updatePageId(pageId.trim());

      if (success) {
        onComplete();
      } else {
        setError('Failed to configure page ID. Please check the ID and try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Configure Default Page
          </h2>
          <p className="text-gray-600">
            Connected to: <span className="font-semibold">{workspaceName}</span>
          </p>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Please provide the ID of the Notion page where your notes will be created.
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">
              How to find your Notion Page ID:
            </h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Open the target page in Notion</li>
              <li>Click "Share" → "Copy link"</li>
              <li>The Page ID is the last part of the URL</li>
            </ol>
            <div className="mt-3 p-2 bg-white rounded border border-blue-300">
              <p className="text-xs font-mono text-gray-600 break-all">
                https://notion.so/<span className="bg-yellow-200">abc123def456</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                → Page ID: <span className="font-semibold">abc123def456</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Page ID Input */}
          <div className="mb-6">
            <label htmlFor="pageId" className="block text-sm font-medium text-gray-700 mb-2">
              Notion Page ID
            </label>
            <input
              type="text"
              id="pageId"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="abc123def456..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !pageId.trim()}
            className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500 text-center">
          You can change this later in your account settings
        </p>
      </div>
    </div>
  );
}
