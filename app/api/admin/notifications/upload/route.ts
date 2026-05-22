// app/api/admin/notifications/upload/route.ts
// Admin: upload image or video file from PC; returns public URL for use in notifications

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { isAdminAuthorized } from '@/utils/admin-session';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']; // quicktime = .mov
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing file. Send a single file in the "file" field.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max 50 MB.' },
        { status: 400 }
      );
    }

    const type = file.type;
    const isImage = ALLOWED_IMAGE_TYPES.includes(type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(type);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Invalid file type. Use image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV).' },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name) || (isImage ? '.png' : '.mp4');
    const safeExt = ext.toLowerCase();
    const filename = `${crypto.randomUUID()}${safeExt}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'notifications');
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const url = `/uploads/notifications/${filename}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error uploading notification media:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
