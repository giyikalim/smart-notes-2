// lib/image-uploader.ts
// Supabase Storage upload functionality - PRIVATE BUCKET

import { createClient } from '@supabase/supabase-js';
import { ProcessedImage } from './image-processor';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Signed URL cache (memory)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_DURATION = 3600; // 1 saat (saniye)
const CACHE_BUFFER = 300; // 5 dakika buffer (saniye)

export interface UploadedImage {
  id: string;
  // Private bucket için path'ler saklıyoruz, URL değil
  storagePaths: {
    original: string;
    medium: string;
    thumb: string;
  };
  ocrText: string | null;
  ocrConfidence: number;
  dimensions: {
    width: number;
    height: number;
  };
  size: {
    original: number;
    medium: number;
    thumb: number;
  };
  originalName: string;
}

export interface UploadProgress {
  stage: 'uploading' | 'complete' | 'error';
  progress: number;
  currentFile: string;
  message: string;
}

/**
 * Tek bir variant'ı upload et - sadece path döndür
 */
async function uploadVariant(
  blob: Blob,
  path: string
): Promise<string> {
  const { error } = await supabase.storage
    .from('note-images')
    .upload(path, blob, {
      contentType: 'image/webp',
      cacheControl: '31536000', // 1 yıl cache
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Private bucket - sadece path döndür, URL değil
  return path;
}

/**
 * İşlenmiş image'ı Supabase'e yükle
 */
export async function uploadProcessedImage(
  userId: string,
  processed: ProcessedImage,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedImage> {
  const basePath = `${userId}/${processed.id}`;

  const variants = [
    { key: 'original', blob: processed.original.blob },
    { key: 'medium', blob: processed.medium.blob },
    { key: 'thumb', blob: processed.thumb.blob },
  ];

  const paths: Record<string, string> = {};

  for (let i = 0; i < variants.length; i++) {
    const { key, blob } = variants[i];
    const path = `${basePath}/${key}.webp`;

    onProgress?.({
      stage: 'uploading',
      progress: Math.round(((i) / variants.length) * 100),
      currentFile: key,
      message: `${key} yükleniyor...`,
    });

    paths[key] = await uploadVariant(blob, path);
  }

  onProgress?.({
    stage: 'complete',
    progress: 100,
    currentFile: '',
    message: 'Yükleme tamamlandı!',
  });

  return {
    id: processed.id,
    storagePaths: paths as UploadedImage['storagePaths'],
    ocrText: processed.ocrText,
    ocrConfidence: processed.ocrConfidence,
    dimensions: {
      width: processed.original.width,
      height: processed.original.height,
    },
    size: {
      original: processed.original.size,
      medium: processed.medium.size,
      thumb: processed.thumb.size,
    },
    originalName: processed.originalName,
  };
}

/**
 * Tek bir path için signed URL al (cached)
 */
export async function getSignedUrl(path: string): Promise<string> {
  const now = Date.now() / 1000;
  const cached = signedUrlCache.get(path);
  
  // Cache'de varsa ve hala geçerliyse (buffer ile)
  if (cached && cached.expiresAt > now + CACHE_BUFFER) {
    return cached.url;
  }

  // Yeni signed URL oluştur
  const { data, error } = await supabase.storage
    .from('note-images')
    .createSignedUrl(path, SIGNED_URL_DURATION);

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message || 'Unknown error'}`);
  }

  // Cache'e kaydet
  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: now + SIGNED_URL_DURATION,
  });

  return data.signedUrl;
}

/**
 * Birden fazla path için signed URL'ler al (batch)
 */
export async function getSignedUrls(
  paths: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const now = Date.now() / 1000;
  const pathsToFetch: string[] = [];

  // Önce cache'i kontrol et
  for (const path of paths) {
    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt > now + CACHE_BUFFER) {
      result.set(path, cached.url);
    } else {
      pathsToFetch.push(path);
    }
  }

  // Cache'de olmayanları batch olarak al
  if (pathsToFetch.length > 0) {
    const { data, error } = await supabase.storage
      .from('note-images')
      .createSignedUrls(pathsToFetch, SIGNED_URL_DURATION);

    if (error) {
      console.error('Batch signed URL error:', error);
    }

    if (data) {
      for (const item of data) {
        if (item.signedUrl && item.path) {
          result.set(item.path, item.signedUrl);
          signedUrlCache.set(item.path, {
            url: item.signedUrl,
            expiresAt: now + SIGNED_URL_DURATION,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Image için tüm variant'ların signed URL'lerini al
 */
export async function getImageSignedUrls(
  storagePaths: UploadedImage['storagePaths']
): Promise<{ original: string; medium: string; thumb: string }> {
  const paths = [storagePaths.original, storagePaths.medium, storagePaths.thumb];
  const urlMap = await getSignedUrls(paths);

  return {
    original: urlMap.get(storagePaths.original) || '',
    medium: urlMap.get(storagePaths.medium) || '',
    thumb: urlMap.get(storagePaths.thumb) || '',
  };
}

/**
 * Image'ı sil
 */
export async function deleteImage(
  userId: string,
  imageId: string
): Promise<void> {
  const basePath = `${userId}/${imageId}`;
  
  const files = [
    `${basePath}/original.webp`,
    `${basePath}/medium.webp`,
    `${basePath}/thumb.webp`,
  ];

  // Cache'den temizle
  files.forEach(f => signedUrlCache.delete(f));

  const { error } = await supabase.storage
    .from('note-images')
    .remove(files);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Kullanıcının tüm image'larını listele
 */
export async function listUserImages(userId: string): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('note-images')
    .list(userId, {
      limit: 1000,
    });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return data?.map((item) => item.name) || [];
}

/**
 * Cache'i temizle
 */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}

/**
 * Batch upload - birden fazla image
 */
export async function uploadMultipleImages(
  userId: string,
  processedImages: ProcessedImage[],
  onProgress?: (overall: number, current: UploadProgress) => void
): Promise<UploadedImage[]> {
  const results: UploadedImage[] = [];

  for (let i = 0; i < processedImages.length; i++) {
    const processed = processedImages[i];
    const overallProgress = Math.round((i / processedImages.length) * 100);

    const uploaded = await uploadProcessedImage(
      userId,
      processed,
      (progress) => {
        onProgress?.(overallProgress + progress.progress / processedImages.length, progress);
      }
    );

    results.push(uploaded);
  }

  return results;
}
