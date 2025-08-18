/**
 * Toast Demo Page
 * 
 * Demonstrates all toast variants and features
 * Used for testing and showcasing the toast system
 */

'use client';

import React from 'react';
import { useToastFunctions, copyToClipboard, openExternalLink } from '../components/ui/Toast';
import { FiCopy, FiExternalLink, FiDownload, FiTrash2 } from 'react-icons/fi';

export default function ToastDemoPage() {
  const toast = useToastFunctions();

  const handleTestSuccess = () => {
    toast.success('Success!', 'Operation completed successfully.');
  };

  const handleTestError = () => {
    toast.error('Error!', 'Something went wrong. Please try again.');
  };

  const handleTestWarning = () => {
    toast.warning('Warning!', 'This action might have consequences.');
  };

  const handleTestInfo = () => {
    toast.info('Information', 'Here is some useful information for you.');
  };

  const handleTestDefault = () => {
    toast.default('Default Toast', 'This is a default toast message.');
  };

  const handleTestPersistent = () => {
    toast.info('Persistent Toast', 'This toast will not auto-dismiss.', {
      persistent: true,
      duration: 0
    });
  };

  const handleTestAction = () => {
    toast.info('Action Required', 'Please confirm this action.', {
      action: {
        label: 'Confirm',
        onClick: () => {
          toast.success('Confirmed!', 'Action has been confirmed.');
        },
        icon: <FiDownload className="w-3 h-3" />
      }
    });
  };

  const handleTestLongMessage = () => {
    toast.info(
      'Long Message Toast',
      'This is a very long message that demonstrates how the toast handles longer content. It should wrap properly and maintain good readability across different screen sizes.',
      {
        duration: 8000
      }
    );
  };

  const handleTestCopy = async () => {
    const success = await copyToClipboard('https://example.com');
    if (success) {
      toast.success('Link copied to clipboard!');
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleTestExternalLink = () => {
    toast.info('Opening external website...', undefined, {
      action: {
        label: 'Open',
        onClick: () => {
          openExternalLink('https://example.com');
          toast.success('External link opened!');
        },
        icon: <FiExternalLink className="w-3 h-3" />
      }
    });
  };

  const handleTestMultiple = () => {
    toast.success('First toast', 'This is the first toast.');
    setTimeout(() => toast.error('Second toast', 'This is the second toast.'), 500);
    setTimeout(() => toast.warning('Third toast', 'This is the third toast.'), 1000);
    setTimeout(() => toast.info('Fourth toast', 'This is the fourth toast.'), 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Toast Component Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test all toast variants and features. Toasts will appear in the top-right corner.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Variants */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Basic Variants
          </h2>
          
          <button
            onClick={handleTestSuccess}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Success Toast
          </button>
          
          <button
            onClick={handleTestError}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Error Toast
          </button>
          
          <button
            onClick={handleTestWarning}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Warning Toast
          </button>
          
          <button
            onClick={handleTestInfo}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Info Toast
          </button>
          
          <button
            onClick={handleTestDefault}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Default Toast
          </button>
        </div>

        {/* Advanced Features */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Advanced Features
          </h2>
          
          <button
            onClick={handleTestPersistent}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Persistent Toast
          </button>
          
          <button
            onClick={handleTestAction}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Toast with Action
          </button>
          
          <button
            onClick={handleTestLongMessage}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Long Message Toast
          </button>
          
          <button
            onClick={handleTestMultiple}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Multiple Toasts
          </button>
        </div>

        {/* Utility Functions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Utility Functions
          </h2>
          
          <button
            onClick={handleTestCopy}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <FiCopy className="w-4 h-4" />
            Copy to Clipboard
          </button>
          
          <button
            onClick={handleTestExternalLink}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <FiExternalLink className="w-4 h-4" />
            External Link
          </button>
          
          <button
            onClick={() => toast.error('Custom Duration', 'This toast will show for 10 seconds.', { duration: 10000 })}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Custom Duration (10s)
          </button>
          
          <button
            onClick={() => toast.info('No Close Button', 'This toast cannot be manually closed.', { closable: false })}
            className="w-full bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            No Close Button
          </button>
        </div>
      </div>

      {/* Features List */}
      <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Toast Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <ul className="space-y-2">
            <li>✅ Multiple variants (success, error, warning, info, default)</li>
            <li>✅ Auto-dismiss with configurable duration</li>
            <li>✅ Manual dismiss with close button</li>
            <li>✅ Keyboard navigation (ESC to dismiss)</li>
            <li>✅ Mobile-friendly touch interactions</li>
            <li>✅ Accessibility compliant (ARIA labels)</li>
          </ul>
          <ul className="space-y-2">
            <li>✅ Smooth animations with Framer Motion</li>
            <li>✅ Responsive design</li>
            <li>✅ Toast queue management</li>
            <li>✅ Action buttons with custom icons</li>
            <li>✅ Persistent toasts (no auto-dismiss)</li>
            <li>✅ Utility functions (copy, external links)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
