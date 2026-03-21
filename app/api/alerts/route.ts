// ============================================================
// app/api/alerts/route.ts — Historial de alertas enviadas
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, clearAlerts } from '@/lib/firebase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '50');

  try {
    const alerts = await getAlerts(limit);
    return NextResponse.json(alerts);
  } catch (err) {
    console.error('[alerts GET]', err);
    return NextResponse.json({ error: 'Error fetching alerts' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearAlerts();
    return NextResponse.json({ ok: true, message: 'Historial de alertas eliminado' });
  } catch (err) {
    console.error('[alerts DELETE]', err);
    return NextResponse.json({ error: 'Error clearing alerts' }, { status: 500 });
  }
}
