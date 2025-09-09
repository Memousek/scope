/**
 * JIRA Synchronization Cron Job
 * 
 * Runs automatically at midnight to sync JIRA data for all scopes
 * with JIRA integration enabled and auto-sync turned on
 */

import { NextRequest, NextResponse } from 'next/server';
import { jiraSyncService } from '../../../services/jiraSyncService';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (you can add authentication here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting midnight JIRA sync cron job...');

    // Get all scopes with JIRA integration
    // Note: This is a simplified approach. In production, you might want to
    // query the database directly for scopes with JIRA enabled
    const scopesToSync: string[] = [];
    
    // For now, we'll sync all scopes that have auto-sync enabled
    // This would need to be enhanced to query the database for scopes
    // with JIRA integration and auto-sync enabled
    
    const results = [];
    
    for (const scopeId of scopesToSync) {
      try {
        console.log(`Syncing scope: ${scopeId}`);
        const result = await jiraSyncService.syncScope(scopeId);
        results.push({ scopeId, result });
      } catch (error) {
        console.error(`Failed to sync scope ${scopeId}:`, error);
        results.push({ 
          scopeId, 
          result: { 
            success: false, 
            message: `Chyba: ${error}`,
            timestamp: new Date()
          } 
        });
      }
    }

    console.log('Midnight JIRA sync cron job completed:', results);

    return NextResponse.json({
      success: true,
      message: `Synchronizováno ${scopesToSync.length} scope`,
      results,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('JIRA sync cron job error:', error);
    return NextResponse.json(
      { error: 'Chyba při cron synchronizaci' },
      { status: 500 }
    );
  }
}

// This endpoint can also be called manually for testing
export async function POST(request: NextRequest) {
  try {
    const { scopeIds } = await request.json();

    if (!scopeIds || !Array.isArray(scopeIds)) {
      return NextResponse.json(
        { error: 'scopeIds musí být pole' },
        { status: 400 }
      );
    }

    console.log('Starting manual JIRA sync for scopes:', scopeIds);

    const results = [];
    
    for (const scopeId of scopeIds) {
      try {
        console.log(`Syncing scope: ${scopeId}`);
        const result = await jiraSyncService.syncScope(scopeId);
        results.push({ scopeId, result });
      } catch (error) {
        console.error(`Failed to sync scope ${scopeId}:`, error);
        results.push({ 
          scopeId, 
          result: { 
            success: false, 
            message: `Chyba: ${error}`,
            timestamp: new Date()
          } 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronizováno ${scopeIds.length} scope`,
      results,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Manual JIRA sync error:', error);
    return NextResponse.json(
      { error: 'Chyba při manuální synchronizaci' },
      { status: 500 }
    );
  }
}
