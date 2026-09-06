// Runs against the local production Worker; test identities simulate the trusted Sites edge.
import assert from 'node:assert/strict';
import { initialState } from '../lib/gym-records.ts';
import { DEFAULT_DESIGN } from '../lib/gym-design.ts';
const base = process.env.GYM_TEST_ORIGIN || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('These mutation tests must only run locally.');
const alice = `test-${crypto.randomUUID()}`,
  bob = `test-${crypto.randomUUID()}`;
async function req(path, user, method = 'GET', body) {
  const headers = {
    ...(user ? { 'oai-authenticated-user-id': user } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };
  return fetch(base + path, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
assert.equal((await req('/api/state')).status, 401);
assert.equal((await req('/api/media', null, 'POST')).status, 401);
let r = await req('/api/state', alice);
assert.equal(r.status, 200);
assert.deepEqual((await r.json()).state, null);
const state = initialState();
state.layout.name = 'API integration fixture';
state.layout.room = { width: 30, depth: 34, height: 7 };
state.layout.design = {
  ...structuredClone(DEFAULT_DESIGN),
  ceiling: 'tiles',
  fixtures: 'panels',
  sign: true,
  signText: 'TEST PARADISE',
  frameColor: '#ef7722',
};
state.layout.items[0].frameColor = '#ee4455';
r = await req('/api/state', alice, 'PUT', { revision: 0, state });
assert.equal(r.status, 200);
assert.equal((await r.json()).revision, 1);
assert.equal(
  (await req('/api/state', alice, 'PUT', { revision: 0, state })).status,
  409,
);
const parallel = await Promise.all([
  req('/api/state', alice, 'PUT', { revision: 1, state }),
  req('/api/state', alice, 'PUT', { revision: 1, state }),
]);
assert.deepEqual(
  parallel.map((r) => r.status).sort((a, b) => a - b),
  [200, 409],
);
assert.equal((await (await req('/api/state', bob)).json()).state, null);
state.sets = [
  {
    id: 'set-1',
    machineKey: 'placed:chest-1',
    machineName: 'Chest press',
    exercise: 'Chest press',
    weight: 55,
    reps: 9,
    unit: 'kg',
    date: '2026-09-06',
    notes: 'Seat 4',
  },
];
assert.equal(
  (await req('/api/state', alice, 'PUT', { revision: 2, state })).status,
  200,
);
const loaded = await (await req('/api/state', alice)).json();
assert.equal(loaded.state.sets[0].weight, 55);
assert.equal(loaded.revision, 3);
assert.deepEqual(loaded.state.layout.room, state.layout.room);
assert.deepEqual(loaded.state.layout.design, state.layout.design);
assert.equal(loaded.state.layout.items[0].frameColor, '#ee4455');
const shrunken = structuredClone(state);
shrunken.layout.room = { width: 6, depth: 6, height: 4 };
assert.equal(
  (await req('/api/state', alice, 'PUT', { revision: 3, state: shrunken }))
    .status,
  400,
);
assert.equal((await (await req('/api/state', alice)).json()).revision, 3);
state.layout.muralId = 'not-owned';
assert.equal(
  (await req('/api/state', alice, 'PUT', { revision: 3, state })).status,
  400,
);
delete state.layout.muralId;
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64',
);
r = await fetch(base + '/api/media', {
  method: 'POST',
  headers: { 'oai-authenticated-user-id': alice, 'Content-Type': 'image/png' },
  body: png,
});
assert.equal(r.status, 201);
const media = await r.json();
assert.equal((await req(media.url, alice)).status, 200);
assert.equal((await req(media.url, bob)).status, 404);
assert.equal((await req(media.url, null)).status, 401);
state.layout.muralId = media.id;
assert.equal(
  (await req('/api/state', alice, 'PUT', { revision: 3, state })).status,
  200,
);
assert.equal(
  (await req('/api/state', bob, 'PUT', { revision: 0, state })).status,
  400,
);
r = await fetch(base + '/api/state', {
  method: 'PUT',
  headers: {
    'oai-authenticated-user-id': alice,
    Origin: 'https://untrusted.example',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ revision: 4, state }),
});
assert.equal(r.status, 403);
r = await fetch(base + '/api/media', {
  method: 'POST',
  headers: {
    'oai-authenticated-user-id': alice,
    'Content-Type': 'image/svg+xml',
  },
  body: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
});
assert.equal(r.status, 415);
const invalid = structuredClone(state);
invalid.sets[0].unit = 'unknown';
assert.equal(
  (await req('/api/state', alice, 'PUT', { revision: 4, state: invalid }))
    .status,
  400,
);
console.log(
  'PASS: private state persistence, conflict protection, workout round-trip, upload storage, ownership isolation, validation and cross-origin write rejection.',
);
