import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAuthSession } from '@/lib/utils';

const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT || 'https://b177c7a2e88c24295d8fa41b8200eee0.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'aafecabcac845c1f4a48eaf8ec898740',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'f2c69cadd6a69b3f862d183911f7f31d2dc60525b9e7728617d5f66118f0fa9b',
  },
  region: 'auto',
});

export async function GET(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('url');
    let key = searchParams.get('key');

    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam);
      const prefix = 'r2.cloudflarestorage.com/studychill/';
      const idx = decodedUrl.indexOf(prefix);
      if (idx !== -1) {
        key = decodedUrl.substring(idx + prefix.length);
      } else {
        const billIdx = decodedUrl.indexOf('bills/');
        if (billIdx !== -1) {
          key = decodedUrl.substring(billIdx);
        } else {
          key = decodedUrl;
        }
      }
    }

    if (!key) {
      return new Response('Image key or URL is required', { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || 'studychill';

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    const arrayBuffer = await response.Body.transformToByteArray();

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': response.ContentType || 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('R2 image proxy error:', error);
    return new Response('Image not found', { status: 404 });
  }
}
