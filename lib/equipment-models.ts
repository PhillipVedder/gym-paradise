import {
  MeshBuilder,
  Vector3,
  type Material,
  type Mesh,
  type Scene,
  type TransformNode,
} from '@babylonjs/core';
import type { EquipmentKind } from './gym-data';
type Helpers = {
  scene: Scene;
  root: TransformNode;
  b: (size: number[], p: number[], m?: Material) => Mesh;
  bar: (
    a: number[],
    v: number[],
    w?: number,
    m?: Material,
    round?: boolean,
  ) => Mesh;
  seat: (y?: number, z?: number) => void;
  stack: (x: number, z: number, height?: number) => void;
  plate: (
    pos: number[],
    diameter: number,
    thickness: number,
    parent: TransformNode,
    axis?: 'x' | 'z',
  ) => void;
  steel: Material;
  rubber: Material;
  silver: Material;
  plates: Material;
  yellow: Material;
};
/** Original visual approximations of commercial machine families. No manufacturer mesh or logo. */
export function buildExtraEquipment(kind: EquipmentKind, h: Helpers) {
  const {
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
  } = h;
  const tube = (a: number[], v: number[], w = 0.07, m = steel) =>
    bar(a, v, w, m, true);
  const pad = (size: number[], p: number[], angle = 0) => {
    const m = b(size, p, rubber);
    m.rotation.x = angle;
    return m;
  };
  const base = (w = 1.4, d = 1.6) => {
    for (const x of [-w / 2, w / 2]) {
      bar([x, 0.12, -d / 2], [x, 0.12, d / 2], 0.12);
      for (const z of [-d / 2, d / 2])
        b([0.22, 0.06, 0.3], [x, 0.05, z], rubber);
    }
    bar([-w / 2, 0.12, d / 2], [w / 2, 0.12, d / 2], 0.12);
  };
  const back = (y = 1, z = 0.35) => pad([0.52, 0.12, 0.86], [0, y, z], -1.38);
  const axle = (x: number, y: number, z: number) => {
    plate([x, y, z], 0.16, 0.065, root);
  };
  const hand = (a: number[], v: number[]) => tube(a, v, 0.045, rubber);
  if (kind === 'smith') {
    base(2.1, 1.45);
    for (const x of [-1, 1]) {
      bar([x, 0.14, 0.5], [x, 2.65, 0.5], 0.13);
      tube([x, 0.14, -0.3], [x, 2.6, -0.3], 0.048, silver);
      for (let y = 0.4; y < 2.35; y += 0.2)
        b([0.08, 0.045, 0.12], [x, y, -0.2], silver);
      b([0.18, 0.24, 0.18], [x, 1.45, -0.3], silver);
      tube([x, 1.4, -0.3], [x * 1.2, 1.4, -0.3], 0.06, silver);
      plate([x * 1.11, 1.4, -0.3], 0.46, 0.13, root);
      for (const y of [0.5, 1, 1.5]) {
        tube([x, y, 0.5], [x * 1.2, y, 0.5], 0.05, silver);
        plate([x * 1.13, y, 0.5], 0.38, 0.09, root);
      }
    }
    bar([-1, 2.65, 0.5], [1, 2.65, 0.5], 0.16);
    tube([-1.25, 1.4, -0.3], [1.25, 1.4, -0.3], 0.035, silver);
  } else if (kind === 'hack') {
    base(1.7, 2.5);
    for (const x of [-0.68, 0.68]) {
      tube([x, 0.3, -1], [x, 2.25, 1], 0.065, silver);
      bar([x, 0.15, 1], [x, 2.25, 1], 0.13);
    }
    pad([0.7, 0.16, 1.18], [0, 1.4, 0.3], -0.76);
    const foot = b([1.25, 0.1, 0.75], [0, 0.34, -0.78], steel);
    foot.rotation.x = -0.28;
    for (const x of [-0.35, 0.35]) {
      pad([0.27, 0.18, 0.42], [x, 1.98, 0.6]);
      hand([x, 1.9, 0.2], [x, 1.65, 0.2]);
      tube([x, 1.4, 0.6], [Math.sign(x) * 0.93, 1.4, 0.6], 0.065, silver);
      plate([Math.sign(x) * 0.87, 1.4, 0.6], 0.5, 0.16, root);
    }
    bar([-0.68, 2.24, 1], [0.68, 2.24, 1], 0.12);
  } else if (kind === 'crossover') {
    for (const x of [-2.1, 2.1]) {
      b([0.6, 0.1, 1.1], [x, 0.1, 0]);
      stack(x, 0.25, 2);
      tube([x, 0.2, -0.35], [x, 2.4, -0.35], 0.06, silver);
      b([0.2, 0.2, 0.15], [x, 1.3, -0.35]);
      tube([x, 2.3, -0.34], [x * 0.87, 1.25, -0.55], 0.012, silver);
      hand([x * 0.87 - 0.12, 1.2, -0.55], [x * 0.87 + 0.12, 1.2, -0.55]);
    }
    bar([-2.1, 2.4, 0.2], [2.1, 2.4, 0.2], 0.14);
    tube([-0.65, 2.35, 0.13], [0.65, 2.35, 0.13], 0.04, silver);
  } else if (
    [
      'legextension',
      'legcurl',
      'pecdeck',
      'abductor',
      'lateral',
      'pullover',
      'shoulder',
      'assisted',
    ].includes(kind)
  ) {
    base(1.35, kind === 'legcurl' ? 2 : 1.65);
    stack(
      kind === 'legcurl' ? 0.64 : 0.58,
      0.62,
      kind === 'assisted' ? 2.05 : 1.55,
    );
    if (kind === 'legcurl') {
      pad([0.68, 0.18, 1.48], [-0.15, 0.75, -0.2], 0.1);
      for (const z of [-0.8, 0.55])
        bar([-0.15, 0.15, z], [-0.15, 0.72, z], 0.1);
      tube([-0.65, 0.45, -0.88], [0.38, 0.45, -0.88], 0.21, rubber);
      bar([0.48, 0.75, -0.4], [0.48, 0.42, -0.88], 0.085);
      hand([-0.52, 0.73, 0.65], [-0.52, 0.75, 0.9]);
      hand([0.18, 0.73, 0.65], [0.18, 0.75, 0.9]);
      axle(0.5, 0.75, -0.4);
    } else if (kind === 'assisted') {
      for (const x of [-0.65, 0.65]) {
        bar([x, 0.15, 0.6], [x, 2.65, 0.6], 0.1);
        bar([x, 0.7, 0.1], [x, 1.2, -0.6], 0.09);
        hand([x, 1.2, -0.6], [x, 1.2, -0.86]);
        b([0.33, 0.1, 0.45], [x, 0.36, -0.55]);
      }
      pad([0.55, 0.14, 0.5], [0, 1, -0.15]);
      bar([0, 0.14, 0.4], [0, 1, 0.1], 0.09);
      tube([-0.7, 2.6, -0.15], [0.7, 2.6, -0.15], 0.04, silver);
      for (const x of [-0.7, 0.7]) hand([x, 2.6, -0.15], [x, 2.52, -0.4]);
    } else {
      seat(0.62, -0.4);
      back();
      if (kind === 'legextension') {
        tube([-0.48, 0.35, -0.83], [0.48, 0.35, -0.83], 0.23, rubber);
        bar([0.48, 0.69, -0.38], [0.48, 0.35, -0.83], 0.09);
        axle(0.5, 0.68, -0.4);
        for (const x of [-0.4, 0.4]) hand([x, 0.65, -0.2], [x, 0.65, 0.12]);
      }
      if (kind === 'abductor') {
        for (const side of [-1, 1]) {
          const x = side * 0.43;
          bar([0, 0.43, -0.35], [x, 0.43, -0.75], 0.075);
          pad([0.18, 0.38, 0.3], [x, 0.74, -0.68]);
          b([0.25, 0.05, 0.3], [x, 0.23, -0.77]);
          hand([side * 0.42, 0.7, 0], [side * 0.42, 0.7, 0.25]);
        }
      }
      if (kind === 'pecdeck') {
        bar([0, 0.15, 0.48], [0, 2.2, 0.48], 0.12);
        for (const side of [-1, 1]) {
          tube([0, 2.15, 0.4], [side * 0.77, 1.85, -0.12], 0.075);
          bar([side * 0.77, 1.85, -0.12], [side * 0.8, 1.1, -0.22], 0.08);
          pad([0.2, 0.5, 0.17], [side * 0.8, 1.32, -0.26]);
          hand([side * 0.65, 1.3, -0.48], [side * 0.65, 1.72, -0.48]);
          axle(side * 0.18, 2.08, 0.4);
        }
      }
      if (kind === 'shoulder') {
        for (const side of [-1, 1]) {
          bar([side * 0.6, 0.15, 0.6], [side * 0.6, 1.86, 0.55], 0.12);
          bar([side * 0.6, 1.86, 0.55], [side * 0.8, 1.68, -0.45], 0.095);
          hand([side * 0.8, 1.68, -0.45], [side * 0.35, 1.68, -0.45]);
          tube([side * 0.65, 1.55, 0.25], [side * 1, 1.55, 0.25], 0.06, silver);
          plate([side * 0.95, 1.55, 0.25], 0.46, 0.16, root);
        }
      }
      if (kind === 'lateral') {
        for (const side of [-1, 1]) {
          bar([side * 0.3, 1.3, 0.3], [side * 0.72, 1.03, -0.15], 0.08);
          pad([0.3, 0.2, 0.34], [side * 0.68, 1.0, -0.2]);
          hand([side * 0.68, 1, -0.38], [side * 0.5, 0.83, -0.52]);
          axle(side * 0.3, 1.3, 0.3);
        }
      }
      if (kind === 'pullover') {
        for (const x of [-0.6, 0.6]) {
          bar([x, 0.1, 0.48], [x, 2, 0.48], 0.11);
          tube([x, 1.9, 0.48], [x, 1.95, -0.55], 0.08);
          pad([0.28, 0.18, 0.35], [x, 1.9, -0.5]);
        }
        tube([-0.6, 2, -0.6], [0.6, 2, -0.6], 0.05, silver);
      }
    }
  } else if (kind === 'calf') {
    base(1.1, 1.65);
    seat(0.55, 0.4);
    b([0.95, 0.1, 0.4], [0, 0.18, -0.55]);
    for (const x of [-0.3, 0.3]) pad([0.28, 0.15, 0.37], [x, 0.9, -0.25]);
    bar([0, 0.22, -0.75], [0, 0.83, -0.25], 0.12);
    tube([-0.65, 0.6, -0.58], [0.65, 0.6, -0.58], 0.06, silver);
    for (const x of [-0.53, 0.53]) plate([x, 0.6, -0.58], 0.46, 0.12, root);
    hand([-0.32, 1.06, -0.3], [0.32, 1.06, -0.3]);
  } else if (kind === 'hipthrust') {
    base(1.7, 2);
    pad([1.2, 0.22, 0.45], [0, 0.72, 0.65], -0.15);
    b([1.25, 0.09, 0.95], [0, 0.2, -0.5]);
    for (const x of [-0.72, 0.72]) {
      bar([x, 0.18, 0.6], [x, 0.72, 0.6], 0.1);
      bar([x, 0.35, 0.7], [x, 0.75, -0.22], 0.1);
      tube([x, 0.48, 0.1], [x * 1.28, 0.48, 0.1], 0.06, silver);
      plate([x * 1.2, 0.48, 0.1], 0.5, 0.1, root);
    }
    pad([1.3, 0.06, 0.24], [0, 0.73, -0.2]);
  } else if (kind === 'preacher') {
    base(1.0, 1.3);
    seat(0.48, 0.3);
    pad([0.94, 0.17, 0.67], [0, 0.98, -0.22], -0.5);
    bar([0, 0.15, -0.2], [0, 0.97, -0.2], 0.13);
    for (const x of [-0.45, 0.45]) bar([x, 0.15, -0.6], [x, 0.72, -0.6], 0.07);
    tube([-0.59, 0.78, -0.64], [0.59, 0.78, -0.64], 0.03, silver);
    for (const x of [-0.55, 0.55]) plate([x, 0.78, -0.64], 0.26, 0.075, root);
  } else if (kind === 'tbar') {
    base(1.2, 2.25);
    bar([0, 0.14, 1], [0, 0.62, -0.85], 0.12);
    bar([0, 0.2, 0.15], [0, 1.02, 0.15], 0.12);
    pad([0.65, 0.16, 0.65], [0, 1.12, 0.1], 0.62);
    tube([-0.58, 0.65, -0.48], [0.58, 0.65, -0.48], 0.045, silver);
    for (const x of [-0.43, 0.43]) b([0.32, 0.1, 0.5], [x, 0.36, 0.75]);
    tube([0, 0.35, -0.9], [0, 1.0, -0.9], 0.065, silver);
    const disk = MeshBuilder.CreateCylinder(
      'horizontal loading plate',
      { height: 0.13, diameter: 0.49, tessellation: 24 },
      scene,
    );
    disk.position.set(0, 0.55, -0.9);
    disk.material = plates;
    disk.parent = root;
  } else if (kind === 'beltsquat') {
    base(1.45, 1.8);
    for (const x of [-0.5, 0.5]) {
      b([0.48, 0.2, 1.55], [x, 0.32, 0]);
      tube([x, 0.4, 0.5], [x, 1.15, 0.5]);
      hand([x, 1.15, 0.5], [x, 1.15, 0]);
    }
    bar([0, 0.12, 0.7], [0, 0.3, -0.65], 0.1);
    tube([0, 0.3, -0.65], [0, 0.75, -0.65], 0.06, silver);
    for (const y of [0.4, 0.49]) {
      const disk = MeshBuilder.CreateCylinder(
        'belt squat plate',
        { height: 0.07, diameter: 0.48, tessellation: 24 },
        scene,
      );
      disk.position.set(0, y, -0.65);
      disk.material = plates;
      disk.parent = root;
    }
    tube([0, 0.35, 0], [0, 0.75, 0], 0.02, silver);
    pad([0.65, 0.07, 0.12], [0, 0.75, 0]);
  } else if (kind === 'treadmill') {
    b([0.9, 0.22, 2.18], [0, 0.18, 0]);
    b([0.69, 0.026, 1.86], [0, 0.3, -0.06], rubber);
    for (const x of [-0.46, 0.46]) {
      tube([x, 0.25, 0.7], [x, 1.4, 0.85], 0.075, silver);
      hand([x, 1.04, 0.6], [x, 1.04, -0.1]);
    }
    const console = b([0.87, 0.07, 0.47], [0, 1.38, 0.74]);
    console.rotation.x = 0.52;
    const screen = b([0.41, 0.012, 0.26], [0, 1.425, 0.71], silver);
    screen.rotation.x = 0.52;
    b([0.07, 0.025, 0.07], [0, 1.35, 0.5], yellow);
  } else if (kind === 'rower') {
    bar([0, 0.25, -1.15], [0, 0.25, 0.65], 0.12, silver);
    for (const z of [-1.13, 0.92]) bar([-0.36, 0.1, z], [0.36, 0.1, z], 0.1);
    pad([0.37, 0.12, 0.31], [0, 0.37, -0.4]);
    plate([0, 0.48, 0.85], 0.69, 0.32, root);
    for (const x of [-0.23, 0.23]) {
      const foot = b([0.19, 0.06, 0.37], [x, 0.33, 0.28], rubber);
      foot.rotation.x = -0.6;
    }
    tube([0, 0.54, 0.65], [0, 0.54, 0.17], 0.014, silver);
    hand([-0.24, 0.54, 0.17], [0.24, 0.54, 0.17]);
    tube([0, 0.48, 0.85], [0, 1.1, 0.65], 0.045);
    b([0.22, 0.04, 0.22], [0, 1.12, 0.65], silver);
  } else if (kind === 'bike' || kind === 'elliptical') {
    base(0.75, 1.3);
    plate([0, 0.48, 0.47], kind === 'bike' ? 0.66 : 0.51, 0.27, root);
    tube([0, 0.22, -0.55], [0, 0.8, 0.2], 0.08);
    tube([0, 0.8, 0.2], [0, 0.9, -0.48], 0.075);
    tube([0, 0.2, -0.1], [0, 1.08, -0.35], 0.05, silver);
    if (kind === 'bike') pad([0.28, 0.1, 0.36], [0, 1.13, -0.35]);
    for (const side of [-1, 1]) {
      const x = side * 0.35;
      tube([x, 0.4, 0.4], [x, 1.35, 0.65], 0.04, silver);
      hand([x, 1.35, 0.65], [x, 1.58, 0.5]);
      if (kind === 'elliptical') {
        bar([x, 0.15, -0.78], [x, 0.2, 0.56], 0.06, silver);
        b([0.2, 0.06, 0.51], [x, 0.2, -0.42], rubber);
      } else b([0.18, 0.06, 0.16], [x, 0.35, -0.15], rubber);
    }
    b([0.2, 0.035, 0.18], [0, 1.26, 0.57], silver);
  } else if (kind === 'stairs') {
    base(0.9, 1.55);
    for (let i = 0; i < 5; i++)
      b([0.8, 0.22, 0.34], [0, 0.18 + i * 0.22, -0.65 + i * 0.3], rubber);
    b([0.86, 0.98, 0.31], [0, 0.64, 0.64]);
    for (const x of [-0.5, 0.5]) {
      tube([x, 0.3, -0.6], [x, 1.27, -0.6], 0.06, silver);
      tube([x, 1.27, -0.6], [x, 2, 0.6], 0.06, silver);
    }
    b([0.51, 0.065, 0.32], [0, 1.87, 0.61], silver);
  } else if (kind === 'skierg') {
    base(0.8, 1.2);
    for (const x of [-0.35, 0.35]) {
      bar([x, 0.15, 0.4], [x, 2.22, 0.4], 0.07);
      tube([x, 2.2, 0.38], [x, 1.6, -0.1], 0.012, silver);
      hand([x - 0.11, 1.6, -0.1], [x + 0.11, 1.6, -0.1]);
    }
    plate([0, 0.52, 0.3], 0.58, 0.28, root);
    bar([-0.35, 2.22, 0.4], [0.35, 2.22, 0.4], 0.09);
    b([0.19, 0.05, 0.18], [0, 1.1, 0.24], silver);
  } else if (kind === 'sled') {
    for (const x of [-0.43, 0.43]) {
      bar([x, 0.1, -0.68], [x, 0.1, 0.68], 0.12);
      tube([x, 0.15, 0.55], [x, 1.22, 0.55], 0.065, silver);
    }
    bar([-0.43, 0.15, 0], [0.43, 0.15, 0], 0.14);
    tube([0, 0.16, 0], [0, 0.85, 0], 0.05, silver);
    for (let i = 0; i < 4; i++) {
      const disk = MeshBuilder.CreateCylinder(
        'sled plates',
        { height: 0.07, diameter: 0.45, tessellation: 24 },
        scene,
      );
      disk.position.set(0, 0.23 + i * 0.075, 0);
      disk.material = plates;
      disk.parent = root;
    }
  } else if (kind === 'kettlebells') {
    base(1.6, 0.6);
    for (const y of [0.42, 0.82]) {
      b([1.65, 0.06, 0.53], [0, y, 0]);
      for (let i = 0; i < 6; i++) {
        const x = -0.68 + i * 0.27;
        const bell = MeshBuilder.CreateSphere(
          'cast iron bell',
          { diameter: 0.2, segments: 8 },
          scene,
        );
        bell.position.set(x, y + 0.13, 0);
        bell.material = plates;
        bell.parent = root;
        const handle = MeshBuilder.CreateTorus(
          'kettlebell handle',
          { diameter: 0.17, thickness: 0.028, tessellation: 12 },
          scene,
        );
        handle.rotation.x = Math.PI / 2;
        handle.position.set(x, y + 0.25, 0);
        handle.material = silver;
        handle.parent = root;
      }
    }
    for (const x of [-0.75, 0.75]) bar([x, 0.1, 0], [x, 0.82, 0], 0.07);
  } else return false;
  // Visible adjustment pins, foot caps and hardware catch the gym lights at eye level.
  for (const x of [-0.28, 0.28]) {
    const bolt = MeshBuilder.CreateCylinder(
      'frame bolt',
      { diameter: 0.035, height: 0.012, tessellation: 6 },
      scene,
    );
    bolt.rotation.x = Math.PI / 2;
    bolt.position.copyFrom(new Vector3(x, 0.16, -0.51));
    bolt.material = silver;
    bolt.parent = root;
  }
  return true;
}
