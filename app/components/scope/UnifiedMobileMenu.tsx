/**
 * UnifiedMobileMenu Component
 * 
 * A unified mobile navigation menu that combines:
 * - Main app navigation (Profile, Settings, Admin, Logout)
 * - Scope navigation (Analytics, Team & Projects, Finance, Integration & Settings)
 * 
 * Features:
 * - Single hamburger menu for both navigations
 * - Glass-like design consistent with app theme
 * - Smooth slide-in animation
 * - Touch-friendly interface
 * - Proper accessibility
 */

import React, { useState } from 'react';
import { useTranslation } from '@/lib/translation';
import { useScopeNavigation, TabType } from '@/app/hooks/useScopeNavigation';
// import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiMenu,
  FiX,
  FiUser,
  FiSettings,
  FiShield,
  FiLogOut,
  FiChevronDown,
  FiChevronRight
} from 'react-icons/fi';
import { User } from '@/lib/domain/models/user.model';


interface UnifiedMobileMenuProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  allowedTabs: TabType[];
  user?: User | null;
  onLogout?: () => void;
}


export function UnifiedMobileMenu({ 
  activeTab, 
  onTabChange, 
  allowedTabs, 
  user, 
  onLogout 
}: UnifiedMobileMenuProps) {
  const { t } = useTranslation();
  // const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { categories, expandedCategories, toggleCategory, isTabAllowed } = useScopeNavigation();

  const handleTabClick = (tab: TabType) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button */}
      <div className="lg:hidden fixed top-2 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-xl shadow-2xl text-gray-700 dark:text-gray-300 hover:scale-105 transition-all duration-300"
        >
          {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div className={`
        lg:hidden fixed top-0 left-0 z-50
        w-80 h-full
        bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 
        backdrop-blur-xl border-r border-white/30 dark:border-gray-600/30 
        shadow-2xl 
        overflow-y-auto
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white relative">
              Menu
              <div className="absolute -bottom-2 left-0 w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* User Section */}
          {user && (
            <div className="mb-8 p-4 bg-white/20 dark:bg-gray-700/20 rounded-xl backdrop-blur-sm border border-white/20 dark:border-gray-600/20">
              <div className="flex items-center gap-3 mb-4">
                {user.additional?.avatar_url ? (
                  <Image
                    src={typeof user.additional.avatar_url === "string" ? user.additional.avatar_url : ""}
                    alt={t("user_avatar")}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <FiUser className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {user.additional?.name || user.email}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
              </div>
              
              {/* User Actions */}
              <div className="space-y-2">
                {user.additional?.role === 'god' && (
                  <Link
                    href="/admin"
                    onClick={handleLinkClick}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-600/30 rounded-lg transition-all duration-200"
                  >
                    <FiShield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-600/30 rounded-lg transition-all duration-200"
                >
                  <FiUser className="w-4 h-4" />
                  {t("profile")}
                </Link>
                <Link
                  href="/settings"
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-600/30 rounded-lg transition-all duration-200"
                >
                  <FiSettings className="w-4 h-4" />
                  {t("settings")}
                </Link>
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  >
                    <FiLogOut className="w-4 h-4" />
                    {t("logout")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scope Navigation */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Scope Navigace
            </h3>
            
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
                      <div className="ml-4 space-y-1">
                        {category.tabs.map((tab) => {
                          if (!isTabAllowed(tab.id, allowedTabs)) return null;
                          
                          const isActive = activeTab === tab.id;
                          
                          return (
                            <button
                              key={tab.id}
                              onClick={() => handleTabClick(tab.id)}
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 flex justify-center items-center text-center">&copy; {new Date().getFullYear()} ScopeBurndown Team.</p>
          </div>
        </div>
      </div>
    </>
  );
}
