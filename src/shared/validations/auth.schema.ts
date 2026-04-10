/**
 * auth.schema.ts — SHARED validation rules
 *
 * This file is imported by BOTH:
 *   - Frontend (Signup.tsx, Login.tsx) → shows inline errors before API call
 *   - Backend  (routes/auth.ts)        → blocks invalid requests at the server
 *
 * Change a rule here → both sides update automatically. No duplication.
 */
import { z } from 'zod';

// ─────────────────────────────────────────────
//  REGISTER SCHEMA
//  Rules for creating a new account
// ─────────────────────────────────────────────
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .trim(),

  email: z
    .string()
    .email('Please enter a valid email address'),

  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

// ─────────────────────────────────────────────
//  LOGIN SCHEMA
//  Rules for logging in
// ─────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

// ─────────────────────────────────────────────
//  TYPESCRIPT TYPES — inferred automatically
//  No need to write interfaces manually
// ─────────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
// RegisterInput is exactly: { username: string; email: string; password: string }

export type LoginInput = z.infer<typeof loginSchema>;
// LoginInput is exactly: { email: string; password: string }
