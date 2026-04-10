/**
 * Message Validation — used in frontend before making API calls.
 * Matches the backend validation schemas exactly.
 */
import { z } from 'zod';

// ── Send a message ─────────────────────────────────────────────────────────────
export const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation is required'),
  text: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
});

// ── Create a group ─────────────────────────────────────────────────────────────
export const createGroupSchema = z.object({
  groupName: z
    .string({ required_error: 'Group name is required' })
    .min(1, 'Group name cannot be empty')
    .max(50, 'Group name is too long')
    .trim(),
  participantIds: z
    .array(z.string())
    .min(1, 'Add at least 1 other member'),
});

// ── Types ──────────────────────────────────────────────────────────────────────
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
