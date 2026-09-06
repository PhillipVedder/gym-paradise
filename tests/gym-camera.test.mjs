import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import { renderScaling, createBuildNavigation } from '../lib/gym-camera.ts';
import { fitArtwork } from '../lib/gym-design.ts';

test('retina phones render above CSS resolution instead of being downsampled', () => {
  assert.equal(renderScaling(390, 450, 3), 0.5);
  assert.equal(renderScaling(1200, 800, 1), 1);
  assert.ok(renderScaling(1440, 1000, 2) < 1);
  const level = renderScaling(1440, 1000, 2);
  assert.ok((1440 * 1000) / (level * level) <= 3_000_001);
});
test('wall art retains source proportions in wide, narrow, tall and resized rooms', () => {
  for (const ratio of [0.6, 1, 2, 3.2, 6])
    for (const [w, h] of [
      [5, 2],
      [22, 3],
      [120, 4],
      [499, 6],
    ]) {
      const fit = fitArtwork(w, h, ratio);
      assert.ok(Math.abs(fit.width / fit.height - ratio) < 0.00001);
      assert.ok(fit.width <= w + 1e-9 && fit.height <= h + 1e-9);
    }
  assert.deepEqual(fitArtwork(22, 3, 3), fitArtwork(120, 3, 3));
});
test('panning changes camera position without changing orbit angles and zoom keeps its ground anchor', () => {
  const engine = new NullEngine({ renderWidth: 1200, renderHeight: 800 });
  const scene = new Scene(engine);
  const camera = new ArcRotateCamera(
    'test',
    -Math.PI / 2,
    0.64,
    22,
    Vector3.Zero(),
    scene,
  );
  camera.upperRadiusLimit = 60;
  const canvas = {
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 1200,
      height: 800,
    }),
  };
  const controls = createBuildNavigation(camera, scene, canvas, () => ({
    width: 100,
    depth: 100,
    height: 6,
  }));
  const alpha = camera.alpha,
    beta = camera.beta;
  controls.pan(600, 400, 750, 440);
  assert.ok(camera.target.length() > 1);
  assert.equal(camera.alpha, alpha);
  assert.equal(camera.beta, beta);
  const before = controls.ground(500, 450);
  controls.zoom(0.5, 500, 450);
  const after = controls.ground(500, 450);
  assert.equal(camera.radius, 11);
  assert.ok(Vector3.Distance(before, after) < 0.001);
  scene.dispose();
  engine.dispose();
});
