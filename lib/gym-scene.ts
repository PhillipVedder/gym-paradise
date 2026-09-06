import {
  Engine,
  Scene,
  Color3,
  Color4,
  Vector3,
  Quaternion,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  DynamicTexture,
  Texture,
  ArcRotateCamera,
  UniversalCamera,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  TransformNode,
  GlowLayer,
  PBRMaterial,
  ShadowGenerator,
  type Material,
  CubeTexture,
} from '@babylonjs/core';
import {
  EQUIPMENT,
  canPlace,
  walkable,
  type EquipmentKind,
  type GymLayout,
  type Mode,
} from './gym-data';
import { roomSize, designFor } from './gym-design';
import { createGymRoom } from './gym-room';
import { buildExtraEquipment } from './equipment-models';
type Callbacks = {
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, z: number) => void;
  onReady: () => void;
  onInspect?: (id: string) => void;
};
export type GymSceneApi = ReturnType<typeof createGymScene>;

export function createGymScene(
  canvas: HTMLCanvasElement,
  callbacks: Callbacks,
) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const engine = new Engine(
    canvas,
    true,
    {
      preserveDrawingBuffer: true,
      stencil: true,
      powerPreference: 'high-performance',
    },
    false,
  );
  engine.setHardwareScalingLevel(
    Math.max(1, devicePixelRatio / (coarse ? 1.35 : 1.7)),
  );
  const scene = new Scene(engine);
  scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(
    '/environments/studio.env',
    scene,
  );
  scene.environmentIntensity = 0.65;
  scene.clearColor = new Color4(0.07, 0.08, 0.095, 1);
  scene.ambientColor = new Color3(0.3, 0.3, 0.35);
  scene.imageProcessingConfiguration.exposure = 1.25;
  scene.imageProcessingConfiguration.contrast = 1.15;
  const hemi = new HemisphericLight(
    'ceiling fill',
    new Vector3(0, 1, 0),
    scene,
  );
  hemi.intensity = 1.15;
  hemi.groundColor = new Color3(0.25, 0.24, 0.3);
  const key = new DirectionalLight(
    'soft daylight',
    new Vector3(-0.4, -1, 0.5),
    scene,
  );
  key.position.set(4, 12, -6);
  key.intensity = 2.5;
  key.shadowMinZ = 1;
  key.shadowMaxZ = 55;
  key.autoCalcShadowZBounds = true;
  const shadows = new ShadowGenerator(coarse ? 1024 : 2048, key);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = coarse
    ? ShadowGenerator.QUALITY_LOW
    : ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.001;
  shadows.normalBias = 0.03;
  shadows.setDarkness(0.28);
  const rim = new PointLight('violet wash', new Vector3(0, 4, 10), scene);
  rim.diffuse = new Color3(0.65, 0.3, 1);
  rim.intensity = 1.4;
  rim.range = 20;
  const cool = new PointLight('cyan wash', new Vector3(8, 4, -5), scene);
  cool.diffuse = new Color3(0.15, 0.8, 1);
  cool.intensity = 0.8;
  cool.range = 16;
  const glow = new GlowLayer('light bloom', scene, {
    blurKernelSize: 32,
    mainTextureRatio: coarse ? 0.25 : 0.4,
  });
  glow.intensity = 0.38;
  const material = (
    name: string,
    color: string,
    spec = 0.12,
    emission?: string,
  ) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor = new Color3(spec, spec, spec);
    if (emission) m.emissiveColor = Color3.FromHexString(emission);
    return m;
  };
  const pbr = (
    name: string,
    color: string,
    metallic: number,
    roughness: number,
  ) => {
    const m = new PBRMaterial(name, scene);
    m.albedoColor = Color3.FromHexString(color);
    m.metallic = metallic;
    m.roughness = roughness;
    return m;
  };
  const steel = pbr('powder coated graphite', '#3f454e', 0.55, 0.38),
    rubber = pbr('stitched upholstery', '#12161d', 0, 0.79),
    silver = pbr('brushed steel', '#c4ccd1', 0.9, 0.23),
    plates = pbr('rubber coated plates', '#25292f', 0.2, 0.68),
    yellow = pbr('adjustment handles', '#cfb75b', 0.25, 0.42);
  const floorMat = material('rubber flooring', '#d0d1d6', 0.08);
  const noise = new DynamicTexture(
    'rubber grain',
    { width: 256, height: 256 },
    scene,
    false,
  );
  const ctx = noise.getContext();
  let seed = 317;
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      seed = (seed * 16807) % 2147483647;
      const n = 175 + (seed % 60);
      ctx.fillStyle = `rgb(${n},${n + 1},${n + 4})`;
      ctx.fillRect(x, y, 1, 1);
    }
  noise.update();
  noise.wrapU = noise.wrapV = Texture.WRAP_ADDRESSMODE;
  noise.uScale = 18;
  noise.vScale = 22;
  floorMat.diffuseTexture = noise;
  const floor = MeshBuilder.CreateGround(
    'gym floor',
    { width: 1, height: 1 },
    scene,
  );
  floor.material = floorMat;
  floor.receiveShadows = true;
  const objects = new Map<string, TransformNode>();
  let layout: GymLayout;
  let mode: Mode = 'build';
  let selected: string | null = null;
  const box = (
    name: string,
    size: number[],
    pos: number[],
    mat: Material,
    parent?: TransformNode,
  ) => {
    const m = MeshBuilder.CreateBox(
      name,
      { width: size[0], height: size[1], depth: size[2] },
      scene,
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.material = mat;
    if (parent) m.parent = parent;
    return m;
  };
  const beam = (
    name: string,
    a: number[],
    b: number[],
    width: number,
    mat: Material,
    parent?: TransformNode,
    round = false,
  ) => {
    const av = Vector3.FromArray(a),
      bv = Vector3.FromArray(b);
    const dir = bv.subtract(av);
    const mesh = round
      ? MeshBuilder.CreateCylinder(
          name,
          { height: dir.length(), diameter: width, tessellation: 12 },
          scene,
        )
      : MeshBuilder.CreateBox(
          name,
          { width, height: dir.length(), depth: width },
          scene,
        );
    mesh.position.copyFrom(av.add(bv).scale(0.5));
    dir.normalize();
    const dot = Vector3.Dot(Vector3.Up(), dir);
    if (dot < 0.9999) {
      const axis =
        dot < -0.9999
          ? Vector3.Right()
          : Vector3.Cross(Vector3.Up(), dir).normalize();
      mesh.rotationQuaternion = Quaternion.RotationAxis(
        axis,
        Math.acos(Math.max(-1, Math.min(1, dot))),
      );
    }
    mesh.material = mat;
    if (parent) mesh.parent = parent;
    return mesh;
  };
  const plate = (
    pos: number[],
    diameter: number,
    thickness: number,
    parent: TransformNode,
    axis: 'x' | 'z' = 'x',
  ) => {
    const m = MeshBuilder.CreateCylinder(
      'weight plate',
      { height: thickness, diameter, tessellation: 20 },
      scene,
    );
    m.position.set(...(pos as [number, number, number]));
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    else m.rotation.x = Math.PI / 2;
    m.material = plates;
    m.parent = parent;
    const cap = MeshBuilder.CreateCylinder(
      'plate hub',
      {
        height: thickness + 0.015,
        diameter: diameter * 0.23,
        tessellation: 12,
      },
      scene,
    );
    cap.position.copyFrom(m.position);
    cap.rotation.copyFrom(m.rotation);
    cap.material = silver;
    cap.parent = parent;
  };
  const equipmentFinishes = new Map<string, PBRMaterial>();
  function finish(base: PBRMaterial, color: string) {
    const key = `${base.name}:${color}`;
    let mat = equipmentFinishes.get(key);
    if (!mat) {
      mat = base.clone(key)!;
      mat.albedoColor = Color3.FromHexString(color);
      equipmentFinishes.set(key, mat);
    }
    return mat;
  }
  function equipment(
    kind: EquipmentKind,
    id: string,
    frame: string,
    upholstery: string,
  ) {
    const frameMaterial = finish(steel, frame),
      padMaterial = finish(rubber, upholstery);
    const root = new TransformNode(id, scene);
    root.metadata = { kind, frame, upholstery };
    const b = (size: number[], p: number[], m: Material = steel) =>
      box('frame', size, p, m, root);
    const bar = (
      a: number[],
      v: number[],
      w = 0.09,
      m: Material = steel,
      round = false,
    ) => beam('support', a, v, w, m, root, round);
    const seat = (y = 0.65, z = -0.35) => {
      b([0.53, 0.16, 0.65], [0, y, z], rubber);
      bar([0, 0.15, z], [0, y, z], 0.12);
    };
    const stack = (x: number, z: number, height = 1.8) => {
      b([0.5, height, 0.25], [x, height / 2 + 0.12, z], steel);
      for (let y = 0.28; y < height - 0.2; y += 0.1)
        b([0.47, 0.072, 0.32], [x, y, z], plates);
      for (const side of [-1, 1])
        bar(
          [x + side * 0.29, 0.12, z],
          [x + side * 0.29, height + 0.2, z],
          0.036,
          silver,
          true,
        );
      b([0.09, 0.04, 0.12], [x, height * 0.5, z - 0.22], yellow);
    };
    if (
      buildExtraEquipment(kind, {
        scene,
        root,
        b,
        bar,
        seat,
        stack,
        plate,
        steel,
        rubber,
        silver,
        plates,
        yellow,
      })
    ) {
    } else if (kind === 'bench') {
      bar([0, 0.17, -0.72], [0, 0.17, 0.66], 0.13);
      bar([-0.4, 0.12, -0.6], [0.4, 0.12, -0.6], 0.12);
      bar([-0.4, 0.12, 0.6], [0.4, 0.12, 0.6], 0.12);
      seat(0.5, -0.53);
      const back = b([0.47, 0.15, 1.0], [0, 0.75, 0.12], rubber);
      back.rotation.x = -0.55;
      bar([0, 0.2, 0.45], [0, 0.9, 0.43], 0.1);
      b([0.18, 0.05, 0.1], [0.18, 0.45, -0.32], yellow);
    } else if (kind === 'rack') {
      for (const x of [-0.86, 0.86])
        for (const z of [-0.76, 0.76]) {
          b([0.11, 2.65, 0.11], [x, 1.35, z]);
          b([0.3, 0.06, 0.28], [x, 0.06, z]);
          for (let y = 0.65; y < 2.2; y += 0.15)
            b([0.015, 0.036, 0.045], [x + 0.065, y, z], silver);
        }
      for (const z of [-0.76, 0.76])
        bar([-0.86, 2.64, z], [0.86, 2.64, z], 0.1);
      for (const x of [-0.86, 0.86]) {
        bar([x, 0.48, -0.8], [x, 0.48, 0.8], 0.075, silver);
        bar([x, 2.65, -0.76], [x, 2.65, 0.76], 0.1);
      }
      bar([-1, 1.65, -0.2], [1, 1.65, -0.2], 0.05, silver, true);
      for (const x of [-0.86, 0.86]) {
        plate([x, 1.65, -0.2], 0.49, 0.11, root);
        plate([x, 1.65, -0.2], 0.35, 0.16, root);
      }
    } else if (kind === 'dumbbells') {
      for (const x of [-1.65, 1.65]) {
        bar([x, 0.08, -0.28], [x, 1.02, 0.25], 0.08);
        bar([x, 0.08, 0.33], [x, 0.75, -0.2], 0.08);
        b([0.5, 0.05, 0.8], [x, 0.04, 0]);
      }
      for (const y of [0.53, 0.96]) {
        const z = y > 0.7 ? 0.16 : -0.17;
        b([3.7, 0.06, 0.38], [0, y, z]);
        for (let i = 0; i < 9; i++) {
          const x = -1.58 + i * 0.395;
          bar(
            [x, y + 0.12, z - 0.2],
            [x, y + 0.12, z + 0.2],
            0.04,
            silver,
            true,
          );
          plate([x, y + 0.12, z - 0.17], 0.16 + i * 0.014, 0.1, root, 'z');
          plate([x, y + 0.12, z + 0.17], 0.16 + i * 0.014, 0.1, root, 'z');
        }
      }
    } else if (kind === 'cable') {
      for (const x of [-1.45, 1.45]) {
        b([0.65, 0.1, 1.15], [x, 0.1, 0]);
        stack(x, 0.22, 2.1);
        bar([x, 0, -0.42], [x, 2.5, -0.42], 0.09);
        bar([x, 2.5, -0.42], [x, 2.5, 0.4], 0.09);
        bar([x, 2.26, -0.4], [x, 1.3, -0.55], 0.018, silver, true);
        b([0.17, 0.14, 0.18], [x, 1.5, -0.46], yellow);
        bar(
          [x - 0.12, 1.15, -0.57],
          [x + 0.12, 1.15, -0.57],
          0.04,
          rubber,
          true,
        );
      }
      bar([-1.5, 2.5, -0.35], [1.5, 2.5, -0.35], 0.13);
      bar([-0.55, 2.44, -0.43], [0.55, 2.44, -0.43], 0.04, silver, true);
    } else if (kind === 'legpress') {
      for (const x of [-0.8, 0.8]) {
        bar([x, 0.13, -1.2], [x, 0.13, 1.2], 0.15);
        bar([x, 0.23, -0.8], [x, 1.8, 1.1], 0.075, silver, true);
        bar([x, 0.14, 1.1], [x, 1.8, 1.1], 0.1);
      }
      seat(0.43, -0.85);
      const back = b([0.62, 0.13, 0.83], [0, 0.64, -0.7], rubber);
      back.rotation.x = -0.68;
      const sled = b([1.15, 0.13, 0.72], [0, 1.18, 0.27], steel);
      sled.rotation.x = -0.68;
      bar([-1, 1.05, 0.3], [1, 1.05, 0.3], 0.06, silver, true);
      for (const x of [-0.89, 0.89]) {
        plate([x, 1.05, 0.3], 0.55, 0.17, root);
        plate([x, 1.05, 0.3], 0.42, 0.23, root);
      }
    } else {
      b([1.35, 0.13, 1.55], [0, 0.12, 0]);
      seat(0.65, -0.38);
      if (kind === 'pulldown') {
        stack(0, 0.69, 1.65);
        for (const x of [-0.48, 0.48])
          bar([x, 0.16, 0.66], [x, 2.5, 0.66], 0.09);
        bar([0, 2.5, 0.7], [0, 2.5, -0.2], 0.12);
        bar([0, 2.5, -0.2], [0, 2.1, -0.2], 0.016, silver, true);
        bar([-0.65, 2, -0.2], [0, 2.13, -0.2], 0.036, silver, true);
        bar([0, 2.13, -0.2], [0.65, 2, -0.2], 0.036, silver, true);
        bar([-0.35, 0.9, -0.38], [0.35, 0.9, -0.38], 0.16, rubber, true);
      } else if (kind === 'chest') {
        const back = b([0.5, 0.15, 0.98], [0, 1.12, 0.27], rubber);
        back.rotation.x = -1.35;
        for (const side of [-1, 1]) {
          bar([side * 0.72, 0.15, 0.75], [side * 0.72, 1.95, 0.5], 0.12);
          bar([side * 0.72, 1.9, 0.5], [side * 0.87, 1.05, -0.65], 0.095);
          bar(
            [side * 0.87, 1.05, -0.65],
            [side * 0.4, 1.05, -0.65],
            0.04,
            silver,
            true,
          );
          bar(
            [side * 0.4, 0.93, -0.65],
            [side * 0.4, 1.16, -0.65],
            0.055,
            rubber,
            true,
          );
          bar(
            [side * 0.6, 1.3, 0.3],
            [side * 1.05, 1.3, 0.3],
            0.05,
            silver,
            true,
          );
          plate([side * 0.99, 1.3, 0.3], 0.5, 0.12, root);
        }
        bar([-0.72, 1.92, 0.5], [0.72, 1.92, 0.5], 0.1);
      } else {
        const chest = b([0.5, 0.14, 0.55], [0, 1.14, 0.02], rubber);
        chest.rotation.x = 0.4;
        for (const side of [-1, 1]) {
          bar([side * 0.6, 0.16, 0.6], [side * 0.6, 1.55, 0.6], 0.12);
          bar([side * 0.6, 1.5, 0.6], [side * 0.6, 0.9, -0.47], 0.09);
          bar(
            [side * 0.6, 0.9, -0.47],
            [side * 0.25, 0.9, -0.47],
            0.045,
            silver,
            true,
          );
          plate([side * 0.67, 0.75, 0.45], 0.45, 0.12, root);
        }
      }
    }
    const pieces = root.getChildMeshes() as Mesh[];
    for (const piece of pieces) {
      if (piece.material === steel) piece.material = frameMaterial;
      if (piece.material === rubber) piece.material = padMaterial;
    }
    const groups = new Map<Material, Mesh[]>();
    for (const m of pieces) {
      const mat = m.material as Material;
      if (!groups.has(mat)) groups.set(mat, []);
      groups.get(mat)!.push(m);
    }
    for (const parts of groups.values()) {
      const finishRole =
        parts[0].material === frameMaterial
          ? 'frame'
          : parts[0].material === padMaterial
            ? 'upholstery'
            : null;
      const merged = Mesh.MergeMeshes(parts, true, true);
      if (merged) {
        merged.parent = root;
        merged.metadata = { itemId: id, finish: finishRole };
        merged.receiveShadows = true;
        shadows.addShadowCaster(merged);
      }
    }
    // Keep every visual within its declared collision footprint.
    const ext = root.getHierarchyBoundingVectors(true);
    const e = EQUIPMENT[kind];
    const dx = ext.max.x - ext.min.x,
      dz = ext.max.z - ext.min.z;
    const scale = Math.min(1, (e.width - 0.05) / dx, (e.depth - 0.05) / dz);
    for (const mesh of root.getChildMeshes()) {
      mesh.position.x -= (ext.min.x + ext.max.x) / 2;
      mesh.position.z -= (ext.min.z + ext.max.z) / 2;
    }
    root.scaling.setAll(scale);
    return root;
  }
  const room = createGymRoom(scene, coarse);
  const buildCam = new ArcRotateCamera(
    'layout camera',
    -Math.PI / 2.5,
    0.64,
    34,
    new Vector3(0, 0, 1),
    scene,
  );
  buildCam.lowerRadiusLimit = 12;
  buildCam.upperRadiusLimit = 47;
  buildCam.lowerBetaLimit = 0.25;
  buildCam.upperBetaLimit = 1.1;
  buildCam.pinchPrecision = 50;
  buildCam.wheelPrecision = 16;
  buildCam.panningSensibility = 75;
  const walkCam = new UniversalCamera(
    'walk camera',
    new Vector3(1.7, 1.72, -9),
    scene,
  );
  walkCam.minZ = 0.08;
  walkCam.fov = 1.05;
  walkCam.setTarget(new Vector3(1.7, 1.72, 5));
  walkCam.inputs.clear();
  scene.activeCamera = buildCam;
  buildCam.attachControl(canvas, true);
  const selectionMat = material('selection', '#b374fa', 0, '#6c3693');
  selectionMat.alpha = 0.25;
  const footprint = MeshBuilder.CreateGround(
    'selected footprint',
    { width: 1, height: 1 },
    scene,
  );
  footprint.material = selectionMat;
  footprint.position.y = 0.036;
  footprint.isPickable = false;
  footprint.setEnabled(false);
  const keys = new Set<string>();
  let joystick = { x: 0, y: 0 };
  let looking: {
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    moved: number;
  } | null = null;
  let dragging: {
    id: string;
    x: number;
    z: number;
    lastX: number;
    lastZ: number;
  } | null = null;
  function select(id: string | null) {
    selected = id;
    const item = layout?.items.find((i) => i.id === id);
    footprint.setEnabled(!!item && mode === 'build');
    if (item) {
      const e = EQUIPMENT[item.kind];
      footprint.scaling.set(e.width + 0.35, 1, e.depth + 0.35);
      footprint.position.set(item.x, 0.036, item.z);
      footprint.rotation.y = item.rotation;
    }
  }
  const api = {
    setLayout(next: GymLayout) {
      const previousSize = layout ? roomSize(layout) : null;
      layout = next;
      const size = roomSize(next),
        design = designFor(next);
      floor.scaling.set(size.width, 1, size.depth);
      noise.uScale = size.width * 0.8;
      noise.vScale = size.depth * 0.8;
      floorMat.diffuseColor = Color3.FromHexString(design.floorColor);
      floorMat.specularColor =
        next.floor === 'concrete'
          ? new Color3(0.3, 0.3, 0.3)
          : new Color3(0.08, 0.08, 0.08);
      rim.diffuse = Color3.FromHexString(design.lightColor);
      rim.position.set(0, size.height * 0.65, size.depth * 0.38);
      cool.position.set(
        size.width * 0.35,
        size.height * 0.65,
        -size.depth * 0.2,
      );
      cool.diffuse =
        design.fixtures === 'panels'
          ? Color3.White()
          : new Color3(0.15, 0.8, 1);
      hemi.intensity = 1.15 * design.brightness;
      key.intensity = 2.5 * design.brightness;
      rim.intensity = 1.4 * design.brightness;
      cool.intensity = 0.8 * design.brightness;
      room.update(next);
      buildCam.upperRadiusLimit = Math.max(size.width, size.depth) * 2.1;
      if (
        !previousSize ||
        previousSize.width !== size.width ||
        previousSize.depth !== size.depth
      ) {
        buildCam.radius =
          Math.max(size.width, size.depth) * (coarse ? 1.55 : 1.35);
        buildCam.setTarget(new Vector3(0, 0, 0));
      }
      const ids = new Set(next.items.map((i) => i.id));
      for (const [id, node] of objects)
        if (!ids.has(id)) {
          for (const mesh of node.getChildMeshes())
            shadows.removeShadowCaster(mesh);
          node.dispose(false);
          objects.delete(id);
        }
      for (const item of next.items) {
        let node = objects.get(item.id);
        const frame = item.frameColor || design.frameColor,
          upholstery = item.upholsteryColor || design.upholsteryColor;
        if (node && node.metadata?.kind !== item.kind) {
          for (const mesh of node.getChildMeshes())
            shadows.removeShadowCaster(mesh);
          node.dispose(false);
          objects.delete(item.id);
          node = undefined;
        }
        if (!node) {
          node = equipment(item.kind, item.id, frame, upholstery);
          objects.set(item.id, node);
        }
        if (
          node.metadata.frame !== frame ||
          node.metadata.upholstery !== upholstery
        ) {
          for (const mesh of node.getChildMeshes()) {
            if (mesh.metadata?.finish === 'frame')
              mesh.material = finish(steel, frame);
            if (mesh.metadata?.finish === 'upholstery')
              mesh.material = finish(rubber, upholstery);
          }
          node.metadata.frame = frame;
          node.metadata.upholstery = upholstery;
        }
        node.position.set(item.x, 0, item.z);
        node.rotation.y = item.rotation;
      }
      const usedMaterials = new Set(scene.meshes.map((m) => m.material));
      for (const [key, mat] of equipmentFinishes)
        if (!usedMaterials.has(mat)) {
          mat.dispose();
          equipmentFinishes.delete(key);
        }
      if (!walkable(walkCam.position.x, walkCam.position.z, next.items, size))
        positionWalker();
      select(selected);
      room.refreshReflections([footprint]);
    },
    setMode(next: Mode) {
      mode = next;
      keys.clear();
      joystick = { x: 0, y: 0 };
      looking = null;
      buildCam.detachControl();
      room.setMode(next);
      scene.activeCamera = next === 'build' ? buildCam : walkCam;
      if (next === 'build') buildCam.attachControl(canvas, true);
      else if (
        layout &&
        !walkable(
          walkCam.position.x,
          walkCam.position.z,
          layout.items,
          roomSize(layout),
        )
      )
        positionWalker();
      select(selected);
    },
    select,
    setCeilingVisible: (value: boolean) => room.setCeilingVisible(value),
    joystick(x: number, y: number) {
      joystick = { x, y };
    },
    resetView() {
      if (mode === 'build') {
        buildCam.alpha = -Math.PI / 2.5;
        buildCam.beta = 0.64;
        buildCam.radius =
          Math.max(roomSize(layout).width, roomSize(layout).depth) *
          (coarse ? 1.55 : 1.35);
        buildCam.setTarget(new Vector3(0, 0, 0));
      } else {
        positionWalker();
        walkCam.rotation.set(0, 0, 0);
      }
    },
    zoom(delta: number) {
      buildCam.radius = Math.max(
        12,
        Math.min(buildCam.upperRadiusLimit || 47, buildCam.radius + delta),
      );
    },
    async capture() {
      scene.render();
      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );
    },
    dispose() {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel);
      observer.disconnect();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
  function positionWalker() {
    if (!layout) return;
    const size = roomSize(layout);
    for (let z = -size.depth / 2 + 1; z < size.depth / 2 - 0.5; z += 0.5)
      for (let x = 0; x < size.width; x += 0.5) {
        const candidateX =
          x === 0 ? 0 : (Math.ceil(x) * (x % 1 === 0 ? 1 : -1)) / 2;
        if (walkable(candidateX, z, layout.items, size)) {
          walkCam.position.set(candidateX, 1.72, z);
          return;
        }
      }
  }
  function floorPoint(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return scene.pick(
      e.clientX - rect.left,
      e.clientY - rect.top,
      (m) => m === floor,
    )?.pickedPoint;
  }
  function pointerDown(e: PointerEvent) {
    if (mode === 'explore') {
      if (!looking) {
        looking = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          startX: e.clientX,
          startY: e.clientY,
          moved: 0,
        };
        canvas.setPointerCapture(e.pointerId);
      }
      return;
    }
    if (e.button !== 0) return;
    const r = canvas.getBoundingClientRect();
    const hit = scene.pick(
      e.clientX - r.left,
      e.clientY - r.top,
      (m) => !!m.metadata?.itemId,
    );
    const id = hit?.pickedMesh?.metadata?.itemId as string | undefined;
    if (id) {
      callbacks.onSelect(id);
      select(id);
      const item = layout.items.find((i) => i.id === id);
      const point = floorPoint(e);
      if (item && point) {
        dragging = {
          id,
          x: point.x - item.x,
          z: point.z - item.z,
          lastX: item.x,
          lastZ: item.z,
        };
        buildCam.detachControl();
        canvas.setPointerCapture(e.pointerId);
      }
    }
  }
  function pointerMove(e: PointerEvent) {
    if (mode === 'explore' && looking?.id === e.pointerId) {
      looking.moved += Math.hypot(e.clientX - looking.x, e.clientY - looking.y);
      walkCam.rotation.y += (e.clientX - looking.x) * 0.004;
      walkCam.rotation.x = Math.max(
        -1.1,
        Math.min(1.1, walkCam.rotation.x + (e.clientY - looking.y) * 0.003),
      );
      looking.x = e.clientX;
      looking.y = e.clientY;
    } else if (dragging) {
      const p = floorPoint(e);
      const item = layout.items.find((i) => i.id === dragging!.id);
      if (!p || !item) return;
      const x = Math.round((p.x - dragging.x) * 2) / 2,
        z = Math.round((p.z - dragging.z) * 2) / 2;
      const node = objects.get(item.id)!;
      if (canPlace({ ...item, x, z }, layout.items, roomSize(layout))) {
        node.position.x = x;
        node.position.z = z;
        footprint.position.x = x;
        footprint.position.z = z;
        dragging.lastX = x;
        dragging.lastZ = z;
      }
    }
  }
  function pointerUp(e: PointerEvent) {
    if (looking?.id === e.pointerId) {
      if (looking.moved < 8) {
        const r = canvas.getBoundingClientRect();
        const hit = scene.pick(
          e.clientX - r.left,
          e.clientY - r.top,
          (m) => !!m.metadata?.itemId,
        );
        if (hit?.pickedMesh && hit.distance < 5)
          callbacks.onInspect?.(hit.pickedMesh.metadata.itemId);
      }
      looking = null;
    }
    if (dragging) {
      callbacks.onMove(dragging.id, dragging.lastX, dragging.lastZ);
      dragging = null;
      buildCam.attachControl(canvas, true);
    }
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  }
  function pointerCancel(e: PointerEvent) {
    looking = null;
    if (dragging) {
      const item = layout.items.find((i) => i.id === dragging!.id);
      if (item) {
        objects.get(item.id)?.position.set(item.x, 0, item.z);
        select(selected);
      }
      dragging = null;
      if (mode === 'build') buildCam.attachControl(canvas, true);
    }
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  }
  function keyDown(e: KeyboardEvent) {
    if (
      document.querySelector('[role="dialog"]') ||
      (e.target as HTMLElement).closest(
        'input,textarea,select,button,[role="menu"]',
      )
    )
      return;
    if (
      mode === 'explore' &&
      [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.code)
    ) {
      e.preventDefault();
      keys.add(e.code);
    }
  }
  function keyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function clearInputs() {
    keys.clear();
    joystick = { x: 0, y: 0 };
    looking = null;
  }
  function visibility() {
    clearInputs();
    if (document.hidden) engine.stopRenderLoop();
    else engine.runRenderLoop(render);
  }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', clearInputs);
  document.addEventListener('visibilitychange', visibility);
  function render() {
    if (document.querySelector('[role="dialog"]')) {
      keys.clear();
      joystick = { x: 0, y: 0 };
    }
    if (mode === 'explore' && layout) {
      const dt = Math.min(engine.getDeltaTime() / 1000, 0.045);
      const forward =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
        joystick.y;
      const strafe =
        (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + joystick.x;
      const len = Math.max(1, Math.hypot(forward, strafe));
      const yaw = walkCam.rotation.y;
      const dx =
          ((Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * dt * 3) / len,
        dz =
          ((Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * dt * 3) / len;
      let { x, z } = walkCam.position;
      if (walkable(x + dx, z, layout.items, roomSize(layout))) x += dx;
      if (walkable(x, z + dz, layout.items, roomSize(layout))) z += dz;
      walkCam.position.x = x;
      walkCam.position.z = z;
      if (keys.has('ArrowLeft')) walkCam.rotation.y -= dt * 1.5;
      if (keys.has('ArrowRight')) walkCam.rotation.y += dt * 1.5;
    }
    scene.render();
  }
  const observer = new ResizeObserver(() => {
    engine.resize();
    if (mode === 'build' && canvas.clientWidth < 600)
      buildCam.radius = Math.max(
        buildCam.radius,
        Math.max(roomSize(layout).width, roomSize(layout).depth) * 1.5,
      );
  });
  observer.observe(canvas);
  engine.runRenderLoop(render);
  scene.executeWhenReady(callbacks.onReady);
  return api;
}
