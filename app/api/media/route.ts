import {
  bindings,
  owner,
  sameOrigin,
  failure,
  limitedBody,
} from '@/lib/server-store';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = owner(request),
      { DB, ASSETS } = bindings();
    const length = Number(request.headers.get('content-length'));
    if (length > 8_000_000)
      return Response.json(
        { error: 'Choose an image smaller than 8 MB.' },
        { status: 413 },
      );
    const buffer = await limitedBody(request, 8_000_000);
    if (buffer.byteLength > 8_000_000 || buffer.byteLength < 16)
      return Response.json(
        { error: 'Choose an image between 16 bytes and 8 MB.' },
        { status: 413 },
      );
    const b = new Uint8Array(buffer);
    const type =
      b[0] === 255 && b[1] === 216 && b[2] === 255
        ? 'image/jpeg'
        : b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71
          ? 'image/png'
          : null;
    if (!type)
      return Response.json(
        { error: 'Use a JPEG or PNG image.' },
        { status: 415 },
      );
    const count = await DB.prepare(
      'SELECT COUNT(*) AS count FROM media WHERE owner_id = ?',
    )
      .bind(user)
      .first<{ count: number }>();
    if ((count?.count || 0) >= 500)
      return Response.json(
        { error: 'Your image library is full (500 images).' },
        { status: 409 },
      );
    const id = crypto.randomUUID();
    await ASSETS.put(id, buffer, { httpMetadata: { contentType: type } });
    try {
      await DB.prepare(
        'INSERT INTO media (id,owner_id,content_type,size,created_at) VALUES (?,?,?,?,?)',
      )
        .bind(id, user, type, buffer.byteLength, new Date().toISOString())
        .run();
    } catch (e) {
      await ASSETS.delete(id);
      throw e;
    }
    return Response.json({ id, url: `/api/media/${id}` }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}

export async function GET(request: Request) {
  try {
    const user = owner(request),
      { DB } = bindings();
    const rows = await DB.prepare('SELECT id FROM media WHERE owner_id = ?')
      .bind(user)
      .all<{ id: string }>();
    return Response.json(
      { ids: rows.results.map((r) => r.id) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
