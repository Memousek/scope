import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { baseUrl, email, apiToken, jql, from, to } = body;

    if (!baseUrl || !email || !apiToken || !jql || !from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters (baseUrl, email, apiToken, jql, from, to).' },
        { status: 400 }
      );
    }

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: `Invalid JIRA base URL: ${baseUrl}. Must start with http:// or https://` },
        { status: 400 }
      );
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    // First, search for issues using JQL
    const searchUrl = `${baseUrl}/rest/api/3/search`;

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        jql, 
        maxResults: 500, 
        fields: ['key', 'project'] 
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text().catch(() => 'Unknown error');
      console.error('JIRA search API error response:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        body: errorText
      });
      return NextResponse.json(
        { error: `JIRA search API error: ${searchResponse.status} ${searchResponse.statusText} - ${errorText}` },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();
    const issues = searchData.issues || [];

    // Now fetch worklogs for each issue
    const allWorklogs = [];
    for (const issue of issues) {
      const projectKey = issue.fields?.project?.key;
      const worklogUrl = `${baseUrl}/rest/api/3/issue/${issue.key}/worklog`;
      
      try {
        const worklogResponse = await fetch(worklogUrl, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });

        if (!worklogResponse.ok) {
          console.warn(`Failed to fetch worklogs for issue ${issue.key}: ${worklogResponse.status}`);
          continue;
        }

        const worklogData = await worklogResponse.json();
        const logs = worklogData.worklogs || [];

        // Process worklogs and filter by date range
        for (const log of logs) {
          const isoDate = log.started?.slice(0, 10);
          if (!isoDate) continue;
          if (isoDate < from || isoDate > to) continue;

          allWorklogs.push({
            date: isoDate,
            authorAccountId: log.author?.accountId || '',
            authorEmail: log.author?.emailAddress,
            issueKey: issue.key,
            projectKey,
            hours: (log.timeSpentSeconds || 0) / 3600,
            comment: log.comment
          });
        }
      } catch (error) {
        console.warn(`Error fetching worklogs for issue ${issue.key}:`, error);
        continue;
      }
    }

    return NextResponse.json(allWorklogs);

  } catch (error) {
    console.error('JIRA worklogs proxy error:', error);
    return NextResponse.json(
      { error: `Failed to fetch JIRA worklogs via proxy: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}