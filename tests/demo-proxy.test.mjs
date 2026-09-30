import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import test from 'node:test';
import { createDemoProxy, DEMO_IDENTITY } from '../scripts/demo-proxy.mjs';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

test('demo refuses a remote upstream', () => {
  assert.throws(() => createDemoProxy('https://example.com'), /local Worker/);
});

test('demo forwards local writes but isolates identity and rejects remote browser requests', async () => {
  const upstream = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        headers: req.headers,
        body: Buffer.concat(chunks).toString(),
      }),
    );
  });
  const upstreamOrigin = await listen(upstream);
  const proxy = createDemoProxy(upstreamOrigin);
  const origin = await listen(proxy);
  try {
    const response = await fetch(`${origin}/api/state`, {
      method: 'PUT',
      body: 'demo save',
      headers: {
        Origin: origin,
        'oai-authenticated-user-id': 'spoofed',
        Cookie: 'private=1',
        Authorization: 'test',
      },
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.body, 'demo save');
    assert.equal(data.headers['oai-authenticated-user-id'], DEMO_IDENTITY);
    assert.equal(data.headers.origin, upstreamOrigin);
    assert.equal(data.headers.cookie, undefined);
    assert.equal(data.headers.authorization, undefined);
    for (const headers of [
      { Origin: 'https://untrusted.example' },
      { Origin: 'null' },
      { 'Sec-Fetch-Site': 'cross-site' },
    ])
      assert.equal((await fetch(origin, { headers })).status, 403);
    const status = await new Promise((resolve, reject) => {
      const req = request(
        origin,
        { headers: { Host: 'rebound.example' } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(status, 403);
  } finally {
    await close(proxy);
    await close(upstream);
  }
});
