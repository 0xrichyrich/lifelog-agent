import { NextResponse } from 'next/server';
import { exportAllData } from '@/lib/db-mock';

export async function GET() {
  try {
    const data = exportAllData();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      error: 'Export failed',
      activities: [],
      checkIns: [],
      media: [],
      summaries: [],
    });
  }
}
