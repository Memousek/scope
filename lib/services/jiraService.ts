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
    const auth = this.buildAuthHeader(cfg.email || '', cfg.apiToken || '');
    if (!base || !auth) return [];

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
    if (!searchRes.ok) throw new Error(`Jira search failed: ${searchRes.status} ${searchRes.statusText}`);
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
}


