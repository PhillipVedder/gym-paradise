import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState,
  validateState,
  comparableSets,
  personalBests,
  portableLayout,
} from '../lib/gym-records.ts';
import { matchLabel } from '../lib/machine-match.ts';
const collection = () => ({
  id: 'machine-1',
  name: 'Favourite press',
  brand: 'Hammer Strength',
  model: 'My exact label',
  kind: 'chest',
  photoId: 'photo-1',
  sourceUrl: 'https://example.com/product',
  notes: 'Seat 4',
  createdAt: '2026-09-06T10:00:00Z',
});
const set = (extra = {}) => ({
  id: 'set-1',
  machineKey: 'placed:chest-1',
  machineName: 'Chest press',
  exercise: 'Press',
  weight: 40,
  reps: 10,
  unit: 'kg',
  date: '2026-09-06',
  notes: 'Total load',
  ...extra,
});
test('exact wishlist identity survives a round-trip while geometry stays approximate', () => {
  const s = initialState();
  s.collection.push(collection());
  s.layout.items.find((i) => i.id === 'chest-1').collectionId = 'machine-1';
  const copy = validateState(JSON.parse(JSON.stringify(s)));
  assert.equal(copy.collection[0].model, 'My exact label');
  assert.equal(copy.layout.items.find((i) => i.id === 'chest-1').kind, 'chest');
});
test('collection rejects duplicate IDs, unsafe links and dangling layout references', () => {
  for (const mutate of [
    (s) => s.collection.push(collection(), collection()),
    (s) => {
      const c = collection();
      c.sourceUrl = 'javascript:alert(1)';
      s.collection.push(c);
    },
    (s) => {
      s.layout.items[0].collectionId = 'missing';
    },
    (s) => {
      const c = collection();
      c.photoId = '../private';
      s.collection.push(c);
    },
  ]) {
    const s = initialState();
    mutate(s);
    assert.throws(() => validateState(s));
  }
});
test('workout validation rejects nonsensical units, values, dates and duplicate IDs', () => {
  for (const bad of [
    { weight: -1 },
    { weight: NaN },
    { reps: 1.5 },
    { reps: 0 },
    { unit: 'stone' },
    { date: '2026-02-31' },
    { date: 'yesterday' },
  ]) {
    const s = initialState();
    s.sets = [set(bad)];
    assert.throws(() => validateState(s));
  }
  const s = initialState();
  s.sets = [set(), set()];
  assert.throws(() => validateState(s));
});
test('zero load and per-machine settings are valid and preserved', () => {
  const s = initialState();
  s.sets = [set({ weight: 0, notes: 'Seat 4; assistance 0' })];
  const v = validateState(s);
  assert.equal(v.sets[0].weight, 0);
  assert.equal(v.sets[0].notes, 'Seat 4; assistance 0');
});
test('progress separates equipment, exercise and units, sorting by session date', () => {
  const rows = [
    set(),
    set({ id: 'set-2', weight: 45, reps: 8, date: '2026-09-07' }),
    set({ id: 'set-3', weight: 100, unit: 'lb' }),
    set({ id: 'set-4', weight: 99, machineKey: 'placed:chest-2' }),
    set({ id: 'set-5', weight: 70, exercise: 'Row' }),
  ];
  const comparable = comparableSets(rows, 'placed:chest-1', ' press ', 'kg');
  assert.equal(comparable.length, 2);
  assert.equal(comparable[0].id, 'set-2');
  assert.deepEqual(personalBests(comparable), {
    heaviest: 45,
    mostReps: 10,
    volume: 760,
  });
});
test('portable layouts exclude private media and collection links without changing the original', () => {
  const s = initialState();
  s.layout.muralId = 'private-art';
  s.layout.items[0].collectionId = 'private-machine';
  const exported = JSON.parse(JSON.stringify(portableLayout(s.layout)));
  assert.equal('muralId' in exported, false);
  assert.equal('collectionId' in exported.items[0], false);
  assert.equal(s.layout.muralId, 'private-art');
});
test('OCR matches label terms without inventing a brand for unknown text', () => {
  assert.deepEqual(matchLabel('HAMMER-STRENGTH LEG PRESS'), {
    brand: 'Hammer Strength',
    kinds: ['legpress'],
  });
  assert.equal(matchLabel('ACME serial 123').brand, '');
  assert.deepEqual(matchLabel('ACME serial 123').kinds, []);
});
