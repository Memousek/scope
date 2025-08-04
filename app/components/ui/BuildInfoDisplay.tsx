/**
 * Komponent pro zobrazení build informací
 * Automaticky zobrazuje aktuální build informace s možností kopírování
 */
"use client";

import { useState } from 'react';
import { getBuildInfo, formatBuildDate } from '@/lib/utils/buildInfo';
import { useTranslation } from '@/lib/translation';
import { Copy, ExternalLink, Calendar, Hash, User, Github, Check } from 'lucide-react';

interface BuildInfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLink?: boolean;
  href?: string;
}

function BuildInfoItem({ icon, label, value, isLink, href }: BuildInfoItemProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-lg transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="text-gray-500 dark:text-gray-400">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{value}</p>
        </div>
      </div>
      {isLink ? (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600 transition-colors hover:text-gray-900 dark:hover:text-white dark:hover:bg-gray-400 rounded-lg p-1"
        >
          <ExternalLink size={16} />
        </a>
      ) : (
        <button
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-600 transition-colors hover:text-gray-900 dark:hover:text-white dark:hover:bg-gray-400 rounded-lg p-1"
          title={t('copy')}
        >
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
        </button>
      )}
    </div>
  );
}

export function BuildInfoDisplay() {
  const { t } = useTranslation();
  const buildInfo = getBuildInfo();

  return (
    <div className="space-y-3">
      <BuildInfoItem
        icon={<Hash size={16} />}
        label={t('version')}
        value={buildInfo.version}
      />
      <BuildInfoItem
        icon={<Calendar size={16} />}
        label={t('buildDate')}
        value={formatBuildDate(buildInfo.buildDate)}
      />
      <BuildInfoItem
        icon={<Hash size={16} />}
        label={t('buildNumber')}
        value={buildInfo.buildNumber}
      />
      <BuildInfoItem
        icon={<User size={16} />}
        label={t('author')}
        value={buildInfo.author}
        isLink
        href={buildInfo.authorLink}
      />
      <BuildInfoItem
        icon={<Github size={16} />}
        label={t('githubLink')}
        value="GitHub"
        isLink
        href={buildInfo.githubLink}
      />
    </div>
  );
} 