// components/editor/MilkdownEditor.tsx
"use client";

import { useImageUpload } from "@/hooks/useImageUpload";
import { hasImages } from "@/lib/image-processor";
import { UploadedImage, getSignedUrl } from "@/lib/image-uploader";
import {
  Bold,
  Code,
  Edit3,
  Eye,
  Heading1,
  Heading2,
  Image,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Quote,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface MilkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
  onImageUpload?: (image: UploadedImage) => void;
  className?: string;
}

interface UploadedImageInfo {
  id: string;
  previewUrl: string;
  ocrText: string | null;
  uploading?: boolean;
}

export default function MilkdownEditor({
  value,
  onChange,
  placeholder = "Notunuzu buraya yazın...",
  minHeight = "300px",
  disabled = false,
  onImageUpload,
  className = "",
}: MilkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<
    Map<string, UploadedImageInfo>
  >(new Map());

  const { state: uploadState, upload, reset: resetUpload } = useImageUpload();

  // Toolbar action helper
  const insertText = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || placeholder;

      const newText =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      onChange(newText);

      // Cursor pozisyonunu ayarla
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange],
  );

  // Toolbar actions
  const toolbarActions = {
    bold: () => insertText("**", "**", "kalın metin"),
    italic: () => insertText("*", "*", "italik metin"),
    h1: () => insertText("# ", "", "Başlık"),
    h2: () => insertText("## ", "", "Alt Başlık"),
    list: () => insertText("- ", "", "liste öğesi"),
    orderedList: () => insertText("1. ", "", "liste öğesi"),
    quote: () => insertText("> ", "", "alıntı"),
    code: () => insertText("`", "`", "kod"),
    link: () => insertText("[", "](url)", "link metni"),
  };

  // Image upload handler
  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset file input
      e.target.value = "";

      const result = await upload(file);
      if (result) {
        // Get signed URL for preview
        let previewUrl = "";
        try {
          previewUrl = await getSignedUrl(result.storagePaths.thumb);
        } catch (err) {
          console.error("Failed to get preview URL:", err);
        }

        // Add to uploaded images map
        setUploadedImages((prev) =>
          new Map(prev).set(result.id, {
            id: result.id,
            previewUrl,
            ocrText: result.ocrText,
          }),
        );

        // Insert placeholder into content
        const placeholder = `\n\n{{img:${result.id}}}\n\n`;
        const textarea = textareaRef.current;
        if (textarea) {
          const cursorPos = textarea.selectionStart;
          const newValue =
            value.substring(0, cursorPos) +
            placeholder +
            value.substring(cursorPos);
          onChange(newValue);
        }

        // Callback
        onImageUpload?.(result);
        resetUpload();
      }
    },
    [upload, value, onChange, onImageUpload, resetUpload],
  );

  // Drag & drop handler
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const result = await upload(file);
        if (result) {
          // Get signed URL for preview
          let previewUrl = "";
          try {
            previewUrl = await getSignedUrl(result.storagePaths.thumb);
          } catch (err) {
            console.error("Failed to get preview URL:", err);
          }

          setUploadedImages((prev) =>
            new Map(prev).set(result.id, {
              id: result.id,
              previewUrl,
              ocrText: result.ocrText,
            }),
          );

          const placeholder = `\n\n{{img:${result.id}}}\n\n`;
          onChange(value + placeholder);
          onImageUpload?.(result);
          resetUpload();
        }
      }
    },
    [upload, value, onChange, onImageUpload, resetUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Paste handler for images
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const result = await upload(file);
            if (result) {
              // Get signed URL for preview
              let previewUrl = "";
              try {
                previewUrl = await getSignedUrl(result.storagePaths.thumb);
              } catch (err) {
                console.error("Failed to get preview URL:", err);
              }

              setUploadedImages((prev) =>
                new Map(prev).set(result.id, {
                  id: result.id,
                  previewUrl,
                  ocrText: result.ocrText,
                }),
              );

              const placeholder = `{{img:${result.id}}}`;
              const textarea = textareaRef.current;
              if (textarea) {
                const cursorPos = textarea.selectionStart;
                const newValue =
                  value.substring(0, cursorPos) +
                  placeholder +
                  value.substring(cursorPos);
                onChange(newValue);
              }
              onImageUpload?.(result);
              resetUpload();
            }
          }
          break;
        }
      }
    },
    [upload, value, onChange, onImageUpload, resetUpload],
  );

  // Render preview with images
  const renderPreview = useCallback(() => {
    let previewContent = value;

    // Replace image placeholders with actual images
    previewContent = previewContent.replace(
      /\{\{img:([a-f0-9-]+)\}\}/g,
      (match, imageId) => {
        const imageInfo = uploadedImages.get(imageId);
        if (imageInfo) {
          return `![image](${imageInfo.previewUrl})`;
        }
        return match;
      },
    );

    // Simple markdown to HTML (basic)
    return previewContent
      .replace(
        /^### (.*$)/gm,
        '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>',
      )
      .replace(
        /^## (.*$)/gm,
        '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>',
      )
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /`(.*?)`/g,
        '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">$1</code>',
      )
      .replace(
        /!\[.*?\]\((.*?)\)/g,
        '<img src="$1" class="max-w-full h-auto rounded-lg my-2" />',
      )
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" class="text-blue-600 hover:underline">$1</a>',
      )
      .replace(
        /^> (.*$)/gm,
        '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-2">$1</blockquote>',
      )
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\n/g, "<br />");
  }, [value, uploadedImages]);

  const hasImagesInContent = hasImages(value);

  return (
    <div
      className={`border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex-wrap">
        <button
          type="button"
          onClick={toolbarActions.bold}
          disabled={disabled || isPreview}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          title="Kalın (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toolbarActions.italic}
          disabled={disabled || isPreview}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          title="İtalik (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        <button
          type="button"
          onClick={toolbarActions.h1}
          disabled={disabled || isPreview}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          title="Başlık 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toolbarActions.h2}
          disabled={disabled || isPreview}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          title="Başlık 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        <button
          type="button"
          onClick={toolbarActions.list}
          disabled={disabled || isPreview}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          title="Liste"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toolbarActions.orderedList}
          disabled={disabled || isPreview}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          title="Numaralı Liste"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        <button
          type="button"
          onClick={toolbarActions.quote}
          disabled={disabled || isPreview}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          title="Alıntı"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toolbarActions.code}
          disabled={disabled || isPreview}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          title="Kod"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toolbarActions.link}
          disabled={disabled || isPreview}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          title="Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Image upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={
            disabled ||
            isPreview ||
            uploadState.stage === "processing" ||
            uploadState.stage === "uploading"
          }
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 text-blue-600 dark:text-blue-400"
          title="Resim Ekle"
        >
          {uploadState.stage === "processing" ||
          uploadState.stage === "uploading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Image className="w-4 h-4" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className={`p-2 rounded transition-colors ${
            isPreview
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
          title={isPreview ? "Düzenle" : "Önizleme"}
        >
          {isPreview ? (
            <Edit3 className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Upload progress */}
      {(uploadState.stage === "processing" ||
        uploadState.stage === "uploading") && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{uploadState.message}</span>
            <span className="ml-auto">{Math.round(uploadState.progress)}%</span>
          </div>
          <div className="mt-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {uploadState.stage === "error" && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
          <span className="text-sm text-red-700 dark:text-red-300">
            {uploadState.error}
          </span>
          <button
            onClick={resetUpload}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor / Preview */}
      {isPreview ? (
        <div
          className="p-4 prose dark:prose-invert max-w-none overflow-auto"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: renderPreview() }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full p-4 resize-none focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500"
          style={{ minHeight }}
        />
      )}

      {/* Image info panel */}
      {hasImagesInContent && (
        <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
            <Image className="w-4 h-4" />
            <span>Bu notta resim var - AI içerik düzenleme devre dışı</span>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
        <span>Markdown destekli • Resim: sürükle-bırak veya yapıştır</span>
        <span>{value.length} karakter</span>
      </div>
    </div>
  );
}
