import {
  DEFAULT_LAYOUT,
  EQUIPMENT,
  validateLayout,
  type EquipmentKind,
  type GymLayout,
} from './gym-data.ts';
export type CollectionItem = {
  id: string;
  name: string;
  brand: string;
  model: string;
  kind: EquipmentKind;
  photoId?: string;
  sourceUrl: string;
  notes: string;
  createdAt: string;
};
export type WorkoutSet = {
  id: string;
  machineKey: string;
  machineName: string;
  exercise: string;
  weight: number;
  reps: number;
  unit: 'kg' | 'lb';
  date: string;
  notes: string;
};
export type GymState = {
  layout: GymLayout;
  collection: CollectionItem[];
  sets: WorkoutSet[];
};
export const initialState = (): GymState => ({
  layout: structuredClone(DEFAULT_LAYOUT),
  collection: [],
  sets: [],
});
const obj = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new Error('Invalid record.');
  return v as Record<string, unknown>;
};
const str = (v: unknown, max: number, empty = false) => {
  if (typeof v !== 'string' || v.length > max || (!empty && !v.trim()))
    throw new Error('Check the text fields.');
  return v.trim();
};
export function validId(v: unknown) {
  const s = str(v, 100);
  if (!/^[a-zA-Z0-9-]+$/.test(s)) throw new Error('Invalid record ID.');
  return s;
}
export function validateState(value: unknown): GymState {
  const v = obj(value);
  const layout = validateLayout(v.layout);
  if (
    !Array.isArray(v.collection) ||
    v.collection.length > 250 ||
    !Array.isArray(v.sets) ||
    v.sets.length > 5000
  )
    throw new Error(
      'This save exceeds the collection or workout limit. Export a backup.',
    );
  const unique = new Set<string>();
  const collection = v.collection.map((raw) => {
    const c = obj(raw),
      id = validId(c.id);
    if (unique.has(id)) throw new Error('Duplicate collection item.');
    unique.add(id);
    if (typeof c.kind !== 'string' || !Object.hasOwn(EQUIPMENT, c.kind))
      throw new Error('Choose a supported machine type.');
    const sourceUrl = str(c.sourceUrl, 1000, true);
    if (sourceUrl) {
      const url = new URL(sourceUrl);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error('Use an http or https product link.');
    }
    const createdAt = str(c.createdAt, 40);
    if (!Number.isFinite(Date.parse(createdAt)))
      throw new Error('Invalid collection date.');
    return {
      id,
      name: str(c.name, 100),
      brand: str(c.brand, 80, true),
      model: str(c.model, 120, true),
      kind: c.kind as EquipmentKind,
      ...(c.photoId ? { photoId: validId(c.photoId) } : {}),
      sourceUrl,
      notes: str(c.notes, 1000, true),
      createdAt,
    };
  });
  for (const i of layout.items)
    if (i.collectionId && !unique.has(i.collectionId))
      throw new Error('A placed machine is missing its collection record.');
  unique.clear();
  const sets = v.sets.map((raw) => {
    const w = obj(raw),
      id = validId(w.id);
    if (unique.has(id)) throw new Error('Duplicate workout set.');
    unique.add(id);
    if (
      typeof w.weight !== 'number' ||
      !Number.isFinite(w.weight) ||
      w.weight < 0 ||
      w.weight > 2000 ||
      typeof w.reps !== 'number' ||
      !Number.isInteger(w.reps) ||
      w.reps < 1 ||
      w.reps > 1000 ||
      !['kg', 'lb'].includes(String(w.unit))
    )
      throw new Error('Enter a valid weight, unit, and rep count.');
    const date = str(w.date, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      throw new Error('Choose a valid workout date.');
    return {
      id,
      machineKey: str(w.machineKey, 150),
      machineName: str(w.machineName, 120),
      exercise: str(w.exercise, 80),
      weight: w.weight,
      reps: w.reps,
      unit: w.unit as 'kg' | 'lb',
      date,
      notes: str(w.notes, 500, true),
    };
  });
  const state = { layout, collection, sets };
  if (new TextEncoder().encode(JSON.stringify(state)).byteLength > 1_900_000)
    throw new Error(
      'Your save is full. Export a private backup and remove older records before adding more.',
    );
  return state;
}
export function comparableSets(
  sets: WorkoutSet[],
  machineKey: string,
  exercise: string,
  unit: 'kg' | 'lb',
) {
  return sets
    .filter(
      (s) =>
        s.machineKey === machineKey &&
        s.exercise.trim().toLowerCase() === exercise.trim().toLowerCase() &&
        s.unit === unit,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function personalBests(sets: WorkoutSet[]) {
  return {
    heaviest: sets.reduce((best, s) => Math.max(best, s.weight), 0),
    mostReps: sets.reduce((best, s) => Math.max(best, s.reps), 0),
    volume: sets.reduce((n, s) => n + s.weight * s.reps, 0),
  };
}
export function portableLayout(layout: GymLayout): GymLayout {
  return {
    ...layout,
    muralId: undefined,
    items: layout.items.map(({ collectionId: _, ...item }) => item),
  };
}
