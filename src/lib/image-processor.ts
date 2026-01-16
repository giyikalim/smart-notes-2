// lib/image-processor.ts
// Client-side image processing: compression, thumbnails, OCR

export interface ImageVariant {
  blob: Blob;
  width: number;
  height: number;
  size: number;
}

export interface ProcessedImage {
  id: string;
  original: ImageVariant;
  medium: ImageVariant;
  thumb: ImageVariant;
  ocrText: string | null;
  ocrConfidence: number;
  originalName: string;
  mimeType: string;
}

export interface ProcessingProgress {
  stage: 'validating' | 'compressing' | 'thumbnails' | 'ocr' | 'complete';
  progress: number;
  message: string;
}

// Variant ayarları
const VARIANTS = {
  original: { maxWidth: 1920, quality: 0.8 },
  medium: { maxWidth: 800, quality: 0.75 },
  thumb: { maxWidth: 300, quality: 0.7 },
} as const;

// Desteklenen formatlar
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Image boyutlarını al
 */
function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Image yüklenemedi'));
    };
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Canvas ile image resize ve WebP'e çevir
 */
async function resizeImage(
  file: File | Blob,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Orijinal boyutlar
      let { width, height } = img;

      // Resize hesapla
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      // Canvas oluştur
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context oluşturulamadı'));
        return;
      }

      // Çiz
      ctx.drawImage(img, 0, 0, width, height);

      // WebP olarak export
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Blob oluşturulamadı'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Image yüklenemedi'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Tek bir variant oluştur
 */
async function createVariant(
  file: File | Blob,
  maxWidth: number,
  quality: number
): Promise<ImageVariant> {
  const blob = await resizeImage(file, maxWidth, quality);
  const dimensions = await getImageDimensions(blob);

  return {
    blob,
    width: dimensions.width,
    height: dimensions.height,
    size: blob.size,
  };
}

/**
 * OCR işlemi (Tesseract.js lazy load)
 */
async function extractText(
  file: File | Blob,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> {
  try {
    // Lazy load Tesseract
    const Tesseract = await import('tesseract.js');

    const worker = await Tesseract.createWorker('tur+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress * 100);
        }
      },
    });

    try {
      const { data } = await worker.recognize(file);
      return {
        text: data.text.trim(),
        confidence: data.confidence / 100,
      };
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.warn('OCR failed:', error);
    return { text: '', confidence: 0 };
  }
}

/**
 * Dosya validasyonu
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Desteklenmeyen format. Desteklenen: ${SUPPORTED_TYPES.map(t => t.split('/')[1]).join(', ')}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Dosya çok büyük. Maksimum: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Ana işlem fonksiyonu
 */
export async function processImage(
  file: File,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ProcessedImage> {
  const id = crypto.randomUUID();

  // 1. Validasyon
  onProgress?.({
    stage: 'validating',
    progress: 0,
    message: 'Dosya kontrol ediliyor...',
  });

  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 2. Original variant
  onProgress?.({
    stage: 'compressing',
    progress: 10,
    message: 'Orijinal boyut optimize ediliyor...',
  });

  const original = await createVariant(
    file,
    VARIANTS.original.maxWidth,
    VARIANTS.original.quality
  );

  // 3. Medium variant
  onProgress?.({
    stage: 'thumbnails',
    progress: 30,
    message: 'Orta boyut oluşturuluyor...',
  });

  const medium = await createVariant(
    file,
    VARIANTS.medium.maxWidth,
    VARIANTS.medium.quality
  );

  // 4. Thumbnail variant
  onProgress?.({
    stage: 'thumbnails',
    progress: 50,
    message: 'Küçük resim oluşturuluyor...',
  });

  const thumb = await createVariant(
    file,
    VARIANTS.thumb.maxWidth,
    VARIANTS.thumb.quality
  );

  // 5. OCR (parallel olabilir ama UI feedback için sequential)
  onProgress?.({
    stage: 'ocr',
    progress: 60,
    message: 'Metin tanıma yapılıyor...',
  });

  const ocr = await extractText(file, (ocrProgress) => {
    onProgress?.({
      stage: 'ocr',
      progress: 60 + ocrProgress * 0.35,
      message: `Metin tanıma: %${Math.round(ocrProgress)}`,
    });
  });

  // 6. Complete
  onProgress?.({
    stage: 'complete',
    progress: 100,
    message: 'İşlem tamamlandı!',
  });

  return {
    id,
    original,
    medium,
    thumb,
    ocrText: ocr.confidence > 0.3 ? ocr.text : null,
    ocrConfidence: ocr.confidence,
    originalName: file.name,
    mimeType: file.type,
  };
}

/**
 * Hızlı işlem (OCR olmadan) - editör içi preview için
 */
export async function processImageQuick(file: File): Promise<{
  id: string;
  previewUrl: string;
  thumb: ImageVariant;
}> {
  const id = crypto.randomUUID();

  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const thumb = await createVariant(
    file,
    VARIANTS.thumb.maxWidth,
    VARIANTS.thumb.quality
  );

  return {
    id,
    previewUrl: URL.createObjectURL(thumb.blob),
    thumb,
  };
}

/**
 * Content içindeki image placeholder'larını bul
 */
export function extractImageIds(content: string): string[] {
  const regex = /\{\{img:([a-f0-9-]+)\}\}/g;
  const matches = content.matchAll(regex);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Content'te image var mı?
 */
export function hasImages(content: string): boolean {
  return /\{\{img:[a-f0-9-]+\}\}/.test(content);
}

/**
 * Arama için temiz content (placeholder'sız)
 */
export function getSearchableContent(content: string): string {
  return content
    .replace(/\{\{img:[a-f0-9-]+\}\}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * AI API için içerik hazırla (placeholder'sız + OCR metinleri)
 * Bu fonksiyon AI'a gönderilecek metni hazırlar:
 * - Image placeholder'larını temizler
 * - OCR metinlerini ekler (varsa)
 */
export function getContentForAI(
  content: string,
  ocrTexts?: (string | null)[]
): string {
  // Remove image placeholders
  let cleanContent = getSearchableContent(content);

  // Append OCR texts if available
  if (ocrTexts && ocrTexts.length > 0) {
    const validOcrTexts = ocrTexts.filter((text): text is string => !!text);
    if (validOcrTexts.length > 0) {
      cleanContent += '\n\n[Resimlerden çıkarılan metin:]\n' + validOcrTexts.join('\n');
    }
  }

  return cleanContent;
}

/**
 * Sadece OCR metinlerini birleştir (searchContent için)
 */
export function combineOcrTexts(ocrTexts?: (string | null)[]): string | undefined {
  if (!ocrTexts || ocrTexts.length === 0) return undefined;

  const validOcrTexts = ocrTexts.filter((text): text is string => !!text);
  if (validOcrTexts.length === 0) return undefined;

  return validOcrTexts.join(' ');
}

/**
 * Placeholder'ı markdown image'a çevir
 */
export function replacePlaceholders(
  content: string,
  imageMap: Map<string, { url: string; alt: string }>
): string {
  return content.replace(/\{\{img:([a-f0-9-]+)\}\}/g, (match, imageId) => {
    const image = imageMap.get(imageId);
    if (image) {
      return `![${image.alt}](${image.url})`;
    }
    return match;
  });
}
