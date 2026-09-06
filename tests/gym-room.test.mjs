// Geometry/lifecycle tests use Babylon's NullEngine. No browser or GPU rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { createGymRoom } from '../lib/gym-room.ts';
import { DEFAULT_LAYOUT, validateLayout } from '../lib/gym-data.ts';
import { DEFAULT_DESIGN, DESIGN_PRESETS } from '../lib/gym-design.ts';
function fixture() {
  const engine = new NullEngine();
  // Text drawing is irrelevant to mesh bounds; supply the minimal offscreen drawing surface.
  engine.createCanvas = (width, height) => ({
    width,
    height,
    getContext: () => ({
      fillRect() {},
      clearRect() {},
      fillText() {},
      measureText: (text) => ({ width: text.length * 70 }),
    }),
  });
  const scene = new Scene(engine);
  const room = createGymRoom(scene, true);
  return { engine, scene, room };
}
test('room presets build finite geometry, with a bounded mesh count, at every supported size', () => {
  const { scene, room, engine } = fixture();
  try {
    for (const preset of DESIGN_PRESETS)
      for (const size of [
        { width: 6, depth: 6, height: 3.5 },
        { width: 500, depth: 500, height: 10 },
      ]) {
        const layout = validateLayout({
          ...DEFAULT_LAYOUT,
          items: [],
          room: size,
          design: structuredClone(preset.design),
        });
        room.update(layout);
        assert.ok(
          scene.meshes.length < 70,
          `Room has ${scene.meshes.length} meshes`,
        );
        for (const mesh of scene.meshes) {
          mesh.computeWorldMatrix(true);
          const bounds = mesh.getBoundingInfo().boundingBox;
          for (const n of [
            ...bounds.minimumWorld.asArray(),
            ...bounds.maximumWorld.asArray(),
          ])
            assert.ok(Number.isFinite(n));
          assert.ok(bounds.maximumWorld.x <= size.width / 2 + 0.3);
          assert.ok(bounds.minimumWorld.x >= -size.width / 2 - 0.3);
          assert.ok(bounds.maximumWorld.z <= size.depth / 2 + 0.3);
          assert.ok(bounds.minimumWorld.z >= -size.depth / 2 - 0.3);
        }
        assert.equal(
          scene.transformNodes.length,
          2,
          'Previous room nodes must be disposed',
        );
      }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
test('recolouring retains geometry; architecture changes replace it without leaking resources', () => {
  const { scene, room, engine } = fixture();
  try {
    const layout = {
      ...DEFAULT_LAYOUT,
      design: structuredClone(DEFAULT_DESIGN),
    };
    room.update(layout);
    const meshes = [...scene.meshes],
      materials = scene.materials.length,
      textures = scene.textures.length;
    room.update({
      ...layout,
      design: {
        ...layout.design,
        lightColor: '#ff7700',
        wallColors: { ...layout.design.wallColors, left: '#456789' },
      },
    });
    assert.deepEqual(scene.meshes, meshes);
    for (let i = 0; i < 12; i++)
      room.update({
        ...layout,
        design: {
          ...layout.design,
          ceiling: i % 2 ? 'tiles' : 'industrial',
          mirrorWall: i % 2 ? 'right' : 'back',
        },
      });
    assert.equal(scene.materials.length, materials);
    assert.equal(scene.textures.length, textures);
    const mirror = scene.getMaterialByName('wall mirror').reflectionTexture;
    assert.ok(mirror.renderList.every((m) => !m.isDisposed()));
    room.setMode('build');
    assert.equal(
      scene.getTransformNodeByName('cutaway walls and ceiling').isEnabled(),
      false,
    );
    room.setMode('explore');
    assert.equal(
      scene.getTransformNodeByName('cutaway walls and ceiling').isEnabled(),
      true,
    );
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
test('each selectable mirror clips against its own wall and excludes itself from reflections', () => {
  const { scene, room, engine } = fixture();
  try {
    for (const side of ['back', 'left', 'right', 'front', 'none']) {
      room.update({
        ...DEFAULT_LAYOUT,
        design: { ...structuredClone(DEFAULT_DESIGN), mirrorWall: side },
      });
      const mat = scene.getMaterialByName('wall mirror'),
        texture = mat.reflectionTexture;
      assert.ok(texture.renderList.every((m) => m.material !== mat));
      if (side === 'none') assert.equal(texture.renderList.length, 0);
      else
        assert.ok(
          texture.mirrorPlane.signedDistanceTo(new Vector3(0, 1.7, 0)) > 0,
        );
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
