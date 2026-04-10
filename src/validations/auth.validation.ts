/**
 * Auth Validation — shared schemas used in both frontend forms and (optionally) backend.
 *
 * Frontend uses these to:
 *  1. Show inline errors before the API is even called
 *  2. Get TypeScript types for free (no duplicate interface definitions)
 *
 * The backend has identical schemas in backend/src/validations/auth.validation.ts
 */
import { z } from 'zod';

// ── Register ──────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
});

// ── Login ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

// ── TypeScript types inferred from schemas ────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput    = z.infer<typeof loginSchema>;
