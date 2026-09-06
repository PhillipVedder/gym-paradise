import {
  Scene,
  MeshBuilder,
  Mesh,
  TransformNode,
  StandardMaterial,
  Color3,
  DynamicTexture,
  Texture,
  MirrorTexture,
  Plane,
  type AbstractMesh,
} from '@babylonjs/core';
import {
  designFor,
  roomSize,
  turfBounds,
  WALL_SIDES,
  type WallSide,
} from './gym-design.ts';
import type { GymLayout, Mode } from './gym-data';

/** Room geometry is rebuilt only when its shape changes; textures and materials are reused. */
export function createGymRoom(scene: Scene, coarse: boolean) {
  const material = (name: string, color: string, glow = false) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor = Color3.FromHexString('#222222');
    if (glow) m.emissiveColor = m.diffuseColor;
    return m;
  };
  const structure = material('roof metal', '#22272d');
  const roof = material('ceiling panels', '#4d5056');
  const light = material('custom accent lights', '#b477ed', true);
  const white = material('neutral ceiling lights', '#dce6ef', true);
  const marking = material('track markings', '#e5e7ed');
  const turf = material('custom turf', '#422364');
  const brick = new DynamicTexture(
    'brick finish',
    { width: 256, height: 256 },
    scene,
    false,
  );
  const bc = brick.getContext();
  bc.fillStyle = '#8b8b8b';
  bc.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++)
    for (let col = -1; col < 5; col++) {
      bc.fillStyle = ['#bebebe', '#b7b7b7', '#c8c8c8'][(row + col + 6) % 3];
      bc.fillRect(col * 64 + (row % 2) * 32 + 2, row * 32 + 2, 60, 28);
    }
  brick.update();
  brick.wrapU = brick.wrapV = Texture.WRAP_ADDRESSMODE;
  brick.uScale = 9;
  brick.vScale = 2;
  const concrete = new DynamicTexture(
    'wall concrete',
    { width: 128, height: 128 },
    scene,
    false,
  );
  const cc = concrete.getContext();
  let seed = 431;
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      seed = (seed * 16807) % 2147483647;
      const v = 192 + (seed % 36);
      cc.fillStyle = `rgb(${v},${v},${v})`;
      cc.fillRect(x, y, 1, 1);
    }
  concrete.update();
  concrete.wrapU = concrete.wrapV = Texture.WRAP_ADDRESSMODE;
  concrete.uScale = 8;
  concrete.vScale = 2;
  const walls = Object.fromEntries(
    WALL_SIDES.map((s) => [s, material(`${s} wall finish`, '#303139')]),
  ) as Record<WallSide, StandardMaterial>;
  const art = material('wall artwork', '#ffffff');
  art.specularColor = Color3.Black();
  art.emissiveColor = new Color3(0.32, 0.32, 0.32);
  let artSource = '';
  const signTexture = new DynamicTexture(
    'personal wall sign',
    { width: 2048, height: 256 },
    scene,
    false,
  );
  signTexture.hasAlpha = true;
  const sign = material('personal signage', '#ffffff', true);
  sign.diffuseTexture = signTexture;
  sign.useAlphaFromDiffuseTexture = true;
  sign.disableLighting = true;
  sign.backFaceCulling = false;
  let signKey = '';
  const glass = material('daylight glazing', '#7999b0', true);
  glass.emissiveColor = new Color3(0.25, 0.34, 0.44);
  const mirror = material('wall mirror', '#161b22');
  const reflection = new MirrorTexture(
    'room reflection',
    coarse ? 256 : 512,
    scene,
    true,
  );
  reflection.refreshRate = coarse ? 4 : 2;
  reflection.level = 0.78;
  mirror.reflectionTexture = reflection;
  let roomRoot = new TransformNode('custom room', scene);
  let cutaway = new TransformNode('cutaway walls and ceiling', scene);
  let signature = '';
  let mode: Mode = 'build';
  let showCeiling = false;
  let mirrorEnabled = true;
  const setMode = (next: Mode) => {
    mode = next;
    cutaway.setEnabled(mode === 'explore' || showCeiling);
    for (const mesh of cutaway.getChildMeshes()) {
      const opaqueShell =
        mesh.material === structure ||
        mesh.material === roof ||
        WALL_SIDES.some((side) => mesh.material === walls[side]);
      mesh.visibility =
        mode === 'build' && showCeiling && opaqueShell ? 0.14 : 1;
    }
  };
  const refreshReflections = (exclude: AbstractMesh[] = []) => {
    reflection.renderList = mirrorEnabled
      ? scene.meshes.filter(
          (m) =>
            m.material !== mirror &&
            !exclude.includes(m) &&
            !m.name.includes('floor seam'),
        )
      : [];
  };
  function update(layout: GymLayout) {
    const d = designFor(layout),
      r = roomSize(layout),
      w = r.width,
      depth = r.depth,
      h = r.height;
    for (const side of WALL_SIDES) {
      walls[side].diffuseColor = Color3.FromHexString(d.wallColors[side]);
      walls[side].diffuseTexture =
        d.wallFinish === 'brick'
          ? brick
          : d.wallFinish === 'concrete'
            ? concrete
            : null;
    }
    roof.diffuseColor = Color3.FromHexString(
      d.ceiling === 'tiles' ? '#babdc1' : '#4d5056',
    );
    light.diffuseColor = Color3.FromHexString(d.lightColor);
    light.emissiveColor = light.diffuseColor.scale(d.brightness);
    white.emissiveColor = Color3.FromHexString('#dce6ef').scale(d.brightness);
    turf.diffuseColor = Color3.FromHexString(d.turfColor);
    const src = layout.muralId
      ? `/api/media/${layout.muralId}`
      : '/art/paradise-mural.png';
    if (src !== artSource) {
      art.diffuseTexture?.dispose();
      art.diffuseTexture = new Texture(src, scene);
      artSource = src;
    }
    const nextSign = `${d.signText}:${d.signColor}`;
    if (nextSign !== signKey) {
      const sc = signTexture.getContext() as CanvasRenderingContext2D;
      sc.clearRect(0, 0, 2048, 256);
      sc.font = 'bold 140px sans-serif';
      const measured = sc.measureText(d.signText || ' ').width;
      sc.font = `bold ${Math.min(140, (140 * 1950) / Math.max(1, measured))}px sans-serif`;
      sc.textAlign = 'center';
      sc.textBaseline = 'middle';
      sc.fillStyle = d.signColor;
      sc.fillText(d.signText, 1024, 128);
      signTexture.update();
      signKey = nextSign;
    }
    const shape = JSON.stringify([
      r,
      d.ceiling,
      d.fixtures,
      d.floorGrid,
      d.mirrorWall,
      layout.mural,
      d.artWall,
      d.artWidth,
      d.artHeight,
      d.artPosition,
      d.turf,
      d.turfWidth,
      d.turfLength,
      d.turfX,
      d.turfZ,
      d.sign,
      d.signWall,
      d.windows,
    ]);
    if (signature === shape) return;
    signature = shape;
    // Shared materials/textures outlive the discarded meshes.
    roomRoot.dispose(false);
    cutaway.dispose(false);
    roomRoot = new TransformNode('custom room', scene);
    cutaway = new TransformNode('cutaway walls and ceiling', scene);
    const box = (
      name: string,
      size: number[],
      pos: number[],
      mat = structure,
      parent = roomRoot,
    ) => {
      const m = MeshBuilder.CreateBox(
        name,
        { width: size[0], height: size[1], depth: size[2] },
        scene,
      );
      m.position.set(pos[0], pos[1], pos[2]);
      m.material = mat;
      m.parent = parent;
      m.isPickable = false;
      m.receiveShadows = true;
      return m;
    };
    const sideParent = (side: WallSide) =>
      side === 'front' || side === 'right' ? cutaway : roomRoot;
    const sideWidth = (side: WallSide) =>
      side === 'front' || side === 'back' ? w : depth;
    const panel = (
      name: string,
      side: WallSide,
      pw: number,
      ph: number,
      y: number,
      mat: StandardMaterial,
      offset = 0,
      inset = 0.11,
    ) => {
      const m = MeshBuilder.CreatePlane(
        name,
        { width: pw, height: ph, sideOrientation: Mesh.DOUBLESIDE },
        scene,
      );
      if (side === 'back') m.position.set(offset, y, depth / 2 - inset);
      if (side === 'front') {
        m.position.set(-offset, y, -depth / 2 + inset);
        m.rotation.y = Math.PI;
      }
      if (side === 'left') {
        m.position.set(-w / 2 + inset, y, -offset);
        m.rotation.y = -Math.PI / 2;
      }
      if (side === 'right') {
        m.position.set(w / 2 - inset, y, offset);
        m.rotation.y = Math.PI / 2;
      }
      m.material = mat;
      m.parent = sideParent(side);
      m.isPickable = false;
      return m;
    };
    box('floor foundation', [w + 0.2, 0.2, depth + 0.2], [0, -0.13, 0]);
    for (const side of WALL_SIDES) {
      const lateral = side === 'left' || side === 'right';
      box(
        `${side} wall`,
        lateral ? [0.16, h, depth] : [w, h, 0.16],
        [
          side === 'left' ? -w / 2 - 0.08 : side === 'right' ? w / 2 + 0.08 : 0,
          h / 2,
          side === 'front'
            ? -depth / 2 - 0.08
            : side === 'back'
              ? depth / 2 + 0.08
              : 0,
        ],
        walls[side],
        sideParent(side),
      );
      panel('wall skirting', side, sideWidth(side), 0.1, 0.08, structure);
    }
    if (d.floorGrid) {
      for (let x = -w / 2 + 2; x < w / 2; x += 2)
        box('floor seam', [0.015, 0.003, depth], [x, 0.003, 0]);
      for (let z = -depth / 2 + 2; z < depth / 2; z += 2)
        box('floor seam', [w, 0.003, 0.015], [0, 0.003, z]);
    }
    if (d.turf) {
      const t = turfBounds(r, d);
      box('training turf', [t.width, 0.012, t.depth], [t.x, 0.012, t.z], turf);
      for (let z = -t.depth / 2 + 0.4; z < t.depth / 2 - 0.1; z += 1)
        for (const side of [-1, 1])
          box(
            'metre track marking',
            [0.24, 0.004, 0.04],
            [t.x + side * (t.width / 2 - 0.16), 0.021, t.z + z],
            marking,
          );
    }
    mirrorEnabled = d.mirrorWall !== 'none';
    if (d.mirrorWall !== 'none') {
      const side = d.mirrorWall,
        length = sideWidth(side) - 0.2,
        count = Math.ceil(length / 2),
        mh = Math.min(2.45, h * 0.42);
      for (let i = 0; i < count; i++)
        panel(
          'mirror panel',
          side,
          length / count - 0.025,
          mh,
          mh / 2 + 0.12,
          mirror,
          -length / 2 + (length / count) * (i + 0.5),
          0.14,
        );
      panel('mirror lower light', side, length, 0.035, 0.08, light, 0, 0.16);
      panel(
        'mirror upper light',
        side,
        length,
        0.045,
        mh + 0.18,
        light,
        0,
        0.16,
      );
      reflection.mirrorPlane =
        side === 'back'
          ? new Plane(0, 0, -1, depth / 2 - 0.14)
          : side === 'front'
            ? new Plane(0, 0, 1, depth / 2 - 0.14)
            : side === 'left'
              ? new Plane(1, 0, 0, w / 2 - 0.14)
              : new Plane(-1, 0, 0, w / 2 - 0.14);
    }
    if (layout.mural) {
      const ah = h * d.artHeight,
        ay = ah / 2 + 0.1 + (h - ah - 0.2) * d.artPosition;
      panel(
        'statement wall art',
        d.artWall,
        (sideWidth(d.artWall) - 0.3) * d.artWidth,
        ah,
        ay,
        art,
        0,
        0.18,
      );
    }
    if (d.sign && d.signText)
      panel(
        'gym name sign',
        d.signWall,
        Math.min(12, sideWidth(d.signWall) * 0.8),
        1.2,
        h * 0.72,
        sign,
        0,
        0.22,
      );
    if (d.windows !== 'none') {
      const side = d.windows,
        length = sideWidth(side),
        count = Math.max(1, Math.floor(length / 4));
      for (let i = 0; i < count; i++) {
        const offset = -length / 2 + (length / count) * (i + 0.5);
        panel(
          'window frame',
          side,
          2.8,
          h * 0.3,
          h * 0.72,
          structure,
          offset,
          0.19,
        );
        panel(
          'daylight window',
          side,
          2.62,
          h * 0.3 - 0.16,
          h * 0.72,
          glass,
          offset,
          0.2,
        );
      }
    }
    // A visible entry gives the first-person space a point of arrival.
    panel('entry frame', 'front', 2.3, 2.65, 1.325, structure, 0, 0.14);
    panel('entry glazing', 'front', 2.08, 2.43, 1.325, glass, 0, 0.15);
    panel('entry split', 'front', 0.055, 2.45, 1.325, structure, 0, 0.17);
    if (d.ceiling !== 'open') {
      box('ceiling surface', [w, 0.12, depth], [0, h + 0.07, 0], roof, cutaway);
      const step = d.ceiling === 'tiles' ? 1.2 : 4;
      for (let z = -depth / 2; z <= depth / 2; z += step)
        box(
          'ceiling transverse structure',
          [w, d.ceiling === 'tiles' ? 0.025 : 0.22, 0.045],
          [0, h - 0.09, z],
          structure,
          cutaway,
        );
      for (let x = -w / 2; x <= w / 2; x += d.ceiling === 'tiles' ? 1.2 : 5)
        box(
          'ceiling longitudinal structure',
          [0.045, d.ceiling === 'tiles' ? 0.025 : 0.2, depth],
          [x, h - 0.09, 0],
          structure,
          cutaway,
        );
      if (d.ceiling === 'industrial') {
        // Corrugated roof seams and ventilation ducts provide scale overhead.
        for (let x = -w / 2; x < w / 2; x += 0.6)
          box(
            'roof corrugation',
            [0.025, 0.04, depth],
            [x, h - 0.015, 0],
            structure,
            cutaway,
          );
        for (const x of [-w * 0.3, w * 0.3]) {
          const duct = MeshBuilder.CreateCylinder(
            'ventilation duct',
            { diameter: 0.38, height: depth - 1, tessellation: 12 },
            scene,
          );
          duct.rotation.x = Math.PI / 2;
          duct.position.set(x, h - 0.38, 0);
          duct.material = roof;
          duct.parent = cutaway;
          duct.isPickable = false;
        }
      }
    }
    const cols = Math.max(1, Math.floor(w / 6)),
      rows = Math.max(1, Math.floor(depth / 6));
    for (let col = 0; col < cols; col++)
      for (let row = 0; row < rows; row++) {
        const x = -w / 2 + (w / cols) * (col + 0.5),
          z = -depth / 2 + (depth / rows) * (row + 0.5),
          y = h - 0.55;
        const fw = Math.min(4.6, w / cols - 1),
          fd = Math.min(4.6, depth / rows - 1);
        if (d.fixtures === 'frames') {
          for (const dz of [-fd / 2, fd / 2])
            box(
              'suspended LED frame',
              [fw, 0.045, 0.065],
              [x, y, z + dz],
              light,
              cutaway,
            );
          for (const dx of [-fw / 2, fw / 2])
            box(
              'suspended LED frame',
              [0.065, 0.045, fd],
              [x + dx, y, z],
              light,
              cutaway,
            );
          for (const dx of [-fw / 2, fw / 2])
            box(
              'light suspension',
              [0.014, 0.43, 0.014],
              [x + dx, h - 0.3, z],
              structure,
              cutaway,
            );
        } else if (d.fixtures === 'panels') {
          box(
            'ceiling light housing',
            [1.3, 0.07, 2.5],
            [x, h - 0.15, z],
            structure,
            cutaway,
          );
          box(
            'white light panel',
            [1.2, 0.035, 2.4],
            [x, h - 0.2, z],
            white,
            cutaway,
          );
        } else {
          box(
            'linear white light',
            [0.11, 0.045, fd],
            [x - 0.16, y, z],
            white,
            cutaway,
          );
          box(
            'linear accent light',
            [0.045, 0.04, fd],
            [x + 0.16, y, z],
            light,
            cutaway,
          );
        }
      }
    // Coalesce static opaque room parts by parent/material to keep phone draw calls low.
    for (const parent of [roomRoot, cutaway]) {
      const groups = new Map<StandardMaterial, Mesh[]>();
      for (const m of parent.getChildMeshes() as Mesh[]) {
        const mat = m.material as StandardMaterial;
        if (mat === mirror || mat === art || mat === sign) continue;
        if (!groups.has(mat)) groups.set(mat, []);
        groups.get(mat)!.push(m);
      }
      for (const parts of groups.values()) {
        const merged = Mesh.MergeMeshes(parts, true, true);
        if (merged) {
          merged.parent = parent;
          merged.isPickable = false;
          merged.receiveShadows = true;
        }
      }
    }
    setMode(mode);
    refreshReflections();
  }
  return {
    update,
    setMode,
    refreshReflections,
    setCeilingVisible(value: boolean) {
      showCeiling = value;
      setMode(mode);
    },
  };
}
