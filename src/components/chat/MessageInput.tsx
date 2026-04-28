

import React, { useRef, useState, useEffect } from 'react';
import { Send, Smile, Paperclip, X, FileText } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSendMessage } from '@/hooks/useSendMessage';

interface Props { conversationId: string | null; }

const formatBytes = (b: number): string =>
  b < 1024 ? `${b} B` : b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/(1024*1024)).toFixed(1)} MB`;

// ── SVG Circle — upload progress ──────────────────
const UploadCircle = ({ progress }: { progress: number }) => {
  const radius= 16;
  const circumference = 2 * Math.PI * radius;
  const offset= circumference - (progress / 100) * circumference;
  const size= 38;
  const center = size / 2;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor" strokeWidth={3} className="text-muted" />
        <circle cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor" strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-[stroke-dashoffset] duration-150" />
      </svg>
      <span className="text-[9px] font-bold text-primary leading-none">{progress}%</span>
    </div>
  );
};

const MessageInput: React.FC<Props> = ({ conversationId }) => {
  const [value, setValue]               = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showEmoji, setShowEmoji]       = useState(false);

  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const smileButtonRef = useRef<HTMLButtonElement>(null);

  const { send, sendFile, sending, uploading, uploadProgress, emitTyping } = useSendMessage(conversationId);

  // ── Close emoji picker when clicking outside ──────────────────────────────
  useEffect(() => {
    if (!showEmoji) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        smileButtonRef.current &&
        !smileButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji]);

  // ── Emoji clicked → insert at cursor position ────────────────────────────
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji    = emojiData.emoji;
    const textarea = textareaRef.current;
    if (!textarea) {
      setValue((prev) => prev + emoji);
      return;
    }
    // Insert at cursor position, not always at end
    const start    = textarea.selectionStart ?? value.length;
    const end      = textarea.selectionEnd   ?? value.length;
    const newValue = value.slice(0, start) + emoji + value.slice(end);
    setValue(newValue);

    // Move cursor after inserted emoji
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursor = start + emoji.length;
      textarea.setSelectionRange(newCursor, newCursor);
      // Resize textarea
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
  };

  const handleSendText = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setValue('');
    setShowEmoji(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await send(trimmed);
    textareaRef.current?.focus();
  };

  const handleSendFile = async () => {
    if (!selectedFile || uploading) return;
    try {
      await sendFile(selectedFile);
      setSelectedFile(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleSend = () => {
    if (selectedFile) handleSendFile();
    else handleSendText();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Max file size is 10 MB'); return; }
    setSelectedFile(file);
    e.target.value = '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    emitTyping();
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
  };

  const isImage = selectedFile?.type.startsWith('image/');
  const canSend = (value.trim().length > 0 || !!selectedFile) && !sending && !uploading && !!conversationId;

  return (
    <div className="flex flex-col gap-2 p-3 border-t border-border bg-card relative">

      {/* ── Emoji Picker — textarea ke upar float karta hai ──────────────── */}
      {showEmoji && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-2 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            lazyLoadEmojis
            searchPlaceHolder="Search emoji..."
            skinTonesDisabled
            width={320}
            height={400}
          />
        </div>
      )}

      {/* ── Upload Progress ───────────────────────────────────────────────── */}
      {uploading && (
        <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-2.5 border border-border">
          <UploadCircle progress={uploadProgress} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Uploading to S3…</p>
            <p className="text-xs text-muted-foreground truncate">{selectedFile?.name ?? 'file'}</p>
          </div>
        </div>
      )}

      {/* ── File Preview ──────────────────────────────────────────────────── */}
      {selectedFile && !uploading && (
        <div className="flex items-center gap-3 bg-secondary rounded-xl px-3 py-2.5 border border-border">
          {isImage ? (
            <img src={URL.createObjectURL(selectedFile)} alt="preview"
              className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedFile(null)}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* ── Input Row ─────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" className="hidden"
          onChange={handleFileChange}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.mp4,.mp3,.txt"
        />

        <div className={cn(
          'flex-1 flex items-end bg-secondary rounded-2xl border border-border transition-colors',
          'focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/20'
        )}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }
              if (e.key === 'Escape') setShowEmoji(false);
            }}
            placeholder={selectedFile ? 'Add a caption…' : 'Type a message…'}
            rows={1}
            disabled={!conversationId || sending || uploading}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none disabled:opacity-50 leading-relaxed"
            style={{ maxHeight: '120px' }}
          />

          {/* Smile button — toggles emoji picker */}
          <Button
            ref={smileButtonRef}
            variant="ghost"
            size="icon"
            type="button"
            className={cn(
              'h-9 w-9 mb-1 flex-shrink-0 transition-colors',
              showEmoji
                ? 'text-primary bg-primary/10'         // active state
                : 'text-muted-foreground hover:text-foreground'
            )}
            disabled={!conversationId}
            onClick={() => setShowEmoji((prev) => !prev)}
            title="Emoji"
          >
            <Smile size={18} />
          </Button>

          <Button variant="ghost" size="icon"
            className="h-9 w-9 mr-1 mb-1 text-muted-foreground hover:text-primary flex-shrink-0"
            disabled={!conversationId || uploading}
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <Paperclip size={18} />
          </Button>
        </div>

        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className={cn('h-11 w-11 rounded-2xl flex-shrink-0 overflow-hidden transition-all',
            canSend ? 'shadow-lg shadow-primary/25' : '')}
        >
          {uploading
            ? <UploadCircle progress={uploadProgress} />
            : <Send size={16} className={sending ? 'opacity-50' : ''} />
          }
        </Button>
      </div>
    </div>
  );
};

export default React.memo(MessageInput);