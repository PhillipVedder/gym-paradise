// Development utility only. Never imported by, or deployed with, the Worker.
import { createServer, request } from 'node:http';

export const DEMO_IDENTITY = 'local-demo';

export function createDemoProxy(upstreamOrigin) {
  const upstream = new URL(upstreamOrigin);
  if (upstream.protocol !== 'http:' || upstream.hostname !== '127.0.0.1')
    throw new Error('The demo can only connect to a local Worker.');
  return createServer((req, res) => {
    const port = req.socket.localPort;
    const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    const origin = req.headers.origin;
    // Validate Host as well as Origin to reject DNS rebinding and remote pages.
    if (
      !hosts.has(req.headers.host) ||
      (origin && origin !== `http://${req.headers.host}`) ||
      req.headers['sec-fetch-site'] === 'cross-site' ||
      !req.url?.startsWith('/') ||
      req.url.startsWith('//')
    ) {
      res
        .writeHead(403)
        .end('This demo accepts same-origin local requests only.');
      return;
    }
    const headers = {
      ...req.headers,
      host: upstream.host,
      'oai-authenticated-user-id': DEMO_IDENTITY,
    };
    // Browser credentials and supplied identities must never reach the demo account.
    delete headers.cookie;
    delete headers.authorization;
    delete headers['forwarded'];
    delete headers['x-forwarded-host'];
    delete headers['x-forwarded-proto'];
    if (origin) headers.origin = upstream.origin;
    const proxy = request(
      {
        hostname: upstream.hostname,
        port: upstream.port,
        path: req.url,
        method: req.method,
        headers,
      },
      (incoming) => {
        res.writeHead(incoming.statusCode, {
          ...incoming.headers,
          'Cache-Control': 'no-store',
          'X-Gym-Paradise-Mode': 'local-demo',
        });
        incoming.on('error', () => res.destroy());
        incoming.pipe(res);
      },
    );
    proxy.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end('Local Worker is unavailable. Restart npm run demo.');
    });
    proxy.setTimeout(30_000, () => proxy.destroy());
    req.on('aborted', () => proxy.destroy());
    res.on('close', () => proxy.destroy());
    req.pipe(proxy);
  });
}
