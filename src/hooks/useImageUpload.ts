// hooks/useImageUpload.ts
// React hook for image upload with processing

import { useState, useCallback } from 'react';
import { 
  processImage, 
  ProcessedImage, 
  ProcessingProgress,
  processImageQuick 
} from '@/lib/image-processor';
import { 
  uploadProcessedImage, 
  UploadedImage, 
  UploadProgress,
  deleteImage 
} from '@/lib/image-uploader';
import { useAuth } from '@/lib/auth';

export type UploadStage = 
  | 'idle' 
  | 'processing' 
  | 'uploading' 
  | 'complete' 
  | 'error';

export interface UploadState {
  stage: UploadStage;
  progress: number;
  message: string;
  error?: string;
}

export interface UseImageUploadReturn {
  state: UploadState;
  upload: (file: File) => Promise<UploadedImage | null>;
  uploadQuick: (file: File) => Promise<{ id: string; previewUrl: string } | null>;
  remove: (imageId: string) => Promise<boolean>;
  reset: () => void;
}

const initialState: UploadState = {
  stage: 'idle',
  progress: 0,
  message: '',
};

export function useImageUpload(): UseImageUploadReturn {
  const { user } = useAuth();
  const [state, setState] = useState<UploadState>(initialState);

  /**
   * Full upload: process + OCR + upload
   */
  const upload = useCallback(async (file: File): Promise<UploadedImage | null> => {
    if (!user) {
      setState({
        stage: 'error',
        progress: 0,
        message: 'Giriş yapmalısınız',
        error: 'Giriş yapmalısınız',
      });
      return null;
    }

    try {
      // 1. Processing stage (0-60%)
      setState({
        stage: 'processing',
        progress: 0,
        message: 'İşleniyor...',
      });

      const processed = await processImage(file, (progress: ProcessingProgress) => {
        setState({
          stage: 'processing',
          progress: progress.progress * 0.6, // 0-60%
          message: progress.message,
        });
      });

      // 2. Upload stage (60-100%)
      setState({
        stage: 'uploading',
        progress: 60,
        message: 'Yükleniyor...',
      });

      const uploaded = await uploadProcessedImage(
        user.id,
        processed,
        (progress: UploadProgress) => {
          setState({
            stage: 'uploading',
            progress: 60 + progress.progress * 0.4, // 60-100%
            message: progress.message,
          });
        }
      );

      // 3. Complete
      setState({
        stage: 'complete',
        progress: 100,
        message: 'Tamamlandı!',
      });

      return uploaded;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Yükleme hatası';
      setState({
        stage: 'error',
        progress: 0,
        message: errorMessage,
        error: errorMessage,
      });
      return null;
    }
  }, [user]);

  /**
   * Quick upload: just thumbnail for preview (no OCR)
   */
  const uploadQuick = useCallback(async (
    file: File
  ): Promise<{ id: string; previewUrl: string } | null> => {
    if (!user) {
      return null;
    }

    try {
      const quick = await processImageQuick(file);
      return {
        id: quick.id,
        previewUrl: quick.previewUrl,
      };
    } catch (error) {
      console.error('Quick process error:', error);
      return null;
    }
  }, [user]);

  /**
   * Remove uploaded image
   */
  const remove = useCallback(async (imageId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await deleteImage(user.id, imageId);
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }, [user]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    upload,
    uploadQuick,
    remove,
    reset,
  };
}

/**
 * Multiple files upload hook
 */
export function useMultiImageUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UploadedImage[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const uploadMany = useCallback(async (files: File[]): Promise<UploadedImage[]> => {
    if (!user || files.length === 0) return [];

    setUploading(true);
    setProgress(0);
    setResults([]);
    setErrors([]);

    const uploaded: UploadedImage[] = [];
    const failed: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const processed = await processImage(files[i]);
        const result = await uploadProcessedImage(user.id, processed);
        uploaded.push(result);
      } catch (error) {
        failed.push(files[i].name);
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setResults(uploaded);
    setErrors(failed);
    setUploading(false);

    return uploaded;
  }, [user]);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setResults([]);
    setErrors([]);
  }, []);

  return {
    uploading,
    progress,
    results,
    errors,
    uploadMany,
    reset,
  };
}
