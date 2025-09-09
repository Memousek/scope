import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { baseUrl, email, apiToken, jql, maxResults = 100 } = body;

    if (!baseUrl || !email || !apiToken || !jql) {
      return NextResponse.json(
        { error: 'Missing required parameters (baseUrl, email, apiToken, jql).' },
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
    
    const searchUrl = `${baseUrl}/rest/api/3/search`;
    console.log('Proxying JIRA issues search request to:', searchUrl);
    console.log('JQL:', jql);
    console.log('Max results:', maxResults);

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql,
        maxResults,
        fields: [
          'id', 'key', 'summary', 'project', 'issuetype', 'status', 
          'assignee', 'reporter', 'created', 'updated'
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('JIRA issues API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return NextResponse.json(
        { error: `JIRA issues API error: ${response.status} ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.issues?.length || 0} issues`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('JIRA issues proxy error:', error);
    return NextResponse.json(
      { error: `Failed to fetch JIRA issues via proxy: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
