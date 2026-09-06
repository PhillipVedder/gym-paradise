import { env } from 'cloudflare:workers';
export function bindings() {
  const e = env as unknown as { DB: D1Database; ASSETS: R2Bucket };
  if (!e.DB || !e.ASSETS) throw new Error('Cloud storage is not configured.');
  return e;
}
export function owner(request: Request) {
  const id = request.headers.get('oai-authenticated-user-id');
  if (!id || id.length > 250)
    throw Response.json(
      { error: 'Sign in to access your gym.' },
      { status: 401 },
    );
  return id;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    throw Response.json(
      { error: 'Cross-origin writes are not allowed.' },
      { status: 403 },
    );
}
export async function limitedBody(request: Request, max: number) {
  const tooLarge = () =>
    Response.json({ error: 'This upload is too large.' }, { status: 413 });
  if (Number(request.headers.get('content-length')) > max) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function jsonBody(request: Request) {
  const bytes = await limitedBody(request, 2_000_000);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
}
export function failure(e: unknown) {
  if (e instanceof Response) return e;
  console.error(
    'Gym request failed:',
    e instanceof Error ? e.message : 'unknown error',
  );
  return Response.json(
    { error: 'Unable to complete this request. Please try again.' },
    { status: 500 },
  );
}
export const privateHeaders = { 'Cache-Control': 'private, no-store' };
