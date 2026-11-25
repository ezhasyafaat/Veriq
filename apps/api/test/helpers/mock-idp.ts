import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';

export interface MockIdp {
  url: string;
  email: string;
  stop: () => Promise<void>;
}

/**
 * Minimal OIDC provider for the authorization code flow: discovery, JWKS,
 * authorize redirect, token endpoint with a signed id_token, userinfo.
 * Accepts every request; the test asserts the client side behaves.
 */
export async function startMockIdp(email: string): Promise<MockIdp> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = { ...(await exportJWK(publicKey)), alg: 'RS256', use: 'sig', kid: 'test-key' };
  // real IdPs reject authorization codes on reuse; so does this one
  const issuedCodes = new Set<string>();

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname === '/.well-known/openid-configuration') {
      const base = `http://${req.headers.host}`;
      res.end(
        JSON.stringify({
          issuer: base,
          authorization_endpoint: `${base}/authorize`,
          token_endpoint: `${base}/token`,
          jwks_uri: `${base}/jwks`,
          userinfo_endpoint: `${base}/userinfo`,
          response_types_supported: ['code'],
          code_challenge_methods_supported: ['S256'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
        }),
      );
      return;
    }

    if (url.pathname === '/jwks') {
      res.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }

    if (url.pathname === '/authorize') {
      const redirect = new URL(url.searchParams.get('redirect_uri')!);
      const code = `mock-${randomBytes(8).toString('hex')}`;
      issuedCodes.add(code);
      redirect.searchParams.set('code', code);
      redirect.searchParams.set('state', url.searchParams.get('state')!);
      res.writeHead(302, { location: redirect.toString() });
      res.end();
      return;
    }

    if (url.pathname === '/token' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const params = new URLSearchParams(body);
      const code = params.get('code') ?? '';
      if (!issuedCodes.has(code)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'invalid_grant' }));
        return;
      }
      issuedCodes.delete(code);
      const payload: JWTPayload = {
        email,
        sub: email,
        iss: `http://${req.headers.host}`,
      };
      const idToken = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .setAudience(url.searchParams.get('client_id') ?? 'veriq')
        .sign(privateKey);
      res.end(JSON.stringify({ access_token: 'mock-access-token', token_type: 'Bearer', expires_in: 3600, id_token: idToken }));
      return;
    }

    if (url.pathname === '/userinfo') {
      res.end(JSON.stringify({ email, sub: email }));
      return;
    }

    res.writeHead(404);
    res.end('not found');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address !== 'object' || address === null) {
    throw new Error('mock idp failed to start');
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    email,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
