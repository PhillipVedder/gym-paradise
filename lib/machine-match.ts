import { CATALOG, type EquipmentKind } from './gym-data.ts';
export const BRANDS = [
  'Hammer Strength',
  'Technogym',
  'Life Fitness',
  'Panatta',
  'Matrix',
  'Precor',
  'Atlantis',
  'Arsenal Strength',
  'PRIME',
  'gym80',
  'Nautilus',
  'Cybex',
  'Watson',
  'Rogue',
  'Eleiko',
  'Concept2',
  'StairMaster',
  'Hoist',
  'Body-Solid',
];
const aliases: Partial<Record<EquipmentKind, string[]>> = {
  chest: ['chest press', 'iso lateral chest'],
  legpress: ['leg press'],
  pulldown: ['pulldown', 'lat pull down'],
  row: ['seated row', 'low row'],
  legextension: ['leg extension'],
  legcurl: ['leg curl'],
  hipthrust: ['hip thrust', 'glute drive'],
  abductor: ['abductor', 'adductor'],
  hack: ['hack squat'],
  smith: ['smith'],
  pecdeck: ['pec deck', 'pec fly', 'peck back', 'rear delt'],
  shoulder: ['shoulder press'],
  cable: ['dual adjustable pulley', 'functional trainer'],
  crossover: ['cable crossover'],
  beltsquat: ['belt squat'],
};
export function matchLabel(text: string) {
  const clean = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const brand =
    BRANDS.find((b) =>
      clean.includes(b.toLowerCase().replace(/[^a-z0-9]+/g, ' ')),
    ) || '';
  const kinds = CATALOG.filter((e) =>
    [e.name.toLowerCase(), ...(aliases[e.kind] || [])].some((a) =>
      clean.includes(a),
    ),
  );
  return { brand, kinds: kinds.map((e) => e.kind) };
}
