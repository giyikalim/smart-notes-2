// components/editor/MilkdownToolbar.tsx
"use client";

import { editorViewCtx } from "@milkdown/core";
import { useInstance } from "@milkdown/react";
import { callCommand } from "@milkdown/utils";
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInBlockquoteCommand,
  insertHrCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  toggleInlineCodeCommand,
  createCodeBlockCommand,
  updateLinkCommand,
} from "@milkdown/preset-commonmark";
import { toggleStrikethroughCommand } from "@milkdown/preset-gfm";
import { setBlockType, toggleMark } from "@milkdown/prose/commands";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useCallback, useRef } from "react";

interface UploadState {
  stage: string;
  progress: number;
  message: string;
}

interface MilkdownToolbarProps {
  disabled?: boolean;
  uploadState: UploadState;
  onFileSelect: (file: File) => void;
}

export function MilkdownToolbar({
  disabled = false,
  uploadState,
  onFileSelect,
}: MilkdownToolbarProps) {
  const [loading, getInstance] = useInstance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading =
    uploadState.stage === "processing" || uploadState.stage === "uploading";

  // Run a Milkdown command
  const runCommand = useCallback(
    (command: ReturnType<typeof toggleStrongCommand>) => {
      if (loading || disabled) return;
      const editor = getInstance();
      editor?.action(callCommand(command.key));
    },
    [loading, disabled, getInstance]
  );

  // Toggle strikethrough using Milkdown command
  const toggleStrikethrough = useCallback(() => {
    if (loading || disabled) return;
    const editor = getInstance();
    if (!editor) return;

    editor.action(callCommand(toggleStrikethroughCommand.key));
  }, [loading, disabled, getInstance]);

  // Handle heading insertion using ProseMirror schema
  const insertHeading = useCallback(
    (level: 1 | 2 | 3) => {
      if (loading || disabled) return;
      const editor = getInstance();
      if (!editor) return;

      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        if (view) {
          const { state, dispatch } = view;
          const headingNode = state.schema.nodes.heading;
          if (headingNode) {
            setBlockType(headingNode, { level })(state, dispatch);
          }
        }
      });
    },
    [loading, disabled, getInstance]
  );

  // Handle list insertion using Milkdown commands
  const insertList = useCallback(
    (ordered: boolean) => {
      if (loading || disabled) return;
      const editor = getInstance();
      if (!editor) return;

      if (ordered) {
        editor.action(callCommand(wrapInOrderedListCommand.key));
      } else {
        editor.action(callCommand(wrapInBulletListCommand.key));
      }
    },
    [loading, disabled, getInstance]
  );

  // Handle code - toggle inline code using Milkdown command
  const insertCode = useCallback(() => {
    if (loading || disabled) return;
    const editor = getInstance();
    if (!editor) return;

    // Use toggleInlineCodeCommand for inline code
    editor.action(callCommand(toggleInlineCodeCommand.key));
  }, [loading, disabled, getInstance]);

  // Handle link using Milkdown command
  const insertLink = useCallback(() => {
    if (loading || disabled) return;
    const editor = getInstance();
    if (!editor) return;

    const url = prompt("URL girin:");
    if (!url) return;

    // Use updateLinkCommand with href
    editor.action(callCommand(updateLinkCommand.key, { href: url }));
  }, [loading, disabled, getInstance]);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input
    e.target.value = "";
  };

  const buttonClass =
    "p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 transition-colors";

  return (
    <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex-wrap">
      {/* Text formatting */}
      <button
        type="button"
        onClick={() => runCommand(toggleStrongCommand)}
        disabled={disabled || loading}
        className={buttonClass}
        title="Kalin (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => runCommand(toggleEmphasisCommand)}
        disabled={disabled || loading}
        className={buttonClass}
        title="Italik (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={toggleStrikethrough}
        disabled={disabled || loading}
        className={buttonClass}
        title="Ustu cizili"
      >
        <Strikethrough className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Headings */}
      <button
        type="button"
        onClick={() => insertHeading(1)}
        disabled={disabled || loading}
        className={buttonClass}
        title="Baslik 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => insertHeading(2)}
        disabled={disabled || loading}
        className={buttonClass}
        title="Baslik 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => insertHeading(3)}
        disabled={disabled || loading}
        className={buttonClass}
        title="Baslik 3"
      >
        <Heading3 className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Lists */}
      <button
        type="button"
        onClick={() => insertList(false)}
        disabled={disabled || loading}
        className={buttonClass}
        title="Liste"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => insertList(true)}
        disabled={disabled || loading}
        className={buttonClass}
        title="Numarali Liste"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Other formatting */}
      <button
        type="button"
        onClick={() => runCommand(wrapInBlockquoteCommand)}
        disabled={disabled || loading}
        className={buttonClass}
        title="Alinti"
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={insertCode}
        disabled={disabled || loading}
        className={buttonClass}
        title="Kod"
      >
        <Code className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={insertLink}
        disabled={disabled || loading}
        className={buttonClass}
        title="Link"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => runCommand(insertHrCommand)}
        disabled={disabled || loading}
        className={buttonClass}
        title="Yatay cizgi"
      >
        <Minus className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Image upload */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || loading || isUploading}
        className={`${buttonClass} text-blue-600 dark:text-blue-400`}
        title="Resim Ekle"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Image className="w-4 h-4" />
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Character count could go here */}
    </div>
  );
}
