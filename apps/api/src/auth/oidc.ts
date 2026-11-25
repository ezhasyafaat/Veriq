import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { OidcConfig } from '../env';

// Authorization Code flow with PKCE, hand-rolled on jose (CORE-ID-2).
// The client secret stays server-side; only state and the PKCE verifier
// transit the browser as a short-lived cookie.

interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
}

const discoveryCache = new Map<string, Promise<OidcDiscovery>>();
const jwksCache = new Map<string, Promise<ReturnType<typeof createRemoteJWKSet>>>();

export function buildLoginUrl(
  config: OidcConfig,
  d: OidcDiscovery,
  { state, codeChallenge }: { state: string; codeChallenge: string },
): string {
  const url = new URL(d.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function getDiscovery(config: OidcConfig): Promise<OidcDiscovery> {
  let cached = discoveryCache.get(config.issuer);
  if (!cached) {
    cached = (async () => {
      const res = await fetch(new URL('/.well-known/openid-configuration', config.issuer));
      if (!res.ok) {
        throw new Error(`OIDC discovery failed: ${res.status}`);
      }
      const doc = (await res.json()) as OidcDiscovery;
      if (doc.issuer !== config.issuer) {
        throw new Error(`OIDC issuer mismatch: ${doc.issuer}`);
      }
      return doc;
    })();
    discoveryCache.set(config.issuer, cached);
  }
  return cached;
}

async function getJwks(config: OidcConfig, d: OidcDiscovery) {
  let cached = jwksCache.get(config.issuer);
  if (!cached) {
    cached = Promise.resolve(createRemoteJWKSet(new URL(d.jwks_uri)));
    jwksCache.set(config.issuer, cached);
  }
  return cached;
}

export async function exchangeCode(
  config: OidcConfig,
  d: OidcDiscovery,
  code: string,
  verifier: string,
): Promise<string> {
  const res = await fetch(d.token_endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: config.redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`OIDC token exchange failed: ${res.status} ${await res.text()}`);
  }
  const tokens = (await res.json()) as { id_token?: string; access_token?: string };

  if (tokens.id_token) {
    const { payload } = await jwtVerify(tokens.id_token, await getJwks(config, d), {
      issuer: config.issuer,
      audience: config.clientId,
    });
    if (typeof payload.email === 'string') {
      return payload.email;
    }
  }

  if (tokens.access_token && d.userinfo_endpoint) {
    const ui = await fetch(d.userinfo_endpoint, {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    if (ui.ok) {
      const claims = (await ui.json()) as { email?: string };
      if (typeof claims.email === 'string') {
        return claims.email;
      }
    }
  }

  throw new Error('OIDC response carried no email claim');
}
