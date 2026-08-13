import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const blob = await put(`shares/${id}.png`, file, {
      access: 'public',
      contentType: 'image/png',
    });

    return NextResponse.json({ id, url: blob.url });
  } catch (err) {
    console.error('Share error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
