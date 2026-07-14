import type { Secret, SignOptions } from 'jsonwebtoken'

export const jwtConfig: { secret: Secret; expiresIn: NonNullable<SignOptions['expiresIn']> } = {
  secret: (process.env.JWT_SECRET || 'dev_secret_change_me') as Secret,
  expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as NonNullable<SignOptions['expiresIn']>,
}
