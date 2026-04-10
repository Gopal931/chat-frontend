import React, { useState, useRef, useEffect } from 'react';
import {
  Pencil, Trash2, Check, X, MoreVertical,
  Download, FileText, Image, Film, Music,
  CheckCircle2, ZoomIn,
} from 'lucide-react';
import { Message } from '@/types/message';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useMessageActions } from '@/hooks/Usemessageactions ';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MessageStatus from '@/components/shared/MessageStatus';
import UserAvatar from '@/components/shared/UserAvatar';
import api from '@/api/axios';
import { MESSAGES } from '@/api/endpoints';

interface Props { message: Message; showAvatar: boolean; }

const formatTime  = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/(1024*1024)).toFixed(1)} MB`;

// ── File type icon ────────────────────────────────────────────────────────────
const FileIcon = ({ mime }: { mime?: string }) => {
  if (!mime)                    return <FileText size={20} className="text-primary" />;
  if (mime.startsWith('image/'))return <Image   size={20} className="text-primary" />;
  if (mime.startsWith('video/'))return <Film    size={20} className="text-primary" />;
  if (mime.startsWith('audio/'))return <Music   size={20} className="text-primary" />;
  return <FileText size={20} className="text-primary" />;
};

// ── SVG Circle Progress ────────────────────────────────────────────────────────
// Kaise kaam karta hai:
//   radius = 18, circumference = 2 * pi * 18 = 113.1px
//   strokeDasharray  = 113.1  (poori circle ki length)
//   strokeDashoffset = 113.1 - (progress/100 * 113.1)
//   0%   → offset=113.1 → circle empty
//   50%  → offset=56.5  → aadhi bhari
//   100% → offset=0     → poori bhari
const CircleProgress = ({ progress, size = 42 }: { progress: number; size?: number }) => {
  const radius= (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset= circumference - (progress / 100) * circumference;
  const center= size / 2;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor" strokeWidth={3}
          className="text-muted"
        />
        {/* Fill arc — progress badhnay par bhar ta hai */}
        <circle cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor" strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-[stroke-dashoffset] duration-200"
        />
      </svg>
      <span className="text-[9px] font-bold text-primary">{progress}%</span>
    </div>
  );
};
// ── Download hook — streaming download with progress ──────────────────────────
// Kaise kaam karta hai:
//   1. Backend se presigned GET URL maango (fileKey ke basis par)
//   2. fetch() se file download karo ReadableStream use karke
//   3. Content-Length header se total size pata karo
//   4. Har chunk aate hi progress update karo
//   5. Saare chunks ek Blob mein jodo
//   6. Blob URL banao aur browser ka Save dialog trigger karo
const useStreamDownload = () => {
  const [progress,setProgress]= useState(0);
  const [downloading,setDownloading] = useState(false);
  const [downloaded,setDownloaded]  = useState(false);

  const download = async (messageId: string, fileName: string) => {
    if (downloading || downloaded) return;
    setDownloading(true);
    setProgress(0);

    try {
      // Step 1: Backend se fresh presigned GET URL maango
      const { data } = await api.get(MESSAGES.DOWNLOAD_URL(messageId));
      const presignedUrl: string = data.fileUrl;

      // Step 2: fetch() se stream shuru karo
      // fetch use karte hain kyunki ye ReadableStream support karta hai
      // XHR ya Axios mein streaming progress nahi milti
      const response = await fetch(presignedUrl);
      if (!response.ok) throw new Error('Download failed');

      // Step 3: Total size pata karo — progress calculate karne ke liye
      const contentLength = response.headers.get('Content-Length');
      const total= contentLength ? parseInt(contentLength, 10) : 0;
      const reader= response.body!.getReader();
      const chunks: ArrayBuffer[] = [];
      let received = 0;

      // Step 4: Stream padhte jao — chunk by chunk
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;                         // download complete
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          const pct = Math.round((received / total) * 100);
          setProgress(pct);
        }
      }

      // Step 5: Saare chunks ek Blob mein jodo
      const blob    = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);

      // Step 6: Temporary <a> tag se browser Save dialog trigger karo
      const a    = document.createElement('a');
      a.href     = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl); // memory free karo

      setProgress(100);
      setDownloaded(true);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return { download, progress, downloading, downloaded };
};

// ── Download Button — 3 states ────────────────────────────────────────────────
const DownloadBtn = ({
  downloading, downloaded, progress, onClick,
}: {
  downloading: boolean;
  downloaded:  boolean;
  progress:    number;
  onClick:     () => void;
}) => {
  if (downloaded) return (
    <div className="flex items-center gap-1 text-xs text-emerald-500 font-semibold">
      <CheckCircle2 size={13} /> Downloaded
    </div>
  );
  if (downloading) return <CircleProgress progress={progress} size={40} />;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex-shrink-0"
    >
      <Download size={12} /> Download
    </button>
  );
};

// ── Image Lightbox ────────────────────────────────────────────────────────────
const ImageLightbox = ({
  src, fileName, onClose, messageId, isOwn,
}: {
  src: string; fileName: string;
  onClose: () => void;
  messageId: string;
  isOwn: boolean;
}) => {
  const { download, progress, downloading, downloaded } = useStreamDownload();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={fileName}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        <button onClick={onClose}
          className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/60 rounded-b-lg">
          <span className="text-white text-sm truncate max-w-[60%]">{fileName}</span>
          {!isOwn && (
            <div className="flex-shrink-0">
              <DownloadBtn
                downloading={downloading} downloaded={downloaded} progress={progress}
                onClick={() => download(messageId, fileName)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const MessageBubble: React.FC<Props> = ({ message, showAvatar }) => {
  const { user }                         = useAuth();
  const { updateMessage, removeMessage } = useChat();
  const { editMessage, deleteMessage }   = useMessageActions();

  const isOwn   = message.sender._id === user?._id;
  const msgText = message.content ?? message.text ?? '';
  const isFile  = message.messageType === 'file' || message.messageType === 'image';
  const isImage = message.messageType === 'image';

  const [editing,     setEditing]     = useState(false);
  const [editText,    setEditText]    = useState(msgText);
  const [lightboxOpen, setLightbox]   = useState(false);
  // fileUrl nahi hai aur fileKey bhi nahi → permanently unavailable (purana message)
  const [imgSrc,   setImgSrc]   = useState(message.fileUrl ?? '');
  const [imgError, setImgError] = useState(!message.fileUrl && !message.fileKey);
  const [refreshing,  setRefreshing]  = useState(false);

  const editRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) editRef.current?.focus(); }, [editing]);

  // Download hook — receiver ke liye
  const { download, progress, downloading, downloaded } = useStreamDownload();

  // Image expire hone par auto-refresh karo
  // Sirf tab call hoga jab message.fileKey ho — purane messages mein fileKey nahi hota
  const handleImageError = async () => {
    if (refreshing) return;
    // Agar fileKey nahi hai ya already error show ho raha hai toh seedha error dikhao
    if (!message.fileKey) { setImgError(true); return; }
    setRefreshing(true);
    try {
      const { data } = await api.get(MESSAGES.DOWNLOAD_URL(message._id));
      setImgSrc(data.fileUrl);
      setImgError(false);
    } catch (err: unknown) {
      // 404 = old message ya no fileKey — permanently unavailable
      const status = (err as { response?: { status?: number } })?.response?.status;
      setImgError(true);
      if (status !== 404) console.error('[ImageError]', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === msgText) { setEditing(false); return; }
    try {
      const data = await editMessage(message._id, trimmed);
      updateMessage(data);
      setEditing(false);
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    try {
      await deleteMessage(message._id);
      removeMessage(message._id);
    } catch { /* ignore */ }
  };

  return (
    <>
      {/* Lightbox */}
      {lightboxOpen && isImage && imgSrc && (
        <ImageLightbox
          src={imgSrc}
          fileName={message.fileName ?? 'image'}
          onClose={() => setLightbox(false)}
          messageId={message._id}
          isOwn={isOwn}
        />
      )}

      <div className={cn('flex items-end gap-2 group animate-fade-in', isOwn ? 'flex-row-reverse' : 'flex-row')}>

        {/* Avatar */}
        <div className="w-8 flex-shrink-0">
          {!isOwn && showAvatar && (
            <UserAvatar username={message.sender.username} size="sm" showStatus={false} />
          )}
        </div>

        <div className={cn('flex flex-col max-w-[65%]', isOwn ? 'items-end' : 'items-start')}>
          {!isOwn && showAvatar && (
            <span className="text-xs text-muted-foreground ml-1 mb-1 font-medium">
              {message.sender.username}
            </span>
          )}

          <div className="flex items-end gap-1.5">
            {/* Edit/Delete menu — sender only */}
            {isOwn && !editing && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical size={13} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    {!isFile && (
                      <>
                        <DropdownMenuItem
                          onClick={() => { setEditText(msgText); setEditing(true); }}
                          className="gap-2"
                        >
                          <Pencil size={13} className="text-primary" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 size={13} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* ── Bubble ─────────────────────────────────────────────────── */}
            {editing ? (
              <div className="flex flex-col gap-2 w-64">
                <textarea
                title='t'
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  rows={2}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-7 text-xs gap-1">
                    <X size={11} /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleEditSave} className="h-7 text-xs gap-1">
                    <Check size={11} /> Save
                  </Button>
                </div>
              </div>

            ) : isImage ? (
              // ── IMAGE bubble ──────────────────────────────────────────────
              <div className={cn('rounded-2xl overflow-hidden', isOwn ? 'rounded-br-sm' : 'rounded-bl-sm')}>
                {/* Thumbnail */}
                <div className="relative group/img cursor-pointer" onClick={() => setLightbox(true)}>
                  {imgError ? (
                    <div className="flex items-center justify-center w-48 h-32 bg-muted rounded-xl text-xs text-muted-foreground flex-col gap-1">
                      <span className="text-lg">⚠</span>
                      <span>Image unavailable</span>
                    </div>
                  ) : (
                    <img
                      src={imgSrc}
                      alt={message.fileName ?? 'image'}
                      className="max-w-[240px] max-h-[260px] object-cover block"
                      onError={handleImageError}
                    />
                  )}
                  {refreshing && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-white text-xs animate-pulse">Refreshing…</span>
                    </div>
                  )}
                  {!imgError && (
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-all flex items-center justify-center">
                      <ZoomIn size={28} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  )}
                </div>

                {msgText && (
                  <p className={cn('px-3 py-1.5 text-sm', isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground')}>
                    {msgText}
                  </p>
                )}

                {/* Download bar — sirf receiver ko dikhao */}
                {!isOwn && (
                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-secondary border-t border-border">
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {message.fileName ?? 'image'}
                    </p>
                    <DownloadBtn
                      downloading={downloading}
                      downloaded={downloaded}
                      progress={progress}
                      onClick={() => download(message._id, message.fileName ?? 'image')}
                    />
                  </div>
                )}
              </div>

            ) : isFile ? (
              // ── FILE bubble ───────────────────────────────────────────────
              <div className={cn(
                'flex flex-col gap-2 px-4 py-3 rounded-2xl min-w-[200px]',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-secondary border border-border text-foreground rounded-bl-sm'
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    isOwn ? 'bg-white/20' : 'bg-primary/10'
                  )}>
                    <FileIcon mime={message.fileMimeType} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate max-w-[160px]">
                      {message.fileName ?? 'File'}
                    </p>
                    <p className={cn('text-xs', isOwn ? 'text-white/70' : 'text-muted-foreground')}>
                      {message.fileSize ? formatBytes(message.fileSize) : ''}
                    </p>
                  </div>
                </div>

                {/* Download — sirf receiver ko dikhao */}
                {!isOwn && (
                  <div className="border-t border-border/40 pt-2 flex justify-end">
                    <DownloadBtn
                      downloading={downloading}
                      downloaded={downloaded}
                      progress={progress}
                      onClick={() => download(message._id, message.fileName ?? 'file')}
                    />
                  </div>
                )}
              </div>

            ) : (
              // ── TEXT bubble ───────────────────────────────────────────────
              <div className={cn(
                'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-secondary text-foreground rounded-bl-sm border border-border'
              )}>
                {msgText}
              </div>
            )}
          </div>

          {/* Time + edited + status */}
          {!editing && (
            <div className={cn('flex items-center gap-1.5 mt-1 px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
              <span className="text-[10px] text-muted-foreground">{formatTime(message.createdAt)}</span>
              {message.edited && <span className="text-[10px] text-muted-foreground italic">edited</span>}
              {isOwn && <MessageStatus status={message.status ?? 'sent'} />}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(MessageBubble);