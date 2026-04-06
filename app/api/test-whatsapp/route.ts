import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const token  = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const chatId = process.env.TELEGRAM_CHAT_ID ?? '';

  if (!token || !chatId) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados' }, { status: 500 });
  }

  const text = '✅ *Prueba desde eBay Price Monitor*\n\nTodo funciona correctamente\\. Recibirás alertas aquí cuando se detecten ofertas en eBay\\.';

  const res  = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
  });
  const json = await res.json();

  return NextResponse.json({ ok: json.ok, result: json });
}
