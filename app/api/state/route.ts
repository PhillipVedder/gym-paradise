import {
  bindings,
  owner,
  sameOrigin,
  jsonBody,
  failure,
  privateHeaders,
} from '@/lib/server-store';
import { validateState } from '@/lib/gym-records';
export async function GET(request: Request) {
  try {
    const id = owner(request),
      { DB } = bindings();
    const row = await DB.prepare(
      'SELECT payload, revision, updated_at FROM gym_states WHERE owner_id = ?',
    )
      .bind(id)
      .first<{ payload: string; revision: number; updated_at: string }>();
    return Response.json(
      row
        ? {
            scope: id,
            state: JSON.parse(row.payload),
            revision: row.revision,
            updatedAt: row.updated_at,
          }
        : { scope: id, state: null, revision: 0 },
      { headers: privateHeaders },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const id = owner(request),
      { DB } = bindings();
    const body = await jsonBody(request);
    let state;
    try {
      state = validateState(body.state);
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Invalid save.' },
        { status: 400 },
      );
    }
    const revision = body.revision;
    if (!Number.isInteger(revision) || revision < 0)
      return Response.json(
        { error: 'Invalid save revision.' },
        { status: 400 },
      );
    const mediaIds = [
      state.layout.muralId,
      ...state.collection.map((c) => c.photoId),
    ].filter((s): s is string => !!s);
    if (mediaIds.length) {
      const records = await DB.prepare(
        'SELECT id FROM media WHERE owner_id = ?',
      )
        .bind(id)
        .all<{ id: string }>();
      const owned = new Set(records.results.map((r) => r.id));
      if (mediaIds.some((m) => !owned.has(m)))
        return Response.json(
          {
            error:
              'This save references an unavailable image. Remove it or upload it again.',
          },
          { status: 400 },
        );
    }
    const now = new Date().toISOString(),
      payload = JSON.stringify(state);
    const result =
      revision === 0
        ? await DB.prepare(
            'INSERT INTO gym_states (owner_id,payload,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(owner_id) DO NOTHING',
          )
            .bind(id, payload, now)
            .run()
        : await DB.prepare(
            'UPDATE gym_states SET payload = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ?',
          )
            .bind(payload, now, id, revision)
            .run();
    if (!result.meta.changes)
      return Response.json(
        {
          error:
            'This gym changed on another device. Load the cloud save or keep a backup before replacing it.',
        },
        { status: 409 },
      );
    return Response.json(
      { revision: revision + 1, updatedAt: now },
      { headers: privateHeaders },
    );
  } catch (e) {
    return failure(e);
  }
}
