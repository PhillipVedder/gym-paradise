import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLE_LAYOUT } from '../lib/gym-example.ts';
import {
  CATALOG,
  MAX_ITEMS,
  bounds,
  validateLayout,
  walkable,
} from '../lib/gym-data.ts';
import { portableLayout } from '../lib/gym-records.ts';

test('showcase includes every equipment type, fits the room and round-trips as a portable layout', () => {
  const layout = validateLayout(structuredClone(EXAMPLE_LAYOUT));
  assert.deepEqual(
    new Set(layout.items.map((i) => i.kind)),
    new Set(CATALOG.map((e) => e.kind)),
  );
  assert.equal(layout.items.filter((i) => i.kind === 'bench').length, 3);
  assert.ok(
    layout.items.length < MAX_ITEMS,
    'Leave room to customise the example',
  );
  assert.deepEqual(
    validateLayout(JSON.parse(JSON.stringify(portableLayout(layout)))),
    layout,
  );
});

test('showcase has a clear central walkway and every piece is reachable from the entrance', () => {
  const { items, room } = EXAMPLE_LAYOUT;
  for (let z = -17; z <= 17; z += 0.5)
    for (const x of [-1.5, 0, 1.5])
      assert.ok(
        walkable(x, z, items, room),
        `Central walkway blocked at ${x}, ${z}`,
      );
  const visited = new Set(['0,-34']);
  const queue = [[0, -34]];
  for (let index = 0; index < queue.length; index++) {
    const [x, z] = queue[index];
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        key = `${nx},${nz}`;
      if (!visited.has(key) && walkable(nx / 2, nz / 2, items, room)) {
        visited.add(key);
        queue.push([nx, nz]);
      }
    }
  }
  for (const item of items) {
    const b = bounds(item, 0.8);
    const approaches = [
      [item.x - b.x, item.z],
      [item.x + b.x, item.z],
      [item.x, item.z - b.z],
      [item.x, item.z + b.z],
    ];
    assert.ok(
      approaches.some(([x, z]) =>
        visited.has(`${Math.round(x * 2)},${Math.round(z * 2)}`),
      ),
      `${item.kind} cannot be reached`,
    );
  }
});
