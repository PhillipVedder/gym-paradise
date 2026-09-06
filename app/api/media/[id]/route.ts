import { bindings, owner, failure } from '@/lib/server-store';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = owner(request),
      { id } = await params,
      { DB, ASSETS } = bindings();
    const row = await DB.prepare(
      'SELECT content_type FROM media WHERE id = ? AND owner_id = ?',
    )
      .bind(id, user)
      .first<{ content_type: string }>();
    if (!row) return new Response('Image not found.', { status: 404 });
    const object = await ASSETS.get(id);
    if (!object) return new Response('Image not found.', { status: 404 });
    return new Response(object.body, {
      headers: {
        'Content-Type': row.content_type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return failure(e);
  }
}
