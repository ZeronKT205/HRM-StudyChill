import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/utils';
import { uploadToR2 } from '@/lib/r2';

export async function POST(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name;
    const contentType = file.type;

    const fileUrl = await uploadToR2(buffer, fileName, contentType);

    return NextResponse.json({
      success: true,
      url: fileUrl,
      message: 'File uploaded successfully to Cloudflare R2',
    });
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file: ' + error.message },
      { status: 500 }
    );
  }
}

