/**
 * JiraService
 * Lehká integrace pro čtení worklogů z Jiry přes REST API v rámci zadaného období.
 * Bez ukládání do DB – vrací normalizovaná data pro `TimesheetEntry`.
 */

export interface JiraWorklogEntry {
  date: string; // ISO YYYY-MM-DD
  authorAccountId: string;
  authorEmail?: string;
  issueKey: string;
  projectKey?: string;
  hours: number;
  comment?: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
  avatarUrls?: {
    '48x48'?: string;
    '24x24'?: string;
    '16x16'?: string;
    '32x32'?: string;
  };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls?: {
    '48x48'?: string;
    '24x24'?: string;
    '16x16'?: string;
    '32x32'?: string;
  };
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  project: JiraProject;
  issuetype: {
    id: string;
    name: string;
    iconUrl?: string;
  };
  status: {
    id: string;
    name: string;
    statusCategory: {
      id: number;
      key: string;
      colorName: string;
    };
  };
  assignee?: JiraUser;
  reporter?: JiraUser;
  created: string;
  updated: string;
}

export class JiraService {
  static buildAuthHeader(email: string, token: string): string {
    if (!email || !token) return '';
    return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
  }

  static baseUrl(): string {
    const url = process.env.NEXT_PUBLIC_JIRA_BASE_URL || process.env.JIRA_BASE_URL || '';
    return url.replace(/\/$/, '');
  }

  static authHeader(): string {
    const email = process.env.JIRA_EMAIL || '';
    const token = process.env.JIRA_API_TOKEN || '';
    return this.buildAuthHeader(email, token);
  }

  /**
   * Načte issues dle JQL a posbírá worklogy v daném intervalu.
   */
  static async fetchWorklogs(jql: string, from: string, to: string): Promise<JiraWorklogEntry[]> {
    const base = JiraService.baseUrl();
    const auth = JiraService.authHeader();
    if (!base || !auth) return [];

    // 1) Vyhledáme issues dle JQL
    const searchUrl = `${base}/rest/api/3/search`;
    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jql, maxResults: 500, fields: ['key', 'project'] })
    });
    if (!searchRes.ok) return [];
    const searchJson = await searchRes.json();
    const issues: Array<{ key: string; fields?: { project?: { key?: string } } }> = searchJson.issues || [];

    const results: JiraWorklogEntry[] = [];
    for (const issue of issues) {
      const projectKey = issue.fields?.project?.key;
      const wlUrl = `${base}/rest/api/3/issue/${issue.key}/worklog`;
      const wlRes = await fetch(wlUrl, { headers: { 'Authorization': auth, 'Accept': 'application/json' } });
      if (!wlRes.ok) continue;
      const wlJson = await wlRes.json();
      const logs: Array<{ started: string; timeSpentSeconds: number; author?: { accountId?: string; emailAddress?: string }; comment?: string }> = wlJson.worklogs || [];
      for (const w of logs) {
        // started např. 2024-08-10T12:00:00.000+0200
        const isoDate = w.started?.slice(0, 10);
        if (!isoDate) continue;
        if (isoDate < from || isoDate > to) continue;
        results.push({
          date: isoDate,
          authorAccountId: w.author?.accountId || '',
          authorEmail: w.author?.emailAddress,
          issueKey: issue.key,
          projectKey,
          hours: (w.timeSpentSeconds || 0) / 3600,
          comment: w.comment
        });
      }
    }
    return results;
  }

  /**
   * Varianta s předanou konfigurací z UI (per-scope settings)
   */
  static async fetchWorklogsWithConfig(
    cfg: { baseUrl?: string; email?: string; apiToken?: string },
    jql: string,
    from: string,
    to: string
  ): Promise<JiraWorklogEntry[]> {
    const base = (cfg.baseUrl || '').replace(/\/$/, '');
    if (!base || !cfg.email || !cfg.apiToken) return [];

    try {
      // Validate URL format
      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        throw new Error(`Invalid JIRA base URL: ${base}. Must start with http:// or https://`);
      }

      // Use our API proxy to avoid CORS issues
      const proxyUrl = new URL('/api/jira/worklogs', window.location.origin);
      
      console.log('Fetching JIRA worklogs via proxy:', proxyUrl.toString());
      console.log('JQL:', jql);
      console.log('Date range:', from, 'to', to);

      const response = await fetch(proxyUrl.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
        body: JSON.stringify({
          baseUrl: base,
          email: cfg.email,
          apiToken: cfg.apiToken,
          jql,
          from,
          to
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Jira worklogs fetch failed: ${response.status} ${response.statusText}`);
      }

      const worklogs: JiraWorklogEntry[] = await response.json();
      return worklogs;
    } catch (error) {
      console.error('Failed to fetch JIRA worklogs:', error);
      console.error('JIRA Config used:', {
        baseUrl: base,
        email: cfg.email,
        hasApiToken: !!cfg.apiToken,
        jql,
        from,
        to
      });
      
      throw error;
    }
  }

  /**
   * Načte všechny uživatele z JIRA
   */
  static async fetchUsers(cfg: { baseUrl?: string; email?: string; apiToken?: string }): Promise<JiraUser[]> {
    const base = (cfg.baseUrl || '').replace(/\/$/, '');
    if (!base || !cfg.email || !cfg.apiToken) return [];

    try {
      // Validate URL format
      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        throw new Error(`Invalid JIRA base URL: ${base}. Must start with http:// or https://`);
      }

      // Use our API proxy to avoid CORS issues
      const proxyUrl = new URL('/api/jira/users', window.location.origin);
      proxyUrl.searchParams.set('baseUrl', base);
      proxyUrl.searchParams.set('email', cfg.email);
      proxyUrl.searchParams.set('apiToken', cfg.apiToken);

      console.log('Fetching JIRA users via proxy:', proxyUrl.toString());
      
      const response = await fetch(proxyUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Jira users fetch failed: ${response.status} ${response.statusText}`);
      }

      const users: JiraUser[] = await response.json();
      return users.filter(user => user.active); // Only active users
    } catch (error) {
      console.error('Failed to fetch JIRA users:', error);
      console.error('JIRA Config used:', {
        baseUrl: base,
        email: cfg.email,
        hasApiToken: !!cfg.apiToken
      });
      
      throw error;
    }
  }

  /**
   * Načte všechny projekty z JIRA
   */
  static async fetchProjects(cfg: { baseUrl?: string; email?: string; apiToken?: string }): Promise<JiraProject[]> {
    const base = (cfg.baseUrl || '').replace(/\/$/, '');
    if (!base || !cfg.email || !cfg.apiToken) return [];

    try {
      // Validate URL format
      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        throw new Error(`Invalid JIRA base URL: ${base}. Must start with http:// or https://`);
      }

      // Use our API proxy to avoid CORS issues
      const proxyUrl = new URL('/api/jira/projects', window.location.origin);
      proxyUrl.searchParams.set('baseUrl', base);
      proxyUrl.searchParams.set('email', cfg.email);
      proxyUrl.searchParams.set('apiToken', cfg.apiToken);

      console.log('Fetching JIRA projects via proxy:', proxyUrl.toString());
      
      const response = await fetch(proxyUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Jira projects fetch failed: ${response.status} ${response.statusText}`);
      }

      const projects: JiraProject[] = await response.json();
      return projects;
    } catch (error) {
      console.error('Failed to fetch JIRA projects:', error);
      console.error('JIRA Config used:', {
        baseUrl: base,
        email: cfg.email,
        hasApiToken: !!cfg.apiToken
      });
      
      throw error;
    }
  }

  /**
   * Načte issues podle JQL s detailními informacemi
   */
  static async fetchIssues(
    cfg: { baseUrl?: string; email?: string; apiToken?: string },
    jql: string,
    maxResults: number = 100
  ): Promise<JiraIssue[]> {
    const base = (cfg.baseUrl || '').replace(/\/$/, '');
    if (!base || !cfg.email || !cfg.apiToken) return [];

    try {
      // Validate URL format
      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        throw new Error(`Invalid JIRA base URL: ${base}. Must start with http:// or https://`);
      }

      // Use our API proxy to avoid CORS issues
      const proxyUrl = new URL('/api/jira/issues', window.location.origin);
      
      console.log('Fetching JIRA issues via proxy:', proxyUrl.toString());
      console.log('JQL:', jql);

      const response = await fetch(proxyUrl.toString(), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          baseUrl: base,
          email: cfg.email,
          apiToken: cfg.apiToken,
          jql,
          maxResults
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Jira issues fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.issues || [];
    } catch (error) {
      console.error('Failed to fetch JIRA issues:', error);
      console.error('JIRA Config used:', {
        baseUrl: base,
        email: cfg.email,
        hasApiToken: !!cfg.apiToken,
        jql,
        maxResults
      });
      return [];
    }
  }

  /**
   * Načte worklogy s rozšířenými informacemi o uživatelích
   */
  static async fetchWorklogsWithUsers(
    cfg: { baseUrl?: string; email?: string; apiToken?: string },
    jql: string,
    from: string,
    to: string
  ): Promise<{ worklogs: JiraWorklogEntry[]; users: JiraUser[]; projects: JiraProject[] }> {
    const base = (cfg.baseUrl || '').replace(/\/$/, '');
    const auth = this.buildAuthHeader(cfg.email || '', cfg.apiToken || '');
    if (!base || !auth) return { worklogs: [], users: [], projects: [] };

    try {
      // Fetch worklogs, users, and projects in parallel
      const [worklogs, users, projects] = await Promise.all([
        this.fetchWorklogsWithConfig(cfg, jql, from, to),
        this.fetchUsers(cfg),
        this.fetchProjects(cfg)
      ]);

      return { worklogs, users, projects };
    } catch (error) {
      console.error('Failed to fetch JIRA data:', error);
      return { worklogs: [], users: [], projects: [] };
    }
  }
}


