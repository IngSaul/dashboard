import { z } from 'zod'

/** `POST /auth/login` request body — see contracts/api-contract.md. */
export const loginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

/** `POST /auth/users` request body (admin-only) — see contracts/api-contract.md. */
export const createUserBodySchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(8),
  role: z.enum(['admin', 'user']),
})

export type LoginBody = z.infer<typeof loginBodySchema>
export type CreateUserBody = z.infer<typeof createUserBodySchema>
