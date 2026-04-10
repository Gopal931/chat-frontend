import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useChat } from './useChat';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';
import api from '@/api/axios';
import { MESSAGES } from '@/api/endpoints';
import { sendMessageSchema } from '@/validations/message.validation';

export const useSendMessage = (conversationId: string | null) => {
  const { appendMessage } = useChat();
  const { socket }= useSocket();
  const { user }= useAuth();

  const [sending, setSending]= useState(false);
  const [uploading, setUploading]= useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Refs for guard checks — putting state in useCallback deps causes new
  // function references on every state change → unnecessary re-renders
  const sendingRef   = useRef(false);
  const uploadingRef = useRef(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef      = useRef(false);

  // conversationId ko ref mein store karo — deps array mein nahi chahiye
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  const appendMessageRef = useRef(appendMessage);
  appendMessageRef.current = appendMessage;

  const emitTyping = useCallback(() => {
    if (!socket || !conversationIdRef.current || !user) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', { conversationId: conversationIdRef.current, username: user.username });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing_stop', { conversationId: conversationIdRef.current });
    }, 1500);
  }, [socket, user]); // conversationId ref se padhte hain — dep nahi

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current && socket && conversationIdRef.current) {
      isTypingRef.current = false;
      socket.emit('typing_stop', { conversationId: conversationIdRef.current });
    }
  }, [socket]);

  // ── Text send — stable function, no state in deps ──────────────────────────
  const send = useCallback(async (text: string) => {
    if (!conversationIdRef.current || sendingRef.current) return;
    const result = sendMessageSchema.safeParse({ conversationId: conversationIdRef.current, text });
    if (!result.success) return { error: result.error.errors[0].message };
    stopTyping();
    sendingRef.current = true;
    setSending(true);
    try {
      const { data } = await api.post(MESSAGES.SEND, {
        conversationId: conversationIdRef.current,
        text,
        content: text,
      });
      appendMessageRef.current(data);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [stopTyping]); // ← only stopTyping needed, everything else via refs

  // ── File send — stable function, no state in deps ──────────────────────────
  const sendFile = useCallback(async (file: File): Promise<void> => {
    if (!conversationIdRef.current || uploadingRef.current) return;

    uploadingRef.current = true;
    setUploading(true);
    setUploadProgress(0);

    try {
      // STEP 1: Presigned PUT URL maango
      const { data: urlData } = await api.get(MESSAGES.UPLOAD_URL, {
        params: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
      });

      // STEP 2: Seedha S3 mein upload — backend se file nahi guzri
      await axios.put(urlData.uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total ?? file.size;
          const pct   = Math.round((progressEvent.loaded / total) * 100);
          setUploadProgress(pct);
        },
      });

      // STEP 3: Sirf metadata backend ko bhejo
      const { data: message } = await api.post(MESSAGES.SAVE_FILE, {
        conversationId: conversationIdRef.current,
        fileKey:        urlData.fileKey,
        fileName:       file.name,
        fileSize:       file.size,
        fileMimeType:   file.type,
      });

      appendMessageRef.current(message);
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      setUploadProgress(0);
    }
  }, []); // ← empty deps — sab kuch refs se aata hai, no re-renders

  return { send, sendFile, sending, uploading, uploadProgress, emitTyping };
};