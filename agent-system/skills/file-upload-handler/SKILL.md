---
name: "file-upload-handler"
description: "Use when implementing file uploads. Triggers: \"file upload\", \"S3 upload\", \"image upload\", \"multipart\", \"presigned URL\", \"multer\", \"file storage\", \"image processing\", \"resize image\", or any feature where users upload files."
---


# File Upload Handler Skill

Implement secure, scalable file uploads: direct-to-S3 with presigned URLs, image processing, virus scanning, and file management.

---

## Architecture

```
Client → POST /api/uploads/presign → Server returns { uploadUrl, fileKey }
Client → PUT {uploadUrl} (direct to S3, no server traffic)
Client → POST /api/uploads/confirm { fileKey } → Server validates + saves record
```

Direct-to-S3 keeps file bytes off your server, scales to any size.

---

## Backend: Presigned Upload

```typescript
// routes/uploads.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import multer from 'multer';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET!;

const ALLOWED_TYPES = {
  'image/jpeg':      { ext: 'jpg',  maxSize: 10_000_000 },
  'image/png':       { ext: 'png',  maxSize: 10_000_000 },
  'image/webp':      { ext: 'webp', maxSize: 10_000_000 },
  'application/pdf': { ext: 'pdf',  maxSize: 50_000_000 },
};

// Step 1: Get presigned URL
router.post('/presign', authenticate, async (req: AuthRequest, res) => {
  const { fileName, contentType, fileSize } = req.body;

  const config = ALLOWED_TYPES[contentType as keyof typeof ALLOWED_TYPES];
  if (!config) return res.status(400).json({ error: 'File type not allowed' });
  if (fileSize > config.maxSize) return res.status(400).json({ error: 'File too large' });

  const fileKey = `uploads/${req.user!.id}/${uuid()}.${config.ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key:    fileKey,
    ContentType: contentType,
    ContentLength: fileSize,
    Metadata: {
      userId: req.user!.id,
      originalName: encodeURIComponent(fileName),
    },
    // Prevent public access — always use presigned GET URLs
    ServerSideEncryption: 'AES256',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

  return res.json({ uploadUrl, fileKey });
});

// Step 2: Confirm upload + optional image processing
router.post('/confirm', authenticate, async (req: AuthRequest, res) => {
  const { fileKey, purpose } = req.body; // purpose: 'avatar' | 'document' | 'post-image'

  // Validate file actually exists in S3
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: fileKey }));
    const contentType = head.ContentType ?? '';

    // Process images
    if (contentType.startsWith('image/') && purpose === 'avatar') {
      const processed = await processAvatar(fileKey);
      const file = await FileRecord.create({
        userId: req.user!.id, key: processed.key, purpose,
        originalKey: fileKey, mimeType: contentType, sizeBytes: head.ContentLength,
      });
      return res.json({ file: { id: file.id, url: await getFileUrl(processed.key) } });
    }

    const file = await FileRecord.create({
      userId: req.user!.id, key: fileKey, purpose,
      mimeType: contentType, sizeBytes: head.ContentLength,
    });
    return res.json({ file: { id: file.id, url: await getFileUrl(fileKey) } });
  } catch {
    return res.status(400).json({ error: 'File not found. Upload may have failed.' });
  }
});

// Image processing with sharp
async function processAvatar(sourceKey: string) {
  const source = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: sourceKey }));
  const buffer = Buffer.from(await source.Body!.transformToByteArray());

  const processed = await sharp(buffer)
    .resize(400, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 85 })
    .toBuffer();

  const newKey = sourceKey.replace(/\.[^.]+$/, '-processed.webp');
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: newKey,
    Body: processed, ContentType: 'image/webp',
  }));

  return { key: newKey };
}

// Generate presigned GET URL (files are private)
async function getFileUrl(key: string) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
}
```

---

## Frontend: Upload Hook

```typescript
// hooks/useFileUpload.ts
export function useFileUpload(purpose: string) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setIsUploading(true); setError(null); setProgress(0);

    try {
      // 1. Get presigned URL
      const { data: { uploadUrl, fileKey } } = await api.post('/uploads/presign', {
        fileName: file.name, contentType: file.type, fileSize: file.size,
      });

      // 2. Upload directly to S3 with progress tracking
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total!) * 100)),
      });

      // 3. Confirm
      const { data: { file: uploadedFile } } = await api.post('/uploads/confirm', {
        fileKey, purpose,
      });

      setProgress(100);
      return uploadedFile;
    } catch (err: any) {
      setError(err.message ?? 'Upload failed');
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, progress, isUploading, error };
}

// Usage:
function AvatarUpload() {
  const { upload, progress, isUploading } = useFileUpload('avatar');

  return (
    <label>
      <input type="file" accept="image/*" hidden onChange={async (e) => {
        if (e.target.files?.[0]) {
          const file = await upload(e.target.files[0]);
          // update user profile with file.url
        }
      }} />
      {isUploading ? `Uploading ${progress}%` : 'Choose photo'}
    </label>
  );
}
```

---

## Security Checklist

- [ ] Validate MIME type server-side (not just extension)
- [ ] Enforce file size limits
- [ ] Store files outside web root (S3, not /public/)
- [ ] Private bucket — serve only via presigned GET URLs
- [ ] Expire presigned URLs (5min upload, 1h view)
- [ ] Validate fileKey belongs to authenticated user before confirm
- [ ] Sanitize file names in metadata (never use as paths)
- [ ] Limit upload rate per user (prevent storage abuse)
