

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

  const containerRef    = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const emojiPickerRef  = useRef<HTMLDivElement>(null);
  const smileButtonRef  = useRef<HTMLButtonElement>(null);
  const wasFocusedRef   = useRef<boolean>(false);

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

    const shouldFocusBack = document.activeElement === textareaRef.current || wasFocusedRef.current;

    setValue('');
    setShowEmoji(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      await send(trimmed);
    } finally {
      if (shouldFocusBack) {
        textareaRef.current?.focus();
      }
    }
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
    <div ref={containerRef} className="flex flex-col gap-2 p-3.5 border-t border-white/10 glass-header relative">

      {/* ── Emoji Picker — textarea ke upar float karta hai ──────────────── */}
      {showEmoji && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-2 mb-3 z-50 shadow-2xl rounded-3xl overflow-hidden border border-white/10"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.DARK}
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
        <div className="flex items-center gap-3 bg-secondary/80 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-primary/20">
          <UploadCircle progress={uploadProgress} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Uploading to S3…</p>
            <p className="text-xs text-muted-foreground truncate">{selectedFile?.name ?? 'file'}</p>
          </div>
        </div>
      )}

      {/* ── File Preview ──────────────────────────────────────────────────── */}
      {selectedFile && !uploading && (
        <div className="flex items-center gap-3 bg-secondary/80 backdrop-blur-md rounded-2xl px-3.5 py-2.5 border border-white/10">
          {isImage ? (
            <img src={URL.createObjectURL(selectedFile)} alt="preview"
              className="h-12 w-12 rounded-xl object-cover flex-shrink-0 shadow-md" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setSelectedFile(null)}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* ── Input Row ─────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-2.5">
        <input ref={fileInputRef} type="file" className="hidden"
          onChange={handleFileChange}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.mp4,.mp3,.txt"
        />

        <div className={cn(
          'flex-1 flex items-end bg-secondary/70 backdrop-blur-md rounded-2xl border border-white/10 transition-all duration-200 shadow-inner',
          'focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20'
        )}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onFocus={() => { wasFocusedRef.current = true; }}
            onBlur={(e) => {
              if (!containerRef.current?.contains(e.relatedTarget as Node)) {
                wasFocusedRef.current = false;
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }
              if (e.key === 'Escape') setShowEmoji(false);
            }}
            placeholder={selectedFile ? 'Add a caption…' : 'Type a message…'}
            rows={1}
            disabled={!conversationId || uploading}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 resize-none focus:outline-none disabled:opacity-50 leading-relaxed"
            style={{ maxHeight: '120px' }}
          />

          {/* Smile button — toggles emoji picker */}
          <Button
            ref={smileButtonRef}
            variant="ghost"
            size="icon"
            type="button"
            className={cn(
              'h-9 w-9 mb-1 flex-shrink-0 transition-colors rounded-xl',
              showEmoji
                ? 'text-primary bg-primary/20'         // active state
                : 'text-muted-foreground hover:text-foreground'
            )}
            disabled={!conversationId}
            onClick={() => setShowEmoji((prev) => !prev)}
            title="Emoji"
          >
            <Smile size={18} />
          </Button>

          <Button variant="ghost" size="icon"
            className="h-9 w-9 mr-1 mb-1 text-muted-foreground hover:text-primary flex-shrink-0 rounded-xl"
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
          className={cn(
            'h-11 w-11 rounded-2xl flex-shrink-0 overflow-hidden transition-all duration-200',
            canSend
              ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95'
              : 'bg-secondary/50 text-muted-foreground opacity-50'
          )}
        >
          {uploading
            ? <UploadCircle progress={uploadProgress} />
            : <Send size={18} className={cn(sending ? 'opacity-50' : '', 'ml-0.5')} />
          }
        </Button>
      </div>
    </div>
  );
};

export default React.memo(MessageInput);