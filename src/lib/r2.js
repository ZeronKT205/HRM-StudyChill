import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT || 'https://b177c7a2e88c24295d8fa41b8200eee0.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'aafecabcac845c1f4a48eaf8ec898740',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'f2c69cadd6a69b3f862d183911f7f31d2dc60525b9e7728617d5f66118f0fa9b',
  },
  region: 'auto',
});

/**
 * Upload a file to Cloudflare R2 bucket.
 * @param {Buffer} fileBuffer - The file buffer to upload.
 * @param {string} fileName - The target filename.
 * @param {string} contentType - The mime type of the file.
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
export async function uploadToR2(fileBuffer, fileName, contentType) {
  const bucketName = process.env.R2_BUCKET_NAME || 'studychill';
  const cleanFileName = `bills/bill_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanFileName,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  const publicUrlBase = process.env.R2_PUBLIC_URL || 'https://b177c7a2e88c24295d8fa41b8200eee0.r2.cloudflarestorage.com/studychill';
  return `${publicUrlBase}/${cleanFileName}`;
}
