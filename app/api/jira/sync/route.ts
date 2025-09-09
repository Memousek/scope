/**
 * JIRA Synchronization API Endpoint
 * 
 * Handles manual and automatic synchronization of JIRA data
 */

import { NextRequest, NextResponse } from 'next/server';
import { jiraSyncService } from '../../../services/jiraSyncService';

export async function POST(request: NextRequest) {
  try {
    const { scopeId, action } = await request.json();

    if (!scopeId) {
      return NextResponse.json(
        { error: 'Scope ID je povinný' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'sync':
        // Manual synchronization
        const result = await jiraSyncService.syncScope(scopeId);
        return NextResponse.json(result);

      case 'start-auto-sync':
        // Start automatic synchronization
        jiraSyncService.startAutoSync(scopeId);
        return NextResponse.json({ 
          success: true, 
          message: 'Automatická synchronizace spuštěna' 
        });

      case 'stop-auto-sync':
        // Stop automatic synchronization
        jiraSyncService.stopAutoSync(scopeId);
        return NextResponse.json({ 
          success: true, 
          message: 'Automatická synchronizace zastavena' 
        });

      case 'status':
        // Get sync status
        const status = jiraSyncService.getSyncStatus(scopeId);
        return NextResponse.json(status);

      default:
        return NextResponse.json(
          { error: 'Neplatná akce' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('JIRA sync API error:', error);
    return NextResponse.json(
      { error: 'Chyba při synchronizaci' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scopeId = searchParams.get('scopeId');

    if (!scopeId) {
      return NextResponse.json(
        { error: 'Scope ID je povinný' },
        { status: 400 }
      );
    }

    const status = jiraSyncService.getSyncStatus(scopeId);
    return NextResponse.json(status);

  } catch (error) {
    console.error('JIRA sync status API error:', error);
    return NextResponse.json(
      { error: 'Chyba při načítání stavu synchronizace' },
      { status: 500 }
    );
  }
}
