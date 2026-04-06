// PATCH /api/history?id=<historyId>  { seen: true/false }
import { NextRequest, NextResponse } from 'next/server';
import { markHistorySeen } from '@/lib/firebase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  if (typeof body.seen !== 'boolean') {
    return NextResponse.json({ error: 'seen must be boolean' }, { status: 400 });
  }

  await markHistorySeen(id, body.seen);
  return NextResponse.json({ ok: true });
}
