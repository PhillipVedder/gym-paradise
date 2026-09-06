'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ScanLine,
  Plus,
  ArrowUpRight,
  Trash2,
  Download,
  Dumbbell,
  LoaderCircle,
  BookOpen,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CATALOG,
  EQUIPMENT,
  type EquipmentKind,
  type PlacedItem,
} from '@/lib/gym-data';
import {
  comparableSets,
  personalBests,
  type CollectionItem,
  type WorkoutSet,
} from '@/lib/gym-records';
import { GYM_RESEARCH, BRAND_CATALOGUES } from '@/lib/gym-research';
import { BRANDS, matchLabel } from '@/lib/machine-match';
import { normaliseImage, uploadImage, downloadFile } from '@/lib/media-client';
type Props = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  collection: CollectionItem[];
  sets: WorkoutSet[];
  items: PlacedItem[];
  activeItem?: PlacedItem;
  onAddCollection: (item: CollectionItem) => void;
  onPlace: (item: CollectionItem) => void;
  onAddSet: (set: WorkoutSet) => void;
  onDeleteSet: (id: string) => void;
  initialTab?: 'collection' | 'progress' | 'research';
  notify: (message: string) => void;
};
export function GymFeatures(p: Props) {
  const [tab, setTab] = useState(p.initialTab || 'collection');

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="gym-dialog feature-dialog">
        <DialogHeader>
          <span className="eyebrow">YOUR PARADISE / PERSONAL SPACE</span>
          <DialogTitle>Collect the dream. Track the work.</DialogTitle>
          <DialogDescription>
            Your favourite real machines and the training that gets you there.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(String(v) as typeof tab)}
        >
          <TabsList className="feature-tabs">
            <TabsTrigger value="collection">
              <Camera size={16} />
              Collection
            </TabsTrigger>
            <TabsTrigger value="progress">
              <Dumbbell size={16} />
              Training
            </TabsTrigger>
            <TabsTrigger value="research">
              <BookOpen size={16} />
              Research
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === 'collection' ? (
          <Collection {...p} />
        ) : tab === 'progress' ? (
          <Training {...p} />
        ) : (
          <div className="research-content">
            <p className="dialog-note">
              A first benchmark of {GYM_RESEARCH.length} chains and
              destinations. These are published examples, not a complete
              inventory or a ranking by business success. Checked 6 September
              2026.
            </p>
            {GYM_RESEARCH.map((g) => (
              <article key={g.name}>
                <small>{g.scope}</small>
                <h3>{g.name}</h3>
                <p>{g.detail}</p>
                <a href={g.url} target="_blank" rel="noreferrer">
                  View gym source <ArrowUpRight size={14} />
                </a>
              </article>
            ))}
            <h3>Explore manufacturer catalogues</h3>
            {BRAND_CATALOGUES.map((b) => (
              <a
                className="source-link"
                href={b.url}
                key={b.name}
                target="_blank"
                rel="noreferrer"
              >
                {b.name}
                <ArrowUpRight size={14} />
              </a>
            ))}
            <p className="dialog-note">
              Studio lighting environment by{' '}
              <a
                href="https://github.com/BabylonJS/Assets/blob/master/environments/studio.env"
                target="_blank"
                rel="noreferrer"
              >
                BabylonJS Assets
              </a>
              ,{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
              . Used without file modifications. Gym equipment and mural are
              original concept assets.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function Collection(p: Props) {
  const [creating, setCreating] = useState(false),
    [photo, setPhoto] = useState<Blob | null>(null),
    [preview, setPreview] = useState(''),
    [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  const [name, setName] = useState(''),
    [brand, setBrand] = useState(''),
    [model, setModel] = useState(''),
    [kind, setKind] = useState<EquipmentKind>('chest'),
    [notes, setNotes] = useState(''),
    [source, setSource] = useState(''),
    [ocr, setOcr] = useState('');
  const [suggestions, setSuggestions] = useState<EquipmentKind[]>([]);
  const visionTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    job = useRef(0);
  const worker = useRef<Worker | null>(null),
    ocrWorker = useRef<{ terminate: () => Promise<unknown> } | null>(null),
    cancelled = useRef(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(
    () => () => {
      cancelled.current = true;
      job.current++;
      if (visionTimer.current) clearTimeout(visionTimer.current);
      worker.current?.terminate();
      void ocrWorker.current?.terminate();
    },
    [],
  );
  async function choose(file?: File) {
    if (!file) return;
    setError('');
    try {
      const image = await normaliseImage(file);
      setPhoto(image);
      setPreview(URL.createObjectURL(image));
      setOcr('');
      setSuggestions([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo could not open.');
    }
  }
  function cancelAnalysis() {
    cancelled.current = true;
    job.current++;
    if (visionTimer.current) clearTimeout(visionTimer.current);
    worker.current?.terminate();
    worker.current = null;
    void ocrWorker.current?.terminate();
    ocrWorker.current = null;
    setBusy('');
  }
  async function readLabel() {
    if (!photo || busy) return;
    cancelled.current = false;
    const currentJob = ++job.current;
    setBusy('Reading the label on this device…');
    setError('');
    try {
      const { createWorker } = await import('tesseract.js');
      const w = await createWorker('eng');
      if (cancelled.current || job.current !== currentJob) {
        await w.terminate();
        return;
      }
      ocrWorker.current = w;
      const result = await w.recognize(photo);
      if (cancelled.current || job.current !== currentJob) return;
      setOcr(result.data.text);
      const found = matchLabel(result.data.text);
      if (found.brand) setBrand(found.brand);
      setSuggestions(found.kinds);
      if (found.kinds[0]) setKind(found.kinds[0]);
      if (!found.brand && !found.kinds.length)
        setError(
          'No clear brand or machine name found. Try a closer label photo, or enter the details below.',
        );
      await w.terminate();
      ocrWorker.current = null;
    } catch {
      if (!cancelled.current && job.current === currentJob)
        setError(
          'The label reader could not load. Check your connection or enter the label manually.',
        );
    } finally {
      if (!cancelled.current && job.current === currentJob) setBusy('');
    }
  }
  function analysePhoto() {
    if (!photo || busy) return;
    cancelled.current = false;
    const currentJob = ++job.current;
    setError('');
    setBusy('Starting photo matching…');
    const w = new Worker(
      new URL('../workers/machine-vision.ts', import.meta.url),
      { type: 'module' },
    );
    worker.current = w;
    const labels = CATALOG.map((e) => `a photo of a gym ${e.name}`);
    const timeout = setTimeout(() => {
      w.terminate();
      worker.current = null;
      setBusy('');
      setError(
        'Matching took too long on this device. Read the label or choose the type below.',
      );
    }, 180000);
    visionTimer.current = timeout;
    w.onmessage = (
      e: MessageEvent<{
        status?: string;
        error?: string;
        result?: { label: string; score: number }[];
      }>,
    ) => {
      if (job.current !== currentJob) return;
      if (e.data.status) setBusy(e.data.status);
      if (e.data.error) {
        setError(e.data.error);
        finish();
      }
      if (e.data.result) {
        setSuggestions(
          e.data.result
            .slice(0, 3)
            .map((r) => CATALOG[labels.indexOf(r.label)]?.kind)
            .filter(Boolean),
        );
        finish();
      }
    };
    w.onerror = () => {
      if (job.current !== currentJob) return;
      setError(
        'Photo matching is unavailable here. Choose a type or read the label.',
      );
      finish();
    };
    function finish() {
      clearTimeout(timeout);
      w.terminate();
      worker.current = null;
      setBusy('');
    }
    w.postMessage({ photo, labels });
  }
  async function save() {
    const currentJob = ++job.current;
    setError('');
    setBusy('Saving your machine…');
    try {
      const photoId = photo ? await uploadImage(photo) : undefined;
      if (job.current !== currentJob) return;
      const entry: CollectionItem = {
        id: crypto.randomUUID(),
        name:
          name.trim() ||
          [brand, model].filter(Boolean).join(' ') ||
          EQUIPMENT[kind].name,
        brand: brand.trim(),
        model: model.trim(),
        kind,
        photoId,
        sourceUrl: source.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };
      p.onAddCollection(entry);
      setCreating(false);
      setPhoto(null);
      setPreview('');
      setName('');
      setBrand('');
      setModel('');
      setNotes('');
      setSource('');
      setOcr('');
      setSuggestions([]);
      p.notify(
        'Machine added to your wishlist. Its exact details stay with the approximate model.',
      );
    } catch (e) {
      if (job.current !== currentJob) return;
      setError(e instanceof Error ? e.message : 'Could not save this machine.');
    } finally {
      if (job.current === currentJob) setBusy('');
    }
  }
  return (
    <div className="collection-content">
      {!creating ? (
        <>
          <button className="primary-button" onClick={() => setCreating(true)}>
            <Camera size={18} />
            Collect a real machine
          </button>
          <p className="dialog-note">
            Take a photo or read a machine label. Keep the exact make and model
            on your wishlist, then place a similar 3D model.
          </p>
          {!p.collection.length && (
            <div className="feature-empty">
              <ScanLine size={32} />
              <h3>That machine you wish you owned.</h3>
              <p>
                Start with a favourite from your real gym. Your collection will
                grow with you.
              </p>
            </div>
          )}
          <div className="collection-grid">
            {p.collection.map((c) => (
              <article className="collection-card" key={c.id}>
                {c.photoId ? (
                  <Image
                    unoptimized
                    width={400}
                    height={240}
                    src={`/api/media/${c.photoId}`}
                    alt={c.name}
                  />
                ) : (
                  <div className="collection-placeholder">
                    <Dumbbell size={35} />
                  </div>
                )}
                <div>
                  <span className="eyebrow">EXACT MACHINE WISHLIST</span>
                  <h3>{c.name}</h3>
                  <p>
                    {[c.brand, c.model].filter(Boolean).join(' · ') ||
                      EQUIPMENT[c.kind].name}
                  </p>
                  <span className="model-label">
                    Similar 3D model · {EQUIPMENT[c.kind].name}
                  </span>
                  {c.notes && <p>{c.notes}</p>}
                  {c.sourceUrl && (
                    <a href={c.sourceUrl} target="_blank" rel="noreferrer">
                      Product source <ArrowUpRight size={13} />
                    </a>
                  )}
                  <button
                    className="primary-button"
                    onClick={() => {
                      p.onPlace(c);
                      p.onOpenChange(false);
                    }}
                  >
                    <Plus size={16} />
                    Place similar model
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <form
          className="machine-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="form-heading">
            <h3>Add to your dream collection</h3>
            <button
              type="button"
              className="icon-button"
              aria-label="Cancel new machine"
              onClick={() => {
                cancelAnalysis();
                setCreating(false);
              }}
            >
              <X size={18} />
            </button>
          </div>
          <label className="photo-drop">
            {preview ? (
              <Image
                unoptimized
                src={preview}
                width={600}
                height={350}
                alt="Machine photo preview"
              />
            ) : (
              <>
                <Camera size={30} />
                <strong>Add a machine or label photo</strong>
                <span>JPEG, PNG or an iPhone photo · up to 20 MB</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={!!busy}
              onChange={(e) => void choose(e.target.files?.[0])}
            />
          </label>
          <div className="analysis-actions">
            <button
              type="button"
              className="dialog-option"
              onClick={readLabel}
              disabled={!photo || !!busy}
            >
              <ScanLine size={18} />
              <span>
                <strong>Read label</strong>
                <small>Find written brand and machine names</small>
              </span>
            </button>
            <button
              type="button"
              className="dialog-option"
              onClick={analysePhoto}
              disabled={!photo || !!busy}
            >
              <Camera size={18} />
              <span>
                <strong>Suggest machine type</strong>
                <small>Free vision model · large first download</small>
              </span>
            </button>
          </div>
          <p className="dialog-note">
            Analysis runs on this device. Model files download on first use.
            Photos upload to your private collection when you save. Suggestions
            need your confirmation; they do not verify an exact model.
          </p>
          {busy && (
            <div className="inline-status">
              <LoaderCircle className="spin" size={16} />
              {busy}
              {!busy.startsWith('Saving') && (
                <button type="button" onClick={cancelAnalysis}>
                  Cancel
                </button>
              )}
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {ocr && (
            <details>
              <summary>Text read from the photo</summary>
              <pre className="ocr-text">{ocr}</pre>
            </details>
          )}
          {!!suggestions.length && (
            <div className="suggestions">
              <p>Possible matches — choose the one that looks right:</p>
              {suggestions.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                >
                  {EQUIPMENT[k].name}
                </button>
              ))}
            </div>
          )}
          <label className="field-label">
            Wishlist name
            <input
              className="text-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="My favourite chest press"
            />
          </label>
          <div className="form-columns">
            <label className="field-label">
              Brand
              <input
                className="text-field"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                maxLength={80}
                list="machine-brands"
                placeholder="e.g. Hammer Strength"
              />
              <datalist id="machine-brands">
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="field-label">
              Exact model / label
              <input
                className="text-field"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                maxLength={120}
                placeholder="Copy the model name or code"
              />
            </label>
          </div>
          <label className="field-label">
            Similar 3D model
            <select
              className="text-field"
              value={kind}
              onChange={(e) => setKind(e.target.value as EquipmentKind)}
            >
              {CATALOG.map((e) => (
                <option value={e.kind} key={e.kind}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Product page (optional)
            <input
              className="text-field"
              type="url"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={1000}
              placeholder="https://…"
            />
          </label>
          <label className="field-label">
            Notes
            <textarea
              className="text-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="Where you trained on it, settings, why you love it…"
            />
          </label>
          <button
            type="submit"
            className="primary-button"
            disabled={!!busy || p.collection.length >= 250}
          >
            Save to my collection
          </button>
        </form>
      )}
    </div>
  );
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function Training(p: Props) {
  const options = p.items
    .map((i) => {
      const c = p.collection.find((c) => c.id === i.collectionId);
      return {
        key: c ? `collection:${c.id}` : `placed:${i.id}`,
        name: c?.name || EQUIPMENT[i.kind].name,
      };
    })
    .filter((v, i, a) => a.findIndex((x) => x.key === v.key) === i);
  for (const s of p.sets)
    if (!options.some((o) => o.key === s.machineKey))
      options.push({
        key: s.machineKey,
        name: s.machineName + ' (archived placement)',
      });
  const active = p.activeItem;
  const initial = active
    ? active.collectionId
      ? `collection:${active.collectionId}`
      : `placed:${active.id}`
    : options[0]?.key || '';
  const [key, setKey] = useState(initial),
    [exercise, setExercise] = useState(''),
    [unit, setUnit] = useState<'kg' | 'lb'>('kg'),
    [weight, setWeight] = useState(''),
    [reps, setReps] = useState(''),
    [date, setDate] = useState(today),
    [notes, setNotes] = useState(''),
    [error, setError] = useState('');
  const selected = options.find((o) => o.key === key);
  const exerciseName = (exercise.trim() || selected?.name || '').slice(0, 80);
  const matching = comparableSets(p.sets, key, exerciseName, unit),
    best = personalBests(matching),
    last = matching[0];
  const historyDates = [...new Set(matching.map((s) => s.date))]
      .sort()
      .slice(-10),
    max = Math.max(1, ...matching.map((s) => s.weight));
  function add() {
    try {
      if (!selected) throw new Error('Add a machine to your gym first.');
      if (!weight.trim() || !reps.trim())
        throw new Error('Enter both weight and reps.');
      p.onAddSet({
        id: crypto.randomUUID(),
        machineKey: key,
        machineName: selected.name,
        exercise: exerciseName,
        weight: Number(weight),
        reps: Number(reps),
        unit,
        date,
        notes,
      });
      setNotes('');
      setError('');
      p.notify(
        'Set saved. Your progress belongs to this machine and exercise.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the set.');
    }
  }
  return (
    <div className="training-content">
      <p className="dialog-note">
        Tap a machine while exploring to open its log, or choose one here
        between sets at your real gym.
      </p>
      {!options.length ? (
        <div className="feature-empty">
          Place a machine to start your training log.
        </div>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <label className="field-label">
              Machine
              <select
                className="text-field"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setExercise('');
                  setWeight('');
                  setReps('');
                }}
              >
                {options.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Exercise
              <input
                className="text-field"
                list="exercise-history"
                value={exercise}
                maxLength={80}
                onChange={(e) => setExercise(e.target.value)}
                placeholder={selected?.name || 'Exercise name'}
              />
              <datalist id="exercise-history">
                {[
                  ...new Set(
                    p.sets
                      .filter((s) => s.machineKey === key)
                      .map((s) => s.exercise),
                  ),
                ].map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </datalist>
            </label>
            <div className="training-summary">
              <div>
                <small>Last logged</small>
                <strong>
                  {last
                    ? `${last.weight} ${unit} × ${last.reps}`
                    : 'Your first set'}
                </strong>
              </div>
              <div>
                <small>Heaviest logged</small>
                <strong>
                  {matching.length ? `${best.heaviest} ${unit}` : '—'}
                </strong>
              </div>
            </div>
            {last && (
              <button
                type="button"
                className="text-action"
                onClick={() => {
                  setWeight(String(last.weight));
                  setReps(String(last.reps));
                }}
              >
                Use last weight & reps
              </button>
            )}
            <div className="set-fields">
              <label className="field-label">
                Weight
                <input
                  className="text-field"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  max="2000"
                  step="0.25"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </label>
              <label className="field-label">
                Unit
                <select
                  className="text-field"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as 'kg' | 'lb')}
                >
                  <option>kg</option>
                  <option>lb</option>
                </select>
              </label>
              <label className="field-label">
                Reps
                <input
                  className="text-field"
                  inputMode="numeric"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  required
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
              </label>
            </div>
            <label className="field-label">
              Date
              <input
                className="text-field"
                type="date"
                value={date}
                required
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field-label">
              Settings / notes
              <input
                className="text-field"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Seat setting, per-side load, range of motion…"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary-button"
              type="submit"
              disabled={p.sets.length >= 5000}
            >
              <Plus size={17} />
              Log set
            </button>
          </form>
          <p className="dialog-note">
            Comparisons use this machine, exercise and unit only. Keep per-side
            versus total load consistent. Assisted machines record assistance,
            where less can mean progress.
          </p>
          {historyDates.length > 1 && (
            <figure className="progress-chart">
              <figcaption>Heaviest logged load each day · {unit}</figcaption>
              <div>
                {historyDates.map((d) => {
                  const value = Math.max(
                    ...matching
                      .filter((s) => s.date === d)
                      .map((s) => s.weight),
                  );
                  return (
                    <div key={d}>
                      <strong>{value}</strong>
                      <span
                        style={{ height: `${8 + (value / max) * 100}px` }}
                      />
                      <small>{d.slice(5)}</small>
                    </div>
                  );
                })}
              </div>
            </figure>
          )}
          <div className="form-heading">
            <h3>Set history · {matching.length}</h3>
            <button
              className="text-action"
              onClick={() =>
                downloadFile(
                  new Blob([JSON.stringify(p.sets, null, 2)], {
                    type: 'application/json',
                  }),
                  'gym-paradise-training.json',
                )
              }
            >
              <Download size={15} />
              Export all
            </button>
          </div>
          <div className="set-history">
            {matching.slice(0, 60).map((s) => (
              <div key={s.id}>
                <div>
                  <strong>
                    {s.weight} {s.unit} × {s.reps} reps
                  </strong>
                  <small>
                    {s.date}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </small>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Delete ${s.weight} ${s.unit} set from ${s.date}`}
                  onClick={() => p.onDeleteSet(s.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!matching.length && (
              <p className="dialog-note">Your sets will appear here.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
