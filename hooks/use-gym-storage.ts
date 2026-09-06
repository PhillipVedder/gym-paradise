'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initialState,
  validateState,
  type GymState,
  type CollectionItem,
  type WorkoutSet,
} from '@/lib/gym-records';
import { validateLayout, type GymLayout } from '@/lib/gym-data';
export function useGymStorage(onLoad: (state: GymState) => void) {
  const snapshot = useRef<GymState>(initialState()),
    revision = useRef(0),
    scope = useRef(''),
    generation = useRef(0),
    savedGeneration = useRef(0),
    draftStored = useRef(true),
    busy = useRef(false),
    loading = useRef(false),
    blocked = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLoadRef = useRef(onLoad);
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);
  const [data, setData] = useState<GymState>(initialState),
    [status, setStatus] = useState('Connecting to your gym…'),
    [loaded, setLoaded] = useState(false),
    [conflict, setConflict] = useState(false),
    [draft, setDraft] = useState<GymState | null>(null);
  const key = useCallback(() => `gym-paradise-draft-${scope.current}`, []);
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(
        key(),
        JSON.stringify({ state: snapshot.current, revision: revision.current }),
      );
      draftStored.current = true;
    } catch {
      draftStored.current = false;
    }
  }, [key]);
  const flush = useCallback(async () => {
    if (
      busy.current ||
      loading.current ||
      blocked.current ||
      !scope.current ||
      generation.current === savedGeneration.current
    )
      return;
    busy.current = true;
    setStatus('Saving to your account…');
    const sent = generation.current;
    try {
      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: snapshot.current,
          revision: revision.current,
        }),
      });
      const body = (await response.json()) as {
        scope: string;
        revision: number;
        state: unknown;
        error?: string;
      };
      if (response.status === 409) {
        blocked.current = true;
        setConflict(true);
        throw new Error('Changed on another device · review saves');
      }
      if (!response.ok)
        throw new Error(
          body.error || 'Cloud save unavailable · draft kept here',
        );
      revision.current = body.revision;
      savedGeneration.current = sent;
      setStatus('Saved to your account');
      if (sent === generation.current) {
        try {
          localStorage.removeItem(key());
        } catch {}
      } else {
        saveDraft();
        setStatus('Saving newer changes…');
      }
    } catch (e) {
      setStatus(
        !draftStored.current
          ? 'Save failed · export a private backup before closing'
          : e instanceof Error
            ? e.message
            : 'Cloud save unavailable · draft kept here',
      );
    } finally {
      busy.current = false;
    }
  }, [key, saveDraft]);
  const update = useCallback(
    (fn: (state: GymState) => GymState) => {
      if (loading.current || blocked.current)
        throw new Error('Finish reviewing the cloud save before editing.');
      const next = validateState(fn(snapshot.current));
      snapshot.current = next;
      generation.current++;
      setData(next);
      saveDraft();
      setStatus(
        blocked.current ? 'Resolve cloud conflict to save' : 'Unsaved changes…',
      );
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 700);
    },
    [flush, saveDraft],
  );
  const load = useCallback(async () => {
    if (busy.current || loading.current) return;
    loading.current = true;
    setLoaded(false);
    setStatus('Loading your cloud save…');
    try {
      const response = await fetch('/api/state', { cache: 'no-store' });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? 'Sign in to save and open your gym.'
            : 'Could not connect. Retry to open your gym.',
        );
      const body = (await response.json()) as {
        scope: string;
        revision: number;
        state: unknown;
        error?: string;
      };
      scope.current = body.scope;
      revision.current = body.revision;
      let next = body.state ? validateState(body.state) : initialState();
      let legacy = false;
      if (!body.state) {
        try {
          const raw = localStorage.getItem('gym-paradise-layout-v1');
          if (raw) {
            next = { ...next, layout: validateLayout(JSON.parse(raw)) };
            legacy = true;
          }
        } catch {}
      }
      let pending: GymState | null = null;
      try {
        const raw = localStorage.getItem(key());
        if (raw) {
          const d = JSON.parse(raw);
          pending = validateState(d.state);
        }
      } catch {}
      snapshot.current = next;
      setData(next);
      onLoadRef.current(next);
      generation.current = 0;
      savedGeneration.current = 0;
      blocked.current = false;
      setConflict(false);
      setDraft(pending);
      setLoaded(true);
      setStatus(
        pending
          ? 'An unsaved draft is available'
          : body.state
            ? 'Saved to your account'
            : legacy
              ? 'Previous gym restored · saving…'
              : 'Your gym is ready',
      );
      if (!body.state && !pending) {
        generation.current++;
        saveDraft();
        void Promise.resolve().then(flush);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Unable to load your gym.');
    } finally {
      loading.current = false;
    }
  }, [flush, key, saveDraft]);
  useEffect(() => {
    void Promise.resolve().then(load);
    const retry = () => void flush();
    const interval = setInterval(retry, 12000);
    window.addEventListener('online', retry);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', retry);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load, flush]);
  function recoverDraft() {
    if (!draft) return;
    update(() => draft);
    onLoadRef.current(draft);
    setDraft(null);
  }
  function dismissDraft() {
    setDraft(null);
    try {
      localStorage.removeItem(key());
    } catch {}
  }
  return {
    data,
    status,
    loaded: loaded && !draft && !conflict,
    conflict,
    draft,
    reload: load,
    recoverDraft,
    dismissDraft,
    flush,
    update,
    persistLayout: useCallback(
      (layout: GymLayout) => update((s) => ({ ...s, layout })),
      [update],
    ),
    addCollection: (item: CollectionItem) =>
      update((s) => ({ ...s, collection: [item, ...s.collection] })),
    addSet: (set: WorkoutSet) =>
      update((s) => ({ ...s, sets: [set, ...s.sets] })),
    deleteSet: (id: string) =>
      update((s) => ({ ...s, sets: s.sets.filter((w) => w.id !== id) })),
    getSnapshot: () => snapshot.current,
  };
}
