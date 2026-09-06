import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Matrix,
  Plane,
} from '@babylonjs/core';
import type { RoomSize } from './gym-design.ts';
export type BuildTool = 'orbit' | 'pan';
/** Babylon's scaling level is CSS pixels per rendered pixel, so HiDPI needs a value below one. */
export function renderScaling(width: number, height: number, dpr: number) {
  const ratio = Math.max(
    1,
    Math.min(dpr || 1, 2, Math.sqrt(3_000_000 / Math.max(1, width * height))),
  );
  return 1 / ratio;
}
export function createBuildNavigation(
  camera: ArcRotateCamera,
  scene: Scene,
  canvas: HTMLCanvasElement,
  getRoom: () => RoomSize,
) {
  let tool: BuildTool = 'orbit';
  const pointers = new Map<number, { x: number; y: number; pan: boolean }>();
  const plane = new Plane(0, 1, 0, 0);
  function ground(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    camera.getViewMatrix(true);
    const ray = scene.createPickingRay(
      clientX - rect.left,
      clientY - rect.top,
      Matrix.Identity(),
      camera,
    );
    const distance = ray.intersectsPlane(plane);
    return distance !== null && distance >= 0
      ? ray.origin.add(ray.direction.scale(distance))
      : null;
  }
  function target(point: Vector3) {
    const room = getRoom();
    camera.setTarget(
      new Vector3(
        Math.max(-room.width / 2, Math.min(room.width / 2, point.x)),
        0,
        Math.max(-room.depth / 2, Math.min(room.depth / 2, point.z)),
      ),
      false,
      false,
      true,
    );
  }
  function pan(fromX: number, fromY: number, toX: number, toY: number) {
    const from = ground(fromX, fromY),
      to = ground(toX, toY);
    if (from && to) target(camera.target.add(from.subtract(to)));
  }
  function zoom(factor: number, x?: number, y?: number) {
    const before = x !== undefined && y !== undefined ? ground(x, y) : null;
    camera.radius = Math.max(
      3,
      Math.min(camera.upperRadiusLimit || 100, camera.radius * factor),
    );
    if (before && x !== undefined && y !== undefined) {
      const after = ground(x, y);
      if (after) target(camera.target.add(before.subtract(after)));
    }
  }
  return {
    ground,
    zoom,
    pan,
    setTool(value: BuildTool) {
      tool = value;
      pointers.clear();
    },
    clear() {
      pointers.clear();
    },
    get active() {
      return pointers.size > 0;
    },
    down(e: PointerEvent, temporaryPan: boolean) {
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        pan:
          tool === 'pan' ||
          temporaryPan ||
          e.button === 1 ||
          e.button === 2 ||
          e.shiftKey,
      });
    },
    move(e: PointerEvent) {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const other = [...pointers.entries()].find(
        ([id]) => id !== e.pointerId,
      )?.[1];
      if (other) {
        const oldDistance = Math.hypot(p.x - other.x, p.y - other.y);
        const newDistance = Math.hypot(
          e.clientX - other.x,
          e.clientY - other.y,
        );
        pan(
          (p.x + other.x) / 2,
          (p.y + other.y) / 2,
          (e.clientX + other.x) / 2,
          (e.clientY + other.y) / 2,
        );
        if (newDistance > 5 && oldDistance > 5)
          zoom(
            oldDistance / newDistance,
            (e.clientX + other.x) / 2,
            (e.clientY + other.y) / 2,
          );
      } else if (p.pan) pan(p.x, p.y, e.clientX, e.clientY);
      else {
        camera.alpha -= (e.clientX - p.x) * 0.005;
        camera.beta = Math.max(
          0.15,
          Math.min(1.35, camera.beta - (e.clientY - p.y) * 0.005),
        );
      }
      p.x = e.clientX;
      p.y = e.clientY;
    },
    up(pointerId: number) {
      pointers.delete(pointerId);
    },
  };
}
