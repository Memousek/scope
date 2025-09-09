/**
 * API route for fetching JIRA users
 * Proxies requests to JIRA API to avoid CORS issues
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl');
    const email = searchParams.get('email');
    const apiToken = searchParams.get('apiToken');

    if (!baseUrl || !email || !apiToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: baseUrl, email, apiToken' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: `Invalid JIRA base URL: ${baseUrl}. Must start with http:// or https://` },
        { status: 400 }
      );
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    // Try endpoint that works with GDPR strict mode
    const usersUrl = `${baseUrl}/rest/api/3/users/search`;

    const response = await fetch(usersUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('JIRA API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return NextResponse.json(
        { error: `JIRA API error: ${response.status} ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }

    const users = await response.json();
    return NextResponse.json(users);

  } catch (error) {
    console.error('JIRA users proxy error:', error);
    return NextResponse.json(
      { error: `Failed to fetch JIRA users: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
