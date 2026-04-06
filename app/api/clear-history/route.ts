import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { getAdminDb } = await import('@/lib/firebase-admin');
  const adb  = getAdminDb();

  // Borrar historial de precios
  const snap = await adb.collection('priceHistory').get();
  const batch = adb.batch();
  snap.docs.forEach(d => batch.delete(d.ref));

  // Resetear estado del cron para que corra inmediatamente
  batch.delete(adb.collection('system').doc('cronState'));

  await batch.commit();
  return NextResponse.json({ ok: true, deleted: snap.size });
}
