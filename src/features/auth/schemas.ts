import { z } from 'zod'

export const emailSchema = z.email('Enter a valid email address').max(254)

// TRD §6.1: minimum 10 characters (mirrors supabase/config.toml and the hosted project).
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Use at most 72 characters')

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
})

export const magicLinkSchema = z.object({ email: emailSchema })

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(60, 'Use at most 60 characters'),
  email: emailSchema,
  password: passwordSchema,
})

export const resetSchema = z.object({ email: emailSchema })

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })

export type SignInValues = z.infer<typeof signInSchema>
export type MagicLinkValues = z.infer<typeof magicLinkSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ResetValues = z.infer<typeof resetSchema>
export type NewPasswordValues = z.infer<typeof newPasswordSchema>
