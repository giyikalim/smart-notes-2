// components/editor/MarkdownRenderer.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import { NoteImage } from '@/lib/elasticsearch-client';
import { getSignedUrls } from '@/lib/image-uploader';
import { Image as ImageIcon, ZoomIn, Loader2 } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  images?: NoteImage[];
  className?: string;
}

interface ImageUrls {
  original: string;
  medium: string;
  thumb: string;
}

export default function MarkdownRenderer({
  content,
  images = [],
  className = '',
}: MarkdownRendererProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Map<string, ImageUrls>>(new Map());
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);

  // Build image map for quick lookup
  const imageMap = useMemo(() => {
    const map = new Map<string, NoteImage>();
    images.forEach(img => map.set(img.id, img));
    return map;
  }, [images]);

  // Load signed URLs for all images
  useEffect(() => {
    async function loadSignedUrls() {
      if (images.length === 0) return;

      setIsLoadingUrls(true);
      
      try {
        // Collect all paths
        const allPaths: string[] = [];
        const pathToImageId: Map<string, { imageId: string; variant: string }> = new Map();
        
        images.forEach(img => {
          if (img.storagePaths) {
            allPaths.push(img.storagePaths.original);
            allPaths.push(img.storagePaths.medium);
            allPaths.push(img.storagePaths.thumb);
            
            pathToImageId.set(img.storagePaths.original, { imageId: img.id, variant: 'original' });
            pathToImageId.set(img.storagePaths.medium, { imageId: img.id, variant: 'medium' });
            pathToImageId.set(img.storagePaths.thumb, { imageId: img.id, variant: 'thumb' });
          }
        });

        if (allPaths.length === 0) return;

        // Get signed URLs in batch
        const urlMap = await getSignedUrls(allPaths);
        
        // Organize by image ID
        const newSignedUrls = new Map<string, ImageUrls>();
        
        images.forEach(img => {
          if (img.storagePaths) {
            newSignedUrls.set(img.id, {
              original: urlMap.get(img.storagePaths.original) || '',
              medium: urlMap.get(img.storagePaths.medium) || '',
              thumb: urlMap.get(img.storagePaths.thumb) || '',
            });
          }
        });

        setSignedUrls(newSignedUrls);
      } catch (error) {
        console.error('Failed to load signed URLs:', error);
      } finally {
        setIsLoadingUrls(false);
      }
    }

    loadSignedUrls();
  }, [images]);

  // Find image placeholders in content
  const imageMatches = useMemo(() => {
    const matches: { id: string; index: number }[] = [];
    const regex = /\{\{img:([a-f0-9-]+)\}\}/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({ id: match[1], index: match.index });
    }
    return matches;
  }, [content]);

  // Render content with images
  const renderedContent = useMemo(() => {
    if (imageMatches.length === 0) {
      return <span dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />;
    }

    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    imageMatches.forEach((imgMatch, idx) => {
      // Add text before this image
      const textBefore = content.slice(lastIndex, imgMatch.index);
      if (textBefore) {
        parts.push(
          <span key={`text-${idx}`} dangerouslySetInnerHTML={{ __html: parseMarkdown(textBefore) }} />
        );
      }

      // Add the image
      const image = imageMap.get(imgMatch.id);
      const urls = signedUrls.get(imgMatch.id);
      
      if (image && urls && urls.medium) {
        parts.push(
          <div key={`img-${idx}`} className="my-4">
            <div className="relative group inline-block">
              <img
                src={urls.medium}
                alt={image.originalName || 'Note image'}
                className="max-w-full h-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setLightboxImage(urls.original)}
                loading="lazy"
              />
              <button
                onClick={() => setLightboxImage(urls.original)}
                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            {image.ocrText && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  Resimde bulunan metin
                </summary>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 italic">
                  "{image.ocrText}"
                </p>
              </details>
            )}
          </div>
        );
      } else if (image && isLoadingUrls) {
        // Loading state
        parts.push(
          <div key={`img-loading-${idx}`} className="my-4 p-8 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Resim yükleniyor...</p>
          </div>
        );
      } else {
        // Image not found or URL failed
        parts.push(
          <div key={`img-missing-${idx}`} className="my-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500">
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Resim yüklenemedi</p>
          </div>
        );
      }

      lastIndex = imgMatch.index + `{{img:${imgMatch.id}}}`.length;
    });

    // Add remaining text after last image
    const textAfter = content.slice(lastIndex);
    if (textAfter) {
      parts.push(
        <span key="text-final" dangerouslySetInnerHTML={{ __html: parseMarkdown(textAfter) }} />
      );
    }

    return parts;
  }, [content, imageMatches, imageMap, signedUrls, isLoadingUrls]);

  return (
    <>
      <div className={`prose dark:prose-invert max-w-none ${className}`}>
        {renderedContent}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-xl z-10"
          >
            ✕
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

/**
 * Simple markdown parser
 */
function parseMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto my-2"><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">$1</code>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2 text-gray-600 dark:text-gray-400">$1</blockquote>')
    // Lists
    .replace(/^\* (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-4 border-gray-300 dark:border-gray-600" />')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br />');
}
