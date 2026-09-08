import { DEFAULT_DESIGN } from './gym-design.ts';
import type { EquipmentKind, GymLayout } from './gym-data.ts';

type Placement = readonly [EquipmentKind, number, number, number?];
type ExampleZone = {
  name: string;
  color: string;
  area: readonly [number, number, number, number]; // x, z, width, depth
  pieces: readonly Placement[];
};

/** A deliberately arranged showroom, with the entrance at negative Z. */
export const EXAMPLE_ZONES: readonly ExampleZone[] = [
  {
    name: 'Free weights',
    color: '#ba91f3',
    area: [-15, 8, 13, 9.5],
    pieces: [
      ['dumbbells', -10, 16.5],
      ['bench', -12, 13.5],
      ['bench', -9, 13.5],
      ['bench', -6, 13.5],
      ['preacher', -3.5, 13.5],
      ['rack', -12, 9.5],
      ['smith', -7.5, 9.5],
    ],
  },
  {
    name: 'Cables & pull-ups',
    color: '#71ccd8',
    area: [2, 8, 13, 9.5],
    pieces: [
      ['crossover', 7, 15.5],
      ['cable', 12, 10.5],
      ['pulldown', 4, 10.5],
      ['assisted', 8, 10.5],
    ],
  },
  {
    name: 'Legs & glutes',
    color: '#d4a571',
    area: [-15, -5.5, 13, 13],
    pieces: [
      ['legpress', -12, 5.5],
      ['hack', -8, 5.5],
      ['beltsquat', -4, 5.5],
      ['hipthrust', -12, 1],
      ['legextension', -8, 1],
      ['legcurl', -4, 1],
      ['abductor', -12, -3.5],
      ['calf', -8, -3.5],
    ],
  },
  {
    name: 'Upper body',
    color: '#84ba91',
    area: [2, -5.5, 13, 13],
    pieces: [
      ['chest', 4, 5.5],
      ['shoulder', 8, 5.5],
      ['pecdeck', 12, 5.5],
      ['row', 4, 1],
      ['tbar', 8, 1],
      ['pullover', 12, 1],
      ['lateral', 12, -3.5],
    ],
  },
  {
    name: 'Boxing & functional',
    color: '#db87a8',
    area: [-15, -17.5, 13, 11.5],
    pieces: [
      ['boxingring', -10, -12],
      ['punchbag', -4, -10],
      ['plyobox', -4, -13],
      ['storage', -12, -16.5],
      ['kettlebells', -8, -16.5],
    ],
  },
  {
    name: 'Cardio & conditioning',
    color: '#8baee4',
    area: [2, -17.5, 13, 11.5],
    pieces: [
      ['treadmill', 7, -15],
      ['elliptical', 10, -15],
      ['stairs', 13, -15],
      ['bike', 13, -11],
      ['rower', 9, -9],
      ['skierg', 13, -7.5],
      ['sled', 4, -11],
    ],
  },
];

export const EXAMPLE_LAYOUT: GymLayout = {
  version: 1,
  name: 'Paradise showcase',
  room: { width: 32, depth: 36, height: 7 },
  lighting: 'violet',
  floor: 'rubber',
  frame: 'graphite',
  mural: true,
  design: {
    ...DEFAULT_DESIGN,
    wallColors: {
      back: '#22252c',
      left: '#272a32',
      right: '#272a32',
      front: '#22252c',
    },
    ceiling: 'industrial',
    fixtures: 'frames',
    lightColor: '#b078ed',
    brightness: 1.05,
    floorColor: '#363a42',
    floorGrid: false,
    frameColor: '#303640',
    upholsteryColor: '#15131e',
    mirrorWall: 'back',
    artWall: 'back',
    artHeight: 0.52,
    artWidth: 1,
    turfColor: '#482464',
    turfWidth: 2.4,
    turfLength: 0.28,
    turfX: 4 / 14.3,
    turfZ: -10.8 / 12.6,
    sign: true,
    signText: 'PARADISE SHOWCASE',
    signColor: '#e5d5ff',
    signWall: 'front',
  },
  items: EXAMPLE_ZONES.flatMap((zone, zoneIndex) =>
    zone.pieces.map(([kind, x, z, rotation = 0], pieceIndex) => ({
      id: `showcase-${zoneIndex}-${kind}-${pieceIndex}`,
      kind,
      x,
      z,
      rotation,
    })),
  ),
};
