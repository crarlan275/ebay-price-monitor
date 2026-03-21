// ============================================================
// app/api/products/route.ts — CRUD de productos y settings
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
  getProducts, addProduct, updateProduct, deleteProduct,
  getPriceHistory, getSettings, saveSettings,
} from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Placeholder userId — en producción usar Firebase Auth session
const DEFAULT_USER = 'default-user';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id       = searchParams.get('id');
  const history  = searchParams.get('history');
  const settings = searchParams.get('settings');

  try {
    if (settings) {
      const data = await getSettings(DEFAULT_USER);
      return NextResponse.json(data);
    }
    if (history && id) {
      const data = await getPriceHistory(id, 200);
      return NextResponse.json(data);
    }
    const products = await getProducts(DEFAULT_USER);
    return NextResponse.json(products);
  } catch (err) {
    console.error('[products GET]', err);
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const settings = searchParams.get('settings');

  try {
    const body = await req.json();

    if (settings) {
      await saveSettings(DEFAULT_USER, body);
      return NextResponse.json({ ok: true });
    }

    const id = await addProduct({
      ...body,
      userId:    DEFAULT_USER,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[products POST]', err);
    return NextResponse.json({ error: 'Error creating product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const body = await req.json();
    await updateProduct(id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[products PUT]', err);
    return NextResponse.json({ error: 'Error updating product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[products DELETE]', err);
    return NextResponse.json({ error: 'Error deleting product' }, { status: 500 });
  }
}
