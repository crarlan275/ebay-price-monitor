import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getAdminDb } = await import('@/lib/firebase-admin');
    const adb  = getAdminDb();
    const snap = await adb.collection('system').doc('cronState').get();
    if (!snap.exists) return NextResponse.json({ lastRunAt: null });

    const data      = snap.data()!;
    const lastRunAt = data.lastRunAt?.seconds ?? null;
    return NextResponse.json({ lastRunAt });
  } catch {
    return NextResponse.json({ lastRunAt: null });
  }
}
