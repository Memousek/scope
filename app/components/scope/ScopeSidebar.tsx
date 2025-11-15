/**
 * ScopeSidebar Component
 * 
 * A categorized sidebar navigation for scope management.
 * Groups related functionality into logical categories for better organization.
 * 
 * Features:
 * - Categorized navigation (Analytics, Team & Projects, Finance, Integration & Settings)
 * - Collapsible categories
 * - Active state management
 * - Responsive design
 * - Modern glass-like design
 */

import React, { useState } from 'react';
import { useScopeNavigation, TabType } from '@/app/hooks/useScopeNavigation';
import {
  FiChevronDown,
  FiChevronRight,
  FiMenu,
  FiX
} from 'react-icons/fi';


interface ScopeSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  allowedTabs: TabType[];
}

export function ScopeSidebar({ activeTab, onTabChange, allowedTabs }: ScopeSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { categories, expandedCategories, toggleCategory, isTabAllowed } = useScopeNavigation();

  return (
    <>
      {/* Mobile Hamburger Button */}
      <div className="lg:hidden fixed top-2 right-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-xl shadow-2xl text-gray-700 dark:text-gray-300 hover:scale-105 transition-all duration-300"
        >
          {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-0 left-0 z-50 lg:z-auto
        w-80 lg:w-auto lg:min-w-64 lg:max-w-80
        h-auto
        bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 
        backdrop-blur-xl border border-white/30 dark:border-gray-600/30 
        rounded-none lg:rounded-2xl shadow-2xl 
        overflow-y-auto
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        m-0 lg:m-4 lg:ml-0 lg:mt-6
      `}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 lg:rounded-2xl"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white relative">
              Menu
              <div className="absolute -bottom-2 left-0 w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            </h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        
        <nav className="space-y-3">
          {categories.map((category) => {
            const hasAllowedTabs = category.tabs.some(tab => isTabAllowed(tab.id, allowedTabs));
            if (!hasAllowedTabs) return null;

            const isExpanded = expandedCategories.has(category.id);
            
            return (
              <div key={category.id} className="space-y-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg backdrop-blur-sm border border-white/20 dark:border-gray-600/20"
                >
                  {isExpanded ? (
                    <FiChevronDown className="w-4 h-4 transition-transform duration-200" />
                  ) : (
                    <FiChevronRight className="w-4 h-4 transition-transform duration-200" />
                  )}
                  <span className="text-lg">{category.icon}</span>
                  <span className="flex-1 text-left">{category.label}</span>
                </button>

                {/* Category Tabs */}
                {isExpanded && (
                  <div className="ml-4 lg:ml-8 space-y-1">
                    {category.tabs.map((tab) => {
                      if (!isTabAllowed(tab.id, allowedTabs)) return null;
                      
                      const isActive = activeTab === tab.id;
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => onTabChange(tab.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all duration-300 relative group ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-2xl shadow-blue-500/25 scale-105'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-700/20 hover:text-gray-900 dark:hover:text-white hover:scale-[1.02] hover:shadow-lg backdrop-blur-sm border border-white/10 dark:border-gray-600/10'
                          }`}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          )}
                          <span className="relative z-10 text-base">{tab.icon}</span>
                          <span className="relative z-10 flex-1 text-left font-medium">{tab.label}</span>
                          {isActive && (
                            <div className="relative z-10 w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-4 flex justify-center items-center text-center">&copy; {new Date().getFullYear()} ScopeBurndown Team.</p>
        </div>
      </div>
    </>
  );
}
