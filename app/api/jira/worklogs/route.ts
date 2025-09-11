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
        fields: ['key', 'project', 'issuetype', 'parent', 'summary'] 
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

    // Build issue hierarchy map for better subtask handling
    const issueHierarchy = new Map();
    const parentIssues = new Map();
    
    // First pass: build hierarchy
    for (const issue of issues) {
      const issueKey = issue.key;
      const issueType = issue.fields?.issuetype?.name;
      const parent = issue.fields?.parent;
      const projectKey = issue.fields?.project?.key;
      
      issueHierarchy.set(issueKey, {
        key: issueKey,
        type: issueType,
        parent: parent?.key,
        projectKey,
        summary: issue.fields?.summary,
        isSubtask: issueType === 'Sub-task' || issueType === 'Subtask'
      });
      
      // Track parent issues
      if (parent?.key) {
        if (!parentIssues.has(parent.key)) {
          parentIssues.set(parent.key, []);
        }
        parentIssues.get(parent.key).push(issueKey);
      }
    }

    // Now fetch worklogs for each issue
    const allWorklogs = [];
    for (const issue of issues) {
      const projectKey = issue.fields?.project?.key;
      const issueType = issue.fields?.issuetype?.name;
      const parent = issue.fields?.parent;
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

          // Determine the effective project key for subtasks
          let effectiveProjectKey = projectKey;
          let effectiveIssueKey = issue.key;
          let isSubtaskWorklog = false;

          // If this is a subtask, we might want to attribute the work to the parent
          if (issueType === 'Sub-task' || issueType === 'Subtask') {
            isSubtaskWorklog = true;
            // For subtasks, we can either:
            // 1. Keep the subtask key (current behavior)
            // 2. Use parent key (new robust behavior)
            // We'll use parent key if available, otherwise keep subtask key
            if (parent?.key) {
              effectiveIssueKey = parent.key;
              // The project key remains the same as subtasks are in the same project
            }
          }

          allWorklogs.push({
            date: isoDate,
            authorAccountId: log.author?.accountId || '',
            authorEmail: log.author?.emailAddress,
            issueKey: issue.key, // Original issue key
            effectiveIssueKey, // Key to use for project mapping
            projectKey: effectiveProjectKey,
            issueType,
            isSubtask: isSubtaskWorklog,
            parentKey: parent?.key,
            hours: (log.timeSpentSeconds || 0) / 3600,
            comment: log.comment,
            worklogId: log.id,
            // Additional metadata for better tracking
            issueSummary: issue.fields?.summary,
            parentSummary: parent?.fields?.summary
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