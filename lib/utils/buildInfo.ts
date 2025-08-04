/**
 * Utility pro získání build informací aplikace
 * Kompatibilní s Vercel a lokálním vývojem
 */

export interface BuildInfo {
  appName: string;
  version: string;
  buildDate: string;
  buildNumber: string;
  commitHash: string;
  commitDate: string;
  author: string;
  authorLink: string;
  githubLink: string;
  license: string;
  copyright: string;
  vercelEnv?: string;
  vercelUrl?: string;
  vercelCommitSha?: string;
  vercelCommitMessage?: string;
}

export function getBuildInfo(): BuildInfo {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'Scope Burndown',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString(),
    buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER || Date.now().toString(),
    commitHash: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_COMMIT_HASH || 'unknown',
    commitDate: process.env.NEXT_PUBLIC_COMMIT_DATE || new Date().toISOString().split('T')[0],
    author: process.env.NEXT_PUBLIC_AUTHOR || 'Scope Burndown Team',
    authorLink: process.env.NEXT_PUBLIC_AUTHOR_LINK || 'https://instagram.com/memousek',
    githubLink: process.env.NEXT_PUBLIC_GITHUB_LINK || 'https://github.com/scope-burndown',
    license: process.env.NEXT_PUBLIC_LICENSE || 'MIT',
    copyright: process.env.NEXT_PUBLIC_COPYRIGHT || 'Scope Burndown Team',
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
    vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
    vercelCommitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    vercelCommitMessage: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE,
  };
}

export function formatBuildDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return new Date().toLocaleDateString('cs-CZ');
  }
}

export function isVercel(): boolean {
  return process.env.VERCEL === '1';
} 