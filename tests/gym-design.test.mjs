import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LAYOUT,
  validateLayout,
  canPlace,
  freeSpot,
  walkable,
} from '../lib/gym-data.ts';
import {
  DEFAULT_ROOM,
  DEFAULT_DESIGN,
  DESIGN_PRESETS,
  designFor,
  turfBounds,
} from '../lib/gym-design.ts';
import {
  portableLayout,
  validateState,
  initialState,
} from '../lib/gym-records.ts';

test('older saves preserve geometry and lighting when opening the room editor', () => {
  const legacy = {
    ...structuredClone(DEFAULT_LAYOUT),
    lighting: 'cyan',
    frame: 'red',
    floor: 'concrete',
  };
  const restored = validateLayout(legacy);
  assert.deepEqual(restored.room, DEFAULT_ROOM);
  assert.deepEqual(restored.items, legacy.items);
  assert.equal(designFor(restored).lightColor, '#42d2dc');
  assert.equal(designFor(restored).frameColor, '#913741');
  assert.equal(designFor(restored).floorColor, '#8f9298');
});
test('new room dimensions govern import, placement and first-person boundaries', () => {
  const room = { width: 34, depth: 38, height: 8 };
  const machine = {
    id: 'new-row',
    kind: 'rack',
    x: 14,
    z: 15,
    rotation: Math.PI / 2,
  };
  const saved = validateLayout({ ...DEFAULT_LAYOUT, room, items: [machine] });
  assert.ok(canPlace(machine, [], saved.room));
  assert.equal(canPlace(machine, []), false);
  assert.ok(walkable(15, -17, [], saved.room));
  assert.equal(walkable(16.9, 0, [], saved.room), false);
  assert.ok(freeSpot('boxingring', saved.items, saved.room));
  assert.throws(
    () => validateLayout({ ...saved, room: { width: 6, depth: 6, height: 4 } }),
    /outside/,
  );
});
test('customisation and per-machine colours survive cloud and portable backups', () => {
  const state = initialState();
  state.layout.design = structuredClone(DEFAULT_DESIGN);
  state.layout.design.wallColors.left = '#117733';
  state.layout.design.signText = 'MY PRIVATE GYM';
  state.layout.design.sign = true;
  state.layout.items[0].frameColor = '#ff7700';
  state.layout.items[0].upholsteryColor = '#334466';
  const copy = validateState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(copy.layout.design, state.layout.design);
  assert.equal(copy.layout.items[0].frameColor, '#ff7700');
  const portable = validateLayout(
    JSON.parse(JSON.stringify(portableLayout(copy.layout))),
  );
  assert.deepEqual(portable.design, copy.layout.design);
  assert.equal(portable.items[0].upholsteryColor, '#334466');
});
test('malformed customisation cannot enter stored state', () => {
  for (const mutate of [
    (d) => {
      d.room.width = Infinity;
    },
    (d) => {
      d.room.height = 0;
    },
    (d) => {
      d.room.depth = 51;
    },
    (d) => {
      d.design.wallColors.front = 'url(https://example.com)';
    },
    (d) => {
      d.design.lightColor = '__proto__';
    },
    (d) => {
      d.design.brightness = NaN;
    },
    (d) => {
      d.design.turfWidth = 100;
    },
    (d) => {
      d.design.turfX = 2;
    },
    (d) => {
      d.design.mirrorWall = 'invalid';
    },
    (d) => {
      d.design.floorGrid = 'true';
    },
    (d) => {
      d.design.ceiling = {};
    },
    (d) => {
      d.design.signText = 'x'.repeat(61);
    },
    (d) => {
      d.items[0].frameColor = '#fff';
    },
    (d) => {
      d.design.artHeight = -1;
    },
  ]) {
    const layout = {
      ...structuredClone(DEFAULT_LAYOUT),
      room: { ...DEFAULT_ROOM },
      design: structuredClone(DEFAULT_DESIGN),
    };
    mutate(layout);
    assert.throws(() => validateLayout(layout));
  }
});
test('presets preserve equipment and every turf position stays within a resized room', () => {
  for (const preset of DESIGN_PRESETS) {
    const layout = validateLayout({
      ...DEFAULT_LAYOUT,
      floor: preset.floor,
      mural: preset.mural,
      design: structuredClone(preset.design),
    });
    assert.deepEqual(layout.items, DEFAULT_LAYOUT.items);
    for (const room of [
      { width: 6, depth: 6, height: 3.5 },
      { width: 40, depth: 50, height: 10 },
    ])
      for (const turfX of [-1, 0, 1])
        for (const turfZ of [-1, 0, 1]) {
          const t = turfBounds(room, {
            ...layout.design,
            turfWidth: 5,
            turfLength: 1,
            turfX,
            turfZ,
          });
          assert.ok(Math.abs(t.x) + t.width / 2 <= room.width / 2 - 0.49);
          assert.ok(Math.abs(t.z) + t.depth / 2 <= room.depth / 2 - 0.49);
        }
  }
});
