import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgres://veriq:veriq@localhost:5432/veriq'),
  DATABASE_OWNER_URL: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  SEED_ON_BOOT: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  SEED_ADMIN_PASSWORD: z.string().default('veriq-dev-admin'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Read at call time, not module load, so integration tests can point the
// app at different IdPs without re-importing every module.
export function readOidcConfig(): OidcConfig | null {
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI } = process.env;
  if (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !OIDC_REDIRECT_URI) {
    return null;
  }
  return { issuer: OIDC_ISSUER, clientId: OIDC_CLIENT_ID, clientSecret: OIDC_CLIENT_SECRET, redirectUri: OIDC_REDIRECT_URI };
}
