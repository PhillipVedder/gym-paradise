export type WallSide = 'back' | 'left' | 'right' | 'front';
export type RoomSize = { width: number; depth: number; height: number };
export type GymDesign = {
  wallColors: Record<WallSide, string>;
  wallFinish: 'paint' | 'concrete' | 'brick';
  ceiling: 'industrial' | 'tiles' | 'open';
  fixtures: 'frames' | 'strips' | 'panels';
  lightColor: string;
  brightness: number;
  floorColor: string;
  floorGrid: boolean;
  mirrorWall: WallSide | 'none';
  artWall: WallSide;
  artWidth: number;
  artHeight: number;
  artPosition: number;
  turf: boolean;
  turfColor: string;
  turfWidth: number;
  turfLength: number;
  turfX: number;
  turfZ: number;
  frameColor: string;
  upholsteryColor: string;
  sign: boolean;
  signText: string;
  signColor: string;
  signWall: WallSide;
  windows: 'none' | 'left' | 'right' | 'front';
};
export const WALL_SIDES: WallSide[] = ['back', 'left', 'right', 'front'];
export const DEFAULT_ROOM: RoomSize = { width: 22, depth: 26, height: 6 };
export const DEFAULT_DESIGN: GymDesign = {
  wallColors: {
    back: '#303139',
    left: '#303139',
    right: '#303139',
    front: '#303139',
  },
  wallFinish: 'paint',
  ceiling: 'industrial',
  fixtures: 'frames',
  lightColor: '#b477ed',
  brightness: 1,
  floorColor: '#44464d',
  floorGrid: true,
  mirrorWall: 'back',
  artWall: 'back',
  artWidth: 1,
  artHeight: 0.52,
  artPosition: 0.97,
  turf: true,
  turfColor: '#422364',
  turfWidth: 2,
  turfLength: 0.96,
  turfX: 0.18,
  turfZ: -0.15,
  frameColor: '#3f454e',
  upholsteryColor: '#12161d',
  sign: false,
  signText: 'BUILD YOUR PARADISE',
  signColor: '#e8dcff',
  signWall: 'front',
  windows: 'none',
};
export function roomSize(layout: { room?: RoomSize }): RoomSize {
  return layout.room || DEFAULT_ROOM;
}
export function designFor(layout: {
  design?: GymDesign;
  lighting?: string;
  floor?: string;
  frame?: string;
}): GymDesign {
  if (layout.design) return layout.design;
  const color =
    layout.lighting === 'cyan'
      ? '#42d2dc'
      : layout.lighting === 'warm'
        ? '#ecc58a'
        : '#b477ed';
  return {
    ...DEFAULT_DESIGN,
    wallColors: { ...DEFAULT_DESIGN.wallColors },
    lightColor: color,
    floorColor: layout.floor === 'concrete' ? '#8f9298' : '#44464d',
    frameColor:
      layout.frame === 'red'
        ? '#913741'
        : layout.frame === 'silver'
          ? '#a0abb3'
          : '#3f454e',
  };
}
export function validColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid room customisation.');
  return value as Record<string, unknown>;
}
function number(
  value: unknown,
  min: number,
  max: number,
  field: string,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`${field} must be between ${min} and ${max}.`);
  return value;
}
export function validateRoom(value: unknown): RoomSize {
  if (value === undefined) return { ...DEFAULT_ROOM };
  const d = object(value);
  return {
    width: number(d.width, 6, 40, 'Room width'),
    depth: number(d.depth, 6, 50, 'Room length'),
    height: number(d.height, 3.5, 10, 'Ceiling height'),
  };
}
export function validateDesign(value: unknown): GymDesign {
  const d = object(value);
  const colors = [
    'lightColor',
    'floorColor',
    'turfColor',
    'frameColor',
    'upholsteryColor',
    'signColor',
  ] as const;
  const result = {
    ...DEFAULT_DESIGN,
    wallColors: { ...DEFAULT_DESIGN.wallColors },
  };
  for (const key of colors) {
    if (!validColor(d[key])) throw new Error('Choose a valid colour.');
    result[key] = d[key];
  }
  const walls = object(d.wallColors);
  for (const side of WALL_SIDES) {
    if (!validColor(walls[side])) throw new Error('Invalid wall colour.');
    result.wallColors[side] = walls[side];
  }
  const choices = {
    wallFinish: ['paint', 'concrete', 'brick'],
    ceiling: ['industrial', 'tiles', 'open'],
    fixtures: ['frames', 'strips', 'panels'],
    mirrorWall: [...WALL_SIDES, 'none'],
    artWall: WALL_SIDES,
    signWall: WALL_SIDES,
    windows: ['none', 'left', 'right', 'front'],
  };
  for (const key of Object.keys(choices) as (keyof typeof choices)[]) {
    if (
      typeof d[key] !== 'string' ||
      !(choices[key] as readonly string[]).includes(d[key] as string)
    )
      throw new Error('Invalid room finish.');
    Object.assign(result, { [key]: d[key] });
  }
  for (const key of ['floorGrid', 'turf', 'sign'] as const) {
    if (typeof d[key] !== 'boolean') throw new Error('Invalid room setting.');
    result[key] = d[key];
  }
  const ranges = {
    brightness: [0.3, 2],
    artWidth: [0.2, 1],
    artHeight: [0.15, 0.65],
    artPosition: [0, 1],
    turfWidth: [1, 5],
    turfLength: [0.2, 1],
    turfX: [-1, 1],
    turfZ: [-1, 1],
  } as const;
  for (const key of Object.keys(ranges) as (keyof typeof ranges)[])
    result[key] = number(d[key], ranges[key][0], ranges[key][1], key);
  if (typeof d.signText !== 'string' || d.signText.length > 60)
    throw new Error('Keep your wall sign under 60 characters.');
  result.signText = d.signText.trim();
  return result;
}
export function turfBounds(room: RoomSize, design: GymDesign) {
  const width = Math.min(design.turfWidth, room.width - 1);
  const depth = (room.depth - 1) * design.turfLength;
  return {
    width,
    depth,
    x: design.turfX * (room.width / 2 - width / 2 - 0.5),
    z: design.turfZ * (room.depth / 2 - depth / 2 - 0.5),
  };
}
export const DESIGN_PRESETS = [
  {
    id: 'after-hours',
    name: 'After hours',
    detail: 'Violet frames · industrial roof',
    color: '#b477ed',
    floor: 'rubber',
    mural: true,
    design: { ...DEFAULT_DESIGN },
  },
  {
    id: 'bright-club',
    name: 'Bright club',
    detail: 'Light panels · clean concrete',
    color: '#d2e5ed',
    floor: 'concrete',
    mural: false,
    design: {
      ...DEFAULT_DESIGN,
      ceiling: 'tiles',
      fixtures: 'panels',
      lightColor: '#e2edf7',
      brightness: 1.45,
      floorColor: '#919396',
      wallColors: {
        back: '#b9bbc0',
        left: '#b9bbc0',
        right: '#b9bbc0',
        front: '#b9bbc0',
      },
      turfColor: '#2b3037',
      frameColor: '#25292e',
    },
  },
  {
    id: 'orange-iron',
    name: 'Orange iron',
    detail: 'Orange steel · warehouse light',
    color: '#ef782e',
    floor: 'rubber',
    mural: false,
    design: {
      ...DEFAULT_DESIGN,
      fixtures: 'strips',
      lightColor: '#f5dcc0',
      brightness: 1.2,
      wallFinish: 'brick',
      frameColor: '#e36a24',
      floorColor: '#5d6062',
      turfColor: '#32363b',
    },
  },
  {
    id: 'electric',
    name: 'Electric blue',
    detail: 'Cyan ceiling · pink turf',
    color: '#4ae1ee',
    floor: 'rubber',
    mural: true,
    design: {
      ...DEFAULT_DESIGN,
      lightColor: '#42d2dc',
      turfColor: '#7b286f',
      floorColor: '#464c57',
    },
  },
] as const;
